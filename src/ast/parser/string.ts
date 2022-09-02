import { CharRange } from "../../lexer/charinfo.js";
import { CharStream } from "../../lexer/charstream.js";
import { Node } from "../node.js";
import { StringNode } from "../nodes/literals.js";
import { eatExpression } from "../parser.js";
import { ParseState } from "./util.js";

const eatEscapeSequence = (stream: CharStream) => {
    stream.next();
    switch(stream.peek()) {
        default : return stream.next();
    }
}

const eatCharacter = (stream: CharStream): string => {
    switch(stream.peek()) {
        case '' : throw new Error(`Unexpected end of file!`);
        case '"': throw new Error(`Unexpected end of string!`);
        case '\\': return eatEscapeSequence(stream);
        case '$' :
            stream.next();
            if(stream.peek() == '{') {
                stream.next();
                return '';
            } else return '$';
        default : return stream.next();
    }
}


export const eatString = (state: ParseState) => {
    const lexer = state.lexer;
    // starting " is implicitly skipped as it is in the buffer
    lexer.buffer = null;
    const stream = lexer.streams[lexer.streams.length - 1];
    const start = stream.info();

    const components: (string | Node)[] = [];
    let str = '';

    while(stream.peek() != '"') {
        const char = eatCharacter(stream);
        if(!char) {
            if(str) components.push(str);
            str = '';
            components.push(eatExpression(state));
            if(lexer.buffer == null) throw 'unexpected EOF';
            // @ts-ignore
            if(lexer.buffer.value != '}') throw 'expected closing';
            // closing } is implicitly skipped as it is in the buffer
            lexer.buffer = null;
        } else str += char;
    }
    if(str) components.push(str);

    stream.next(); // skip end "
    lexer.buffer = null; // redundant but just-in-case:tm:
    const end = stream.info();

    return new StringNode(components, new CharRange(start, end));
}