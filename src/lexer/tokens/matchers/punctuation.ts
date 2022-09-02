import { CharRange } from "../../charinfo.js";
import { CharStream } from "../../charstream.js";
import { Token, TokenType } from "../token.js";
import { Matcher } from "./matcher.js";

const symbols = '.,"?:;()[]{}';
export const punctuationMatcher = new Matcher(
    (char: string) => symbols.includes(char),
    (stream: CharStream) => {
        const info = stream.info();
        const char = stream.next();
        if(char == ':' && stream.peek() == ':') {
            stream.next();
            return new Token(TokenType.PUNCTUATION, new CharRange(info, stream.info()), '::');
        } else {
            return new Token(TokenType.PUNCTUATION, new CharRange(info, stream.info()), char);
        }
    }
)