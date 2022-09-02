import { CharRange } from "../../charinfo.js";
import { CharStream } from "../../charstream.js";
import { Token, TokenType } from "../token.js";
import { Matcher } from "./matcher.js";

const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';

export const mathMatcher = new Matcher(
    (char: string) => superscript.includes(char) || "⁻⁺".includes(char),
    (stream: CharStream): Token => {
        const start = stream.info();
        const sign = stream.peek() == '⁻' ? -1n : 1n;
        if(stream.peek() == '⁻' || stream.peek() == '⁺') stream.next();

        let num = '';
        while(!stream.eof()) {
            const n = superscript.indexOf(stream.peek());
            if(n == -1) break;
            stream.next();
            num += n;
        }
        const range = new CharRange(start, stream.info());

        if(!num) return new Token(TokenType.ERROR | TokenType.SUPERSCRIPT, range, `Superscript sign must be followed by a superscript integer!`);

        return new Token(TokenType.SUPERSCRIPT, range, sign * BigInt(num));
    }
)