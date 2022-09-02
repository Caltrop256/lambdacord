export class CharInfo {
    name: string;
    pos: number;
    ln: number;
    col: number;

    static internal = new CharInfo(NaN, NaN, NaN, 'internal');

    constructor(pos: number, ln: number, col: number, name: string) {
        this.name = name;
        this.pos = pos;
        this.ln = ln;
        this.col = col;
    }
}

export class CharRange {
    name: string;
    spos: number;
    sln: number;
    scol: number;
    epos: number;
    eln: number;
    ecol: number;

    static internal = new CharRange(CharInfo.internal, CharInfo.internal);

    constructor(pos0: CharInfo, pos1: CharInfo) {
        this.name = pos0.name;
        this.spos = pos0.pos;
        this.sln = pos0.ln;
        this.scol = pos0.col;
        this.epos = pos1.pos;
        this.eln = pos1.ln;
        this.ecol = pos1.col;
    }

    toString() {
        if(this.sln != this.eln) 
            return `(${this.name}:{${this.sln}:${this.scol}}-{${this.eln}:${this.ecol}})`;
        else if(this.scol != this.ecol)
            return `(${this.name}:${this.sln}:${this.scol}-${this.ecol})`;
        else return `(${this.name}:${this.sln}:${this.scol})`;
    }

    startInfo(): CharInfo {
        return new CharInfo(this.spos, this.sln, this.scol, this.name);
    }

    endInfo(): CharInfo {
        return new CharInfo(this.epos, this.eln, this.ecol, this.name);
    }
}