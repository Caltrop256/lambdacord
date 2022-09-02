import { CharRange } from "../../charinfo.js";
import { CharStream } from "../../charstream.js";
import { Token, TokenType } from "../token.js";
import { Matcher } from "./matcher.js";

const validOperatorsTable: any = {
    '=': TokenType.INFIX,

    '||': TokenType.INFIX,
    '&&': TokenType.INFIX,

    '==': TokenType.INFIX,
    '!=': TokenType.INFIX,
    '=~': TokenType.INFIX,

    '<': TokenType.INFIX,
    '<=': TokenType.INFIX,
    '>': TokenType.INFIX,
    '>=': TokenType.INFIX,

    '>>': TokenType.INFIX,
    '<<': TokenType.INFIX,
    '|': TokenType.INFIX,
    '&': TokenType.INFIX,
    '^': TokenType.PREFIX | TokenType.INFIX,

    '+': TokenType.PREFIX | TokenType.INFIX,
    '-': TokenType.PREFIX | TokenType.INFIX,
    '*': TokenType.INFIX,
    '/': TokenType.INFIX | TokenType.REGEX,
    '//': TokenType.INFIX,
    '%': TokenType.INFIX,

    '**': TokenType.INFIX,
    '√': TokenType.PREFIX | TokenType.INFIX,
    '∛': TokenType.PREFIX,
    '∜': TokenType.PREFIX,

    '->': TokenType.INFIX,

    '..': TokenType.INFIX,

    '#': TokenType.PREFIX,
    '!': TokenType.PREFIX | TokenType.POSTFIX
}

const validOperators = Object.getOwnPropertyNames(validOperatorsTable);

const valid = (ind: number, constraint: string) => validOperators
    .filter(s => s.indexOf(constraint) == 0 && s.length > ind)
    .map(s => s.charAt(ind));


export const operatorMatcher = new Matcher(
    (char: string) => valid(0, '').includes(char),
    (stream: CharStream) => {
        const info = stream.info();

        let op = stream.next();

        let i = op.length;
        while(valid(i, op).includes(stream.peek())) {
            op += stream.next();
            i += 1;
        }

        const type: TokenType|undefined = validOperatorsTable[op];

        if(typeof type == 'undefined') return new Token(
            TokenType.OPERATOR | TokenType.ERROR,
            new CharRange(info, stream.info()),
            `'${op}' is not a valid operator!`
        );

        return new Token(type | TokenType.OPERATOR, new CharRange(info, stream.info()), op);
    }
)