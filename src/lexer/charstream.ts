import { CharInfo } from "./charinfo.js";
import * as fs from 'fs';
import * as path from 'path';

export const formatCharacter = (char: string) => !char ? '' : `'${char}' (0x${char.charCodeAt(0).toString(16).padStart(4, '0')})`;

export class CharStream {
    _data: string;
    _prevWasNewline: boolean;
    pos: number;
    ln: number;
    col: number;
    location: string;

    static fromFilePath(location: string): CharStream {
        const pathInfo = path.parse(location);
        const pathStr = pathInfo.dir.substring(1).replaceAll(path.delimiter, '.') + pathInfo.name;
        return new CharStream(fs.readFileSync(location, {encoding: 'utf-8'}), pathStr);
    }

    constructor(str: string, location: string) {
        this._data = str;
        this._prevWasNewline = false;
        this.pos = 0;
        this.ln = 1;
        this.col = 1;
        this.location = location;
    }

    info() {
        return new CharInfo(this.pos, this.ln, this.col, this.location);
    }

    peek() {
        return this._data.charAt(this.pos);
    }

    eof() {
        return this.peek().length == 0;
    }

    next() {
        const char = this._data.charAt(this.pos++);
        if(char == '\n') {
            this.ln += 1;
            this.col = 1;
        } else this.col += 1;
        return char;
    }

    peekCode() {
        return this.peek().charCodeAt(0);
    }

    nextCode() {
        return this.next().charCodeAt(0);
    }

    skipLine() {
        while(!this.eof() && this.next() != '\n');
    }

    isWhitespace(char: string) {
        return char.trim().length == 0;
    }

    skipWhitespace() {
        while(!this.eof() && this.isWhitespace(this.peek())) this.next();
    }
}