import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { ReferenceTypeInfo } from "../../interpeter/types/reference.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { CharInfo, CharRange } from "../../lexer/charinfo.js";
import { formatCharacter } from "../../lexer/charstream.js";
import { Token, TokenType } from "../../lexer/tokens/token.js";
import { Node } from "../node.js";
import { BlockNode, BranchNode } from "../nodes/controlflow.js";
import { ArrayNode, BooleanNode, IntegerNode, RatioNode, StructNode, TupleNode } from "../nodes/literals.js";
import { NamespaceAccessNode } from "../nodes/namespace.js";
import { CastNode, SuperscriptExponentiationNode } from "../nodes/operators.js";
import { FieldAccessNode, TupleDestructuringNode, VariableAccessNode, VariableInitializationNode } from "../nodes/variable.js";
import { eatExpression, TokenError } from "../parser.js";
import { eatLambda, eatSelector } from "./lambda.js";
import { eatMatch } from "./match.js";
import { eatPostfix, eatPrefix } from "./operator.js";
import { eatRegex } from "./regex.js";
import { eatString } from "./string.js";
import { eatTypeLiteral } from "./type.js";
import { eat, eat2, extractTypeInfo, nextIs, ParseState } from "./util.js";

export const nextIsValidAtom = (state: ParseState) => 
    nextIs(state, TokenType.ERROR                 ) ||
    nextIs(state, TokenType.PUNCTUATION, '(') ||
    nextIs(state, TokenType.PUNCTUATION, '{') ||
    nextIs(state, TokenType.KEYWORD,   'if' ) ||
    nextIs(state, TokenType.KEYWORD, 'match') ||
    nextIs(state, TokenType.KEYWORD,   'let') ||
    nextIs(state, TokenType.PREFIX                ) ||
    nextIs(state, TokenType.LAMBDA                ) ||
    nextIs(state, TokenType.PUNCTUATION, '"') ||
    nextIs(state, TokenType.PUNCTUATION, '[') ||
    nextIs(state, TokenType.KEYWORD, 'struct')||
    nextIs(state, TokenType.REGEX                  )||
    nextIs(state, TokenType.INTEGER               ) ||
    nextIs(state, TokenType.BOOLEAN               ) ||
    nextIs(state, TokenType.RATIO                 ) ||
    nextIs(state, TokenType.IDENTIFIER            );

export const postprocessAtom = (state: ParseState, atom: Node): Node => {
    if(nextIs(state, TokenType.POSTFIX               ))  return postprocessAtom(state, eatPostfix(state, atom));
    if(nextIs(state, TokenType.PUNCTUATION, '['))  return postprocessAtom(state, eatSelector(state, atom));
    if(nextIs(state, TokenType.PUNCTUATION, ':'   ))  return postprocessAtom(state, eatCast(state, atom));
    if(nextIs(state, TokenType.PUNCTUATION, '.')) return postprocessAtom(state, eatFieldAccess(state, atom));
    if(atom instanceof VariableAccessNode && nextIs(state, TokenType.PUNCTUATION, '::')) return postprocessAtom(state, eatNamespaceAccess(state, atom));
    if(state.lexer.peek().type == TokenType.SUPERSCRIPT) return postprocessAtom(state, new SuperscriptExponentiationNode(atom, eat(state, TokenType.SUPERSCRIPT))); 
    return atom;
};

