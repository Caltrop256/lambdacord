import { CharRange } from "../../charinfo.js";
import { CharStream } from "../../charstream.js";
import { Token, TokenType } from "../token.js";
import { Matcher } from "./matcher.js";
import { operatorMatcher } from "./operator.js";

export const wordMatcher = new Matcher(
    (char: string) => ('a' <= char && char <= 'z') || ('A' <= char && char <= 'Z') || char == '_',
    (stream: CharStream) => {
        const start = stream.info();
        let word = '';
        while(!stream.eof() && !['infix', 'prefix', 'postfix'].includes(word)) {
            const char = stream.peek();
            if(
                ('a' <= char && char <= 'z') || ('A' <= char && char <= 'Z') ||
                ('0' <= char && char <= '9') || '?/-_'.includes(char)
            ) word += stream.next();
            else break;
        }
        const range = new CharRange(start, stream.info());
        if(['let', 'mut', 'if', 'then', 'else', 'match', 'enum', 'struct', 'typedef', 'import', 'export'].includes(word)) return new Token(TokenType.KEYWORD, range, word);
        else if(['fn'].includes(word)) return new Token(TokenType.KEYWORD | TokenType.LAMBDA | TokenType.TYPE, range, word);
        else if(['true', 'false'].includes(word)) return new Token(TokenType.KEYWORD | TokenType.BOOLEAN, range, word);
        else if(['infix', 'prefix', 'postfix'].includes(word) && operatorMatcher.canidateCheck(stream.peek())) {
            const operator: Token = operatorMatcher.getToken(stream);
            const range = new CharRange(start, operator.range.endInfo());
            if(operator.is(TokenType.ERROR)) return new Token(TokenType.IDENTIFIER | TokenType.OPERATOR | TokenType.ERROR, range, operator.value);
            return new Token(TokenType.IDENTIFIER, range, word + operator.value);
        }
        return new Token(TokenType.IDENTIFIER, range, word);
    }
)