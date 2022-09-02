import { TokenType } from "../../lexer/tokens/token.js";
import { Node } from "../node.js";
import { InfixNode, PostfixNode, PrefixNode } from "../nodes/operators.js";
import { groupOperatorsLeft } from "../operator.js";
import { eatAtom } from "./atom.js";
import { eat, eat2, nextIs, ParseState } from "./util.js";


export const maybeEatInfix = (s: ParseState, left: Node, leftOp: string): Node => {
    if(!nextIs(s, TokenType.INFIX)) return left;
    const operator = s.lexer.peek();
    if(groupOperatorsLeft(leftOp, operator.value)) return left;
    eat(s, TokenType.INFIX);

    let assignment = null;

    if(nextIs(s, TokenType.OPERATOR, '=')) {
        assignment = eat2(s, TokenType.OPERATOR, '=');
    } 

    const top = maybeEatInfix(
        s,
        new InfixNode(left, maybeEatInfix(s, eatAtom(s), operator.value), operator),
        leftOp
    );

    if(assignment == null) return top;
    else return new InfixNode(left, top, assignment);
}

export const eatPostfix = (s: ParseState, atom: Node): Node => new PostfixNode(atom, eat(s, TokenType.POSTFIX));
export const eatPrefix = (s: ParseState): Node => new PrefixNode(eat(s, TokenType.PREFIX), eatAtom(s));