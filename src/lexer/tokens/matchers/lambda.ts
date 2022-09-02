import { CharRange } from "../../charinfo.js";
import { CharStream } from "../../charstream.js"
import { Token, TokenType } from "../token.js";
import { Matcher } from "./matcher.js"

export const lambdaMatcher = new Matcher(
    (char: string) => ['\\', 'λ', 'Λ'].includes(char),
    (stream: CharStream) => {
        const start = stream.info();
        const char = stream.next();
        const range = new CharRange(start, stream.info());
        return new Token(TokenType.LAMBDA | TokenType.KEYWORD | TokenType.TYPE, range, char);
    }
)