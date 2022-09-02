import { CharRange } from "../../lexer/charinfo.js";
import { TokenType } from "../../lexer/tokens/token.js";
import { Node } from "../node.js";
import { MatchNode } from "../nodes/controlflow.js";
import { eatExpression, TokenError } from "../parser.js";
import { eatAtom, postprocessAtom } from "./atom.js";
import { maybeEatInfix } from "./operator.js";
import { eat2, nextIs, ParseState } from "./util.js";


export const eatMatch = (s: ParseState) => {
    const start = eat2(s, TokenType.KEYWORD, 'match').range.startInfo();

    const scrutinees: Node[] = [];
    if(nextIs(s, TokenType.PUNCTUATION, '(')) {
        eat2(s, TokenType.PUNCTUATION, '(');
        while(!s.lexer.eof()) {
            scrutinees.push(eatExpression(s));
            if(nextIs(s, TokenType.PUNCTUATION, ')')) break;
            eat2(s, TokenType.PUNCTUATION, ',');
        }
        eat2(s, TokenType.PUNCTUATION, ')');
    } else scrutinees.push(postprocessAtom(s, maybeEatInfix(s, eatAtom(s), '{INFIX_PARSE_ABSOLUTE_MINIMUM}')));

    const arms: [Node[][], Node][] = [];

    eat2(s, TokenType.PUNCTUATION, '{');
    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, '}')) break;

        const scrutConds = [];

        const eatCondition = (): Node[] => {
            const conditions = [];
            while(!s.lexer.eof()) {
                conditions.push(eatExpression(s));
                if(!nextIs(s, TokenType.PUNCTUATION, ':')) break;
                eat2(s, TokenType.PUNCTUATION, ':');
            }
            return conditions;
        }

        let lastToken;

        if(nextIs(s, TokenType.PUNCTUATION, '(')) {
            eat2(s, TokenType.PUNCTUATION, '(');
            while(!s.lexer.eof()) {
                scrutConds.push(eatCondition());
                if(nextIs(s, TokenType.PUNCTUATION, ')')) break;
                eat2(s, TokenType.PUNCTUATION, ',');
            }
            lastToken = eat2(s, TokenType.PUNCTUATION, ')');
        } else {
            lastToken = s.lexer.peek();
            scrutConds.push(eatCondition());
        }

        if(scrutConds.length != scrutinees.length) 
            throw new TokenError(lastToken, `Arm targets ${scrutConds.length}-tulple but scrutinee is ${scrutinees.length}-tulple!`);

        eat2(s, TokenType.PUNCTUATION, '?');
        arms.push([scrutConds, eatExpression(s)]);

        if(!nextIs(s, TokenType.PUNCTUATION, '}')) eat2(s, TokenType.PUNCTUATION, ',');
    }
    const end = eat2(s, TokenType.PUNCTUATION, '}').range.endInfo();
    return new MatchNode(scrutinees, arms, new CharRange(start, end));
}