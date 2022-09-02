import { RationalValue } from "../../../interpeter/values/RationalValue.js";
import { CharInfo, CharRange } from "../../charinfo.js";
import { CharStream } from "../../charstream.js";
import { Token, TokenType } from "../token.js";
import { Matcher } from "./matcher.js";

const isDec = (char: string) => '0' <= char && char <= '9';
const isBin = (char: string) => char == '0' || char == '1';
const isOct = (char: string) => '0' <= char && char <= '7';
const isHex = (char: string) => isDec(char) || ('a' <= char && char <= 'f') || ('A' <= char && char <= 'F');

const getDecimal = (stream: CharStream, num: string, info: CharInfo) => {
    loop:
    while(!stream.eof()) switch(stream.peek()) {
        case '-' :
        case '_' : 
            stream.next();
            continue;
        case '.' :
        case 'r' : return getRatio(stream, num, info);
        default :
            if(isDec(stream.peek())) num += stream.next();
            else break loop;
    };
    return new Token(TokenType.NUMBER | TokenType.INTEGER, new CharRange(info, stream.info()), BigInt(num));
}

const getBin = (stream: CharStream, info: CharInfo) => {
    if(!isBin(stream.peek())) return new Token(
        TokenType.NUMBER | TokenType.INTEGER | TokenType.ERROR,
        new CharRange(info, stream.info()),
        'missing binary digits after \'0b\' literal!'
    );
    let num = '0b' + stream.next();
    loop:
    while(!stream.eof()) switch(stream.peek()) {
        case '-' :
        case '_' :
            stream.next();
            continue;
        default :
            if(isBin(stream.peek())) num += stream.next();
            else break loop;
    }
    return new Token(TokenType.NUMBER | TokenType.INTEGER, new CharRange(info, stream.info()), BigInt(num));
}

const getOct = (stream: CharStream, info: CharInfo) => {
    if(!isOct(stream.peek())) return new Token(
        TokenType.NUMBER | TokenType.INTEGER | TokenType.ERROR,
        new CharRange(info, stream.info()),
        'missing octet digits after \'0o\' literal!'
    );
    let num = '0o' + stream.next();
    loop:
    while(!stream.eof()) switch(stream.peek()) {
        case '-' :
        case '_' :
            stream.next();
            continue;
        default :
            if(isOct(stream.peek())) num += stream.next();
            else break loop;
    }
    return new Token(TokenType.NUMBER | TokenType.INTEGER, new CharRange(info, stream.info()), BigInt(num));
}

const getHex = (stream: CharStream, info: CharInfo) => {
    if(!isHex(stream.peek())) return new Token(
        TokenType.NUMBER | TokenType.INTEGER | TokenType.ERROR,
        new CharRange(info, stream.info()),
        'missing hexadecimal digits after \'0x\' literal!'
    );
    let num = '0x' + stream.next();
    loop:
    while(!stream.eof()) switch(stream.peek()) {
        case '-' :
        case '_' :
            stream.next();
            continue;
        default :
            if(isHex(stream.peek())) num += stream.next();
            else break loop;
    }
    return new Token(TokenType.NUMBER | TokenType.INTEGER, new CharRange(info, stream.info()), BigInt(num));
}

const getRatio = (stream: CharStream, num: string, info: CharInfo) => {
    let mantissa = 0n;
    let characteristic = '0';
    let cyclical = '0';

    let encounteredDot = false;
    loop :
    while(!stream.eof()) switch(stream.peek()) {
        case '-' :
        case '_' :
            stream.next();
            continue;
        case '.' :
            if(!encounteredDot) {
                encounteredDot = true;
                stream.next();
                mantissa = BigInt(num);
                num = '';
                continue;
            } else break loop;
        case 'r' :
            stream.next();
            break loop;
        default :
            if(isDec(stream.peek())) num += stream.next();
            else break loop;
    }
    if(encounteredDot) {
        characteristic = num;
        let usesParen = false;
        if(stream.peek() == '\'' || stream.peek() == '(') {
            usesParen = stream.next() == '(';
            num = '';
            loop :
            while(!stream.eof()) switch(stream.peek()) {
                case '-' :
                case '_' :
                    stream.next();
                    continue;
                default :
                    if(isDec(stream.peek())) num += stream.next();
                    else break loop;
            }
            if(usesParen) {
                if(stream.peek() != ')') return new Token(
                    TokenType.NUMBER | TokenType.RATIO | TokenType.ERROR,
                    new CharRange(info, stream.info()),
                    `Unexpected end of cyclic!` 
                );
                else stream.next();
            }
            if(!num) return new Token(
                TokenType.NUMBER | TokenType.RATIO | TokenType.ERROR,
                new CharRange(info, stream.info()),
                `Cyclical part of ratio literal may not be empty!` 
            )
            cyclical = num;
        }
    } else mantissa = BigInt(num);
    return new Token(TokenType.NUMBER | TokenType.RATIO, new CharRange(info, stream.info()), [mantissa, characteristic, cyclical]);
}

export const numberMatcher = new Matcher(
    isDec,
    (stream: CharStream) => {
        const info = stream.info();
        const first = stream.next();
        if(first != '0') return getDecimal(stream, first, info);
        else switch(stream.peek().toLowerCase()) {
            default : return getDecimal(stream, first, info);
            case 'r' :
            case '.' :
                return getRatio(stream, first, info);
            case 'b' :
                stream.next();
                return getBin(stream, info);
            case 'o' :
                stream.next();
                return getOct(stream, info);
            case 'x' : 
                stream.next(); 
                return getHex(stream, info);
        }
    }
)