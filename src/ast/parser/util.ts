import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { CharRange } from "../../lexer/charinfo.js";
import { formatCharacter } from "../../lexer/charstream.js";
import { Lexer } from "../../lexer/lexer.js";
import { Token, TokenType } from "../../lexer/tokens/token.js";
import { ErrorNode, Node } from "../node.js";
import { TupleNode } from "../nodes/literals.js";
import { ImportNode } from "../nodes/module.js";
import { TokenError } from "../parser.js";
import { eatTypeLiteral } from "./type.js";

export class ParseState {
    lexer: Lexer;
    AST: Node = new TupleNode([], CharRange.internal);

    errors: ErrorNode[] = [];
    imports: ImportNode[] = [];

    types: Map<string, TypeInfo> = new Map();
    anonymousTypes: TypeInfo[] = [];

    requiresTypeResolve: Node[] = [];

    constructor(lexer: Lexer) {
        this.lexer = lexer;
    }

    acknowledgeError(error: any): Node {
        const errorNode = (error instanceof TokenError)
        ? new ErrorNode(error)
        : error instanceof Error
            ? new ErrorNode(new TokenError(this.lexer.next(), `INTERNAL ERROR: ${error.stack}`))
            : new ErrorNode(new TokenError(this.lexer.next(), `INTERNAL ERROR: ${error}`));

        this.errors.push(errorNode);
        errorNode.ind = this.errors.length;
        return errorNode;
    }
}

const listStringify = (list: string[], joiner: string) => {
    let str = '';
    for(let i = 0; i < list.length; ++i) {
        str += list[i];
        if(i < list.length - 1) {
            str += ', ';
            if(i == list.length - 2) str += joiner + ' ';
        } 
    }
    return str;
}

export const eat = (state: ParseState, type: TokenType, failureMessage?: string) => {
    const token = state.lexer.peek();
    if(token.is(TokenType.ERROR)) throw TokenError.fromErrorToken(state.lexer.next());
    if(!token.is(type)) {
        const desired = Token.resolveBitField(type).map(s => s.toLowerCase());
        const received = Token.resolveBitField(token.type).map(s => s.toLowerCase());
        if(typeof failureMessage != 'string') {
            failureMessage = '';
            if(desired.length == 1) failureMessage += `I expected a ${desired[0]}`;
            else failureMessage += `I expected one of ${listStringify(desired, 'or')}`;
            failureMessage += ' but received ';
            if(received.length == 1) failureMessage += `${received[0]}!`;
            else failureMessage += `${listStringify(received, 'and')}`;
        }
        throw new TokenError(token, failureMessage);
    }
    return state.lexer.next();
}

export const eat2 = (state: ParseState, type: TokenType, value: string, failureMessage?: string) => {
    const token = state.lexer.peek();
    if(token.is(TokenType.ERROR)) throw TokenError.fromErrorToken(state.lexer.next());
    if(token.value != value || !token.is(type)) {
        if(typeof failureMessage != 'string') {
            const desired = Token.resolveBitField(type).map(s => s.toLowerCase());
            const received = Token.resolveBitField(token.type).map(s => s.toLowerCase());
            failureMessage = `I expected ${listStringify(desired, 'or')} ${formatCharacter(value.toString())} but received ${listStringify(received, 'and')} ${formatCharacter(token.value.toString())}!`;
        }
        throw new TokenError(token, failureMessage);   
    }
    return state.lexer.next();
}

export const nextIs = (state: ParseState, type: TokenType, value?: any) => {
    const token = state.lexer.peek();
    if(!token.is(type) || (typeof value != 'undefined' && token.value != value)) return false;
    return true;
}

export const extractTypeInfo = (state: ParseState) => {
    const mutable = nextIs(state, TokenType.KEYWORD, 'mut');
    if(mutable) eat2(state, TokenType.KEYWORD, 'mut');
    const name = eat(state, TokenType.IDENTIFIER).value;
    let type: TypeInfo = defaultPrimitives['any'];
    if(nextIs(state, TokenType.PUNCTUATION, ':')) {
        eat2(state, TokenType.PUNCTUATION, ':');
        type = eatTypeLiteral(state);
    }
    return {name, mutable, type};
}
