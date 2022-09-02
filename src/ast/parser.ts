import { CharRange } from "../lexer/charinfo.js";
import { Lexer } from "../lexer/lexer.js";
import { Token, TokenType } from "../lexer/tokens/token.js";
import { Node } from "./node.js";
import { BlockNode } from "./nodes/controlflow.js";
import { eatAtom, postprocessAtom } from "./parser/atom.js";
import { maybeApplication } from "./parser/lambda.js";
import { eatToplevelExpression } from "./parser/module.js";
import { maybeEatInfix } from "./parser/operator.js";
import { eat, eat2, nextIs, ParseState } from "./parser/util.js";

export class TokenError extends Error {
    timestamp: number = Date.now();
    token: Token;

    static fromErrorToken(error: Token) {
        return new TokenError(error, error.value);
    }
    
    constructor(token: Token, message: string) {
        super(message);
        this.token = token;
    }
}

export const eatExpression = (s: ParseState) => {
    let node: Node;
    try { node = eatAtom(s); } catch(e) { node = s.acknowledgeError(e); s.lexer.next(); } 
    finally {
        // @ts-ignore
        try { node = maybeEatInfix(s, node, '{INFIX_PARSE_ABSOLUTE_MINIMUM}'); } catch(e) { node = s.acknowledgeError(e); s.lexer.next(); }
        finally {
            // @ts-ignore
            try { node = postprocessAtom(s, node) } catch(e) { node = s.acknowledgeError(e); s.lexer.next(); }
            finally {
                // @ts-ignore
                try { node = maybeApplication(s, node) } catch(e) { node = s.acknowledgeError(e); s.lexer.next(); }
                finally {
                    // @ts-ignore
                    return node;
                }
            }
        }
    }
}

export const parse = (lexer: Lexer) => {
    const state = new ParseState(lexer);

    const expressions: Node[] = [];

    while(!lexer.eof()) {
        try {
            const expr = eatToplevelExpression(state);
            if(expr) expressions.push(expr);
        } catch(err) {
            state.acknowledgeError(err);
            state.lexer.next();
        }
    }
    eat(state, TokenType.EOF);

    switch(expressions.length) {
        case 0 : break;
        case 1 : state.AST = expressions[0]; break;
        default : state.AST = new BlockNode(expressions); break;
    }

    return state;
}