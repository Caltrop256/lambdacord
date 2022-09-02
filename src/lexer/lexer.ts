import { TokenError } from "../ast/parser.js";
import { CharRange } from "./charinfo.js";
import { CharStream } from "./charstream.js";
import { lambdaMatcher } from "./tokens/matchers/lambda.js";
import { mathMatcher } from "./tokens/matchers/math.js";
import { numberMatcher } from "./tokens/matchers/number.js";
import { operatorMatcher } from "./tokens/matchers/operator.js";
import { punctuationMatcher } from "./tokens/matchers/punctuation.js";
import { wordMatcher } from "./tokens/matchers/word.js";
import { Token, TokenType } from "./tokens/token.js";

const matchers = [
    lambdaMatcher,
    wordMatcher,
    punctuationMatcher,
    numberMatcher,
    operatorMatcher,
    mathMatcher
]

export class Lexer {
    streams: CharStream[];
    buffer: Token | null;

    macroRules: Map<string, string> = new Map();

    constructor(stream: CharStream) {
        this.streams = [stream];
        this.buffer = null;
    }

    eof() {
        return this.peek().type == TokenType.EOF;
    }

    peek() {
        if(this.buffer == null) {
            this.buffer = this.processNext();
        }
        return this.buffer;
    }

    next() {
        const t = this.peek();
        this.buffer = this.processNext();
        return t;
    }

    info() {
        const stream = this.streams[this.streams.length - 1];
        return stream.info();
    }

    postProcess(token: Token): Token {
        const stream = this.streams[this.streams.length - 1];
        if(this.macroRules.has(token.value)) {
            // @ts-ignore
            this.streams.push(new CharStream(this.macroRules.get(token.value), `${stream.location}#macro-rule(${token.value})`));
            return this.postProcess(this.processNext());
        }
        return token;
    }

    processNext(): Token {
        let stream = this.streams[this.streams.length - 1];
        stream.skipWhitespace();
        if(stream.eof()) {
            if(this.streams.length == 1) return new Token(TokenType.EOF, stream.info(), '');
            else {
                this.streams.pop();
                return this.processNext();
            }
        }

        const char = stream.peek();
        switch(char) {
            case ';' :
                stream.next();
                if(stream.peek() == '>') {
                    while(!stream.eof()) {
                        if(stream.next() == '<' && stream.next() == ';') {
                            return this.postProcess(this.processNext());
                        }
                    }
                    throw new Error(`No closing <; found!`);
                } else {
                    stream.skipLine();
                    return this.postProcess(this.processNext());
                }
            case '$' :
                stream.next();
                let command = '';
                while(!stream.eof() && !stream.isWhitespace(stream.peek())) command += stream.next();
                stream.next();
                switch(command) {
                    default : throw new Error('Unknown preprocessing directive: ' + command + '!');
                    case 'def' :
                        let macroName = '';
                        while(!stream.eof() && !stream.isWhitespace(stream.peek())) macroName += stream.next();
                        let defStr = '';
                        while(!stream.eof() && stream.peek() != '\n') defStr += stream.next();
                        this.macroRules.set(macroName, defStr);
                        break;
                }
                return this.postProcess(this.processNext());
            default :
                for(let i = 0; i < matchers.length; ++i) {
                    if(matchers[i].canidateCheck(char)) {
                        return this.postProcess(matchers[i].getToken(stream));
                    }
                }
        }
        
        const info = stream.info();
        stream.next();
        return this.postProcess(new Token(TokenType.ERROR, new CharRange(info, stream.info()), `Invalid character: '${char}' (0x${char.charCodeAt(0).toString(16).padStart(4, '0')})`));
    }
}