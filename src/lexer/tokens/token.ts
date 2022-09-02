import {CharInfo, CharRange} from '../charinfo.js'

export enum TokenType {
    EOF         = 1 << 0,
    ERROR       = 1 << 1,
    KEYWORD     = 1 << 2,
    IDENTIFIER  = 1 << 3,
    PUNCTUATION = 1 << 4,
    NUMBER      = 1 << 5,
    INTEGER     = 1 << 6,
    RATIO       = 1 << 7,
    OPERATOR    = 1 << 8,
    PREFIX      = 1 << 9,
    INFIX       = 1 << 10,
    POSTFIX     = 1 << 11,
    LAMBDA      = 1 << 12,
    TYPE        = 1 << 13,
    REGEX       = 1 << 14,
    BOOLEAN     = 1 << 15,
    SUPERSCRIPT = 1 << 16
}

export class Token {
    type: TokenType;
    range: CharRange;
    value: any;

    static resolveBitField(type: number) {
        const values: string[] = [];
        for(const k in TokenType) {
            if(+TokenType[k] & type) values[values.length] = k;
        }
        return values;
    }

    constructor(type: TokenType, range: CharRange | CharInfo, value: any) {
        this.type = type;
        this.range = range instanceof CharRange ? range : new CharRange(range, range);
        this.value = value;
    }

    is(type: number) {
        return (this.type & type) != 0;
    }

    resolveBitfield() {
        return Token.resolveBitField(this.type);
    }

    toString() {
        return `{${this.resolveBitfield().join(', ')} - ${this.value}}`
    }
}