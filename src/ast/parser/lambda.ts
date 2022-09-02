import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { CharRange } from "../../lexer/charinfo.js";
import { TokenType } from "../../lexer/tokens/token.js";
import { Node } from "../node.js";
import { FunctionApplicationNode } from "../nodes/lambda.js";
import { LambdaNode } from "../nodes/literals.js";
import { InfixNode } from "../nodes/operators.js";
import { SelectorNode } from "../nodes/variable.js";
import { eatExpression, TokenError } from "../parser.js";
import { eatAtom, nextIsValidAtom } from "./atom.js";
import { maybeEatInfix } from "./operator.js";
import { eatTypeLiteral } from "./type.js";
import { eat, eat2, extractTypeInfo, nextIs, ParseState } from "./util.js";


export const eatLambda = (s: ParseState) => {
    const start = eat(s, TokenType.LAMBDA).range.startInfo();

    const parameters = [];
    let returnType: TypeInfo = defaultPrimitives['any'];
    let destructures: boolean;

    if(nextIs(s, TokenType.PUNCTUATION, '(')) {
        destructures = true;
        eat2(s, TokenType.PUNCTUATION, '(');
        while(!s.lexer.eof()) {
            if(nextIs(s, TokenType.PUNCTUATION, ')')) break;

            const info = extractTypeInfo(s);
            parameters.push(info);

            if(nextIs(s, TokenType.PUNCTUATION, ',')) eat2(s, TokenType.PUNCTUATION, ',');
            else break;
        }
        eat2(s, TokenType.PUNCTUATION, ')');
        if(nextIs(s, TokenType.PUNCTUATION, ':')) {
            eat2(s, TokenType.PUNCTUATION, ':');
            returnType = eatTypeLiteral(s);
        }
    } else {
        destructures = false;
        const identifier = eat(s, TokenType.IDENTIFIER);
        parameters.push({
            mutable: false,
            name: identifier.value,
            type: defaultPrimitives['any']
        })
        if(nextIs(s, TokenType.PUNCTUATION, '.')) eat2(s, TokenType.PUNCTUATION, '.');
    }

    const body = eatExpression(s);
    const node = new LambdaNode(parameters, returnType, destructures, body, new CharRange(start, body.range.endInfo()));
    s.requiresTypeResolve.push(node);
    return node;
}

export const maybeApplication = (s: ParseState, atom: Node): Node => {
    if(!nextIsValidAtom(s)) return atom;
    const ln = s.lexer.peek().range.sln;

    if(
        atom.range.eln >= ln ||
        (atom instanceof InfixNode && atom.right.range.eln >= ln) 
    ) {
        const start = atom.range.startInfo();
        const arg = eatAtom(s);
        const end = arg.range.endInfo();
        return maybeApplication(s, maybeEatInfix(s, new FunctionApplicationNode(atom, arg, new CharRange(start, end)), '{INFIX_PARSE_ABSOLUTE_MINIMUM}'));
    } else return atom;
}

export const eatSelector = (s: ParseState, atom: Node) => {
    const start = eat2(s, TokenType.PUNCTUATION, '[').range.startInfo();
    const args = [];
    if(!nextIs(s, TokenType.PUNCTUATION, ']')) {
        while(!s.lexer.eof()) {
            args.push(eatExpression(s));
            if(nextIs(s, TokenType.PUNCTUATION, ',')) eat2(s, TokenType.PUNCTUATION, ',');
            else break;
        }
    };
    const end = eat2(s, TokenType.PUNCTUATION, ']').range.endInfo();
    return new SelectorNode(atom, args, new CharRange(start, end));
}