export const eatAtom = (state: ParseState):Node => {
    if(nextIs(state, TokenType.ERROR                 )) throw TokenError.fromErrorToken(state.lexer.next());
    if(nextIs(state, TokenType.PUNCTUATION, '(')) return postprocessAtom(state, eatTuple(state));
    if(nextIs(state, TokenType.PUNCTUATION, '{')) return postprocessAtom(state, eatBlock(state));
    if(nextIs(state, TokenType.KEYWORD,   'if' )) return postprocessAtom(state, eatBranch(state));
    if(nextIs(state, TokenType.KEYWORD, 'match')) return postprocessAtom(state, eatMatch(state));
    if(nextIs(state, TokenType.KEYWORD,   'let')) return postprocessAtom(state, eatVariableInitialization(state));
    if(nextIs(state, TokenType.PREFIX                 )) return postprocessAtom(state, eatPrefix(state));
    if(nextIs(state, TokenType.LAMBDA                 )) return postprocessAtom(state, eatLambda(state));
    if(nextIs(state, TokenType.PUNCTUATION, '"')) return postprocessAtom(state, eatString(state));
    if(nextIs(state, TokenType.PUNCTUATION, '[')) return postprocessAtom(state, eatArray(state));
    if(nextIs(state, TokenType.KEYWORD,'struct')) return postprocessAtom(state, eatStruct(state));
    if(nextIs(state, TokenType.REGEX                  )) return postprocessAtom(state, eatRegex(state));
    if(nextIs(state, TokenType.INTEGER                )) return postprocessAtom(state, new IntegerNode(eat(state, TokenType.INTEGER)));
    if(nextIs(state, TokenType.BOOLEAN                )) return postprocessAtom(state, new BooleanNode(eat(state, TokenType.BOOLEAN)));
    if(nextIs(state, TokenType.RATIO                  )) return postprocessAtom(state, new RatioNode(eat(state, TokenType.RATIO)));
    if(nextIs(state, TokenType.IDENTIFIER             )) return postprocessAtom(state, eatIdentifier(state));

    const token = state.lexer.peek();
    throw new TokenError(state.lexer.peek(), `I can't start an expression with ${token.resolveBitfield().map(s => s.toLowerCase()).join(', ')} ${formatCharacter(token.value)} :(`);
}

const eatFieldAccess = (s: ParseState, atom: Node) => {
    const range = eat2(s, TokenType.PUNCTUATION, '.').range;
    const field = eat(s, TokenType.IDENTIFIER).value;
    return new FieldAccessNode(atom, field, range);
}

const eatNamespaceAccess = (s: ParseState, atom: VariableAccessNode) => {
    const start = atom.range.startInfo();
    let end: CharInfo | null = null;

    const path: string[] = [];
    let right: string = atom.name;

    while(!s.lexer.eof()) {
        path.push(right);
        eat2(s, TokenType.PUNCTUATION, '::');
        const iden = eat(s, TokenType.IDENTIFIER);
        end = iden.range.endInfo();
        right = iden.value;
        if(!nextIs(s, TokenType.PUNCTUATION, '::')) break;
    };

    if(!end) throw new TokenError(s.lexer.peek(), `Unexpected end of namespace path!`);

    return new NamespaceAccessNode(path, right, new CharRange(start, end));
}

const eatCast = (s: ParseState, atom: Node) => {
    const range = eat2(s, TokenType.PUNCTUATION, ':').range;
    const type = eatTypeLiteral(s);
    const node = new CastNode(atom, type, range);
    s.requiresTypeResolve.push(node); 
    return node;
}

const eatTuple = (s: ParseState) => {
    const start = eat2(s, TokenType.PUNCTUATION, '(').range.startInfo();
    const expressions = [];
    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, ')')) break;
        expressions.push(eatExpression(s));
        if(!nextIs(s, TokenType.PUNCTUATION, ')')) eat2(s, TokenType.PUNCTUATION, ',');
    }
    const end = eat2(s, TokenType.PUNCTUATION, ')').range.endInfo();
    const range = new CharRange(start, end);
    switch(expressions.length) {
        case 0 : return new TupleNode([], range);
        case 1 : 
            expressions[0].range = range;
            return expressions[0];
        default : return new TupleNode(expressions, range);
    }
}

const eatBlock = (s: ParseState) => {
    const start = eat2(s, TokenType.PUNCTUATION, '{').range.startInfo();
    if(nextIs(s, TokenType.PUNCTUATION, '.') || nextIs(s, TokenType.KEYWORD, 'mut')) 
        return eatStructInner(s, start, defaultPrimitives['struct']);
    const expressions = [];
    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, '}')) break;
        expressions.push(eatExpression(s));
        if(nextIs(s, TokenType.PUNCTUATION, '}')) break;
    }
    const end = eat2(s, TokenType.PUNCTUATION, '}').range.endInfo();
    if(expressions.length == 0) return new TupleNode([], new CharRange(start, end));
    if(expressions.length == 1) return expressions[0];
    return new BlockNode(expressions);
}

const eatBranch = (s: ParseState) => {
    const start = eat2(s, TokenType.KEYWORD, 'if').range.startInfo();
    const condition = eatExpression(s);
    eat2(s, TokenType.KEYWORD, 'then');
    const trueArm = eatExpression(s);
    if(nextIs(s, TokenType.KEYWORD, 'else')) {
        eat2(s, TokenType.KEYWORD, 'else');
        const falseArm = eatExpression(s);
        return new BranchNode(condition, trueArm, falseArm, new CharRange(start, falseArm.range.endInfo()));
    } else {
        return new BranchNode(condition, trueArm, null, new CharRange(start, trueArm.range.endInfo()));
    }
}

const eatVariableInitialization = (s: ParseState) => {
    const start = eat2(s, TokenType.KEYWORD, 'let').range.startInfo();
    let type: TypeInfo = defaultPrimitives['any'];
    let mutable = false;

    if(nextIs(s, TokenType.KEYWORD, 'mut')) mutable = true;
    if(mutable) eat2(s, TokenType.KEYWORD, 'mut');

    const getRight = () => {
        eat2(s, TokenType.OPERATOR, '=');
        return eatExpression(s);
    }

    if(nextIs(s, TokenType.PUNCTUATION, '(')) {
        eat2(s, TokenType.PUNCTUATION, '(');
        let names = [];
        while(!s.lexer.eof()) {
            if(nextIs(s, TokenType.PUNCTUATION, ',')) {
                eat2(s, TokenType.PUNCTUATION, ',');
                names.push(null);
            } else {
                names.push(eat(s, TokenType.IDENTIFIER).value);
                if(nextIs(s, TokenType.PUNCTUATION, ')')) break;
                else eat2(s, TokenType.PUNCTUATION, ',');
            }
        }
        eat2(s, TokenType.PUNCTUATION, ')');
        const right = getRight();
        const range = new CharRange(start, right.range.endInfo());
        return new TupleDestructuringNode(names, mutable, right, range); 
    } else {
        const name = eat(s, TokenType.IDENTIFIER).value;
        if(nextIs(s, TokenType.PUNCTUATION, ':')) {
            eat2(s, TokenType.PUNCTUATION, ':');
            type = eatTypeLiteral(s);
        }
        const right = getRight();
        const range = new CharRange(start, right.range.endInfo());
        const node = new VariableInitializationNode(name, type, mutable, right, range);
        s.requiresTypeResolve.push(node);
        return node;
    }
}

const eatArray = (s: ParseState) => {
    const start = eat2(s, TokenType.PUNCTUATION, '[').range.startInfo();
    const expressions: Node[] = [];

    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, ']')) break;
        expressions.push(eatExpression(s));
        if(!nextIs(s, TokenType.PUNCTUATION, ']'))  eat2(s, TokenType.PUNCTUATION, ',');
    }

    const stop = eat2(s, TokenType.PUNCTUATION, ']').range.endInfo();
    return new ArrayNode(expressions, new CharRange(start, stop));
}

const eatIdentifier = (s: ParseState) => {
    const iden = eat(s, TokenType.IDENTIFIER);
    if(nextIs(s, TokenType.PUNCTUATION, '{')) return eatStruct(s, iden);
    return new VariableAccessNode(iden);
}

const eatStructInner = (s: ParseState, start: CharInfo, type: TypeInfo) => {
    const fields = new Map();
    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, '}')) break;

        const start = s.lexer.info();
        const mutable = nextIs(s, TokenType.KEYWORD, 'mut');
        if(mutable) eat2(s, TokenType.KEYWORD, 'mut');
        if(nextIs(s, TokenType.PUNCTUATION, '.')) eat2(s, TokenType.PUNCTUATION, '.');
        const name = eat(s, TokenType.IDENTIFIER).value;
        let type: TypeInfo = defaultPrimitives['any'];
        if(nextIs(s, TokenType.PUNCTUATION, ':')) {
            eat2(s, TokenType.PUNCTUATION, ':');
            type = eatTypeLiteral(s);
        }
        eat2(s, TokenType.OPERATOR, '=');
        const right = eatExpression(s);
        fields.set(name, new VariableInitializationNode(name, type, mutable, right, new CharRange(start, s.lexer.info())));

        if(!nextIs(s, TokenType.PUNCTUATION, '}')) eat2(s, TokenType.PUNCTUATION, ',');
    }
    const end = eat2(s, TokenType.PUNCTUATION, '}').range.endInfo();
    const node = new StructNode(type, fields, new CharRange(start, end));
    s.requiresTypeResolve.push(node);
    return node;
}

const eatStruct = (s: ParseState, iden?: Token) => {
    let type: TypeInfo = iden ? new ReferenceTypeInfo(iden.value) : defaultPrimitives['struct'];
    const start = (iden || eat2(s, TokenType.KEYWORD, 'struct')).range.startInfo();
    eat2(s, TokenType.PUNCTUATION, '{');
    return eatStructInner(s, start, type);
}