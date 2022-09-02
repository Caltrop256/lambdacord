import { CharStream } from "../../lexer/charstream.js";
import { ParseState } from "./util.js";

const combine = (arr1: string[], arr2: string[]) => {
    const newArr = [];
    for(let i = 0; i < arr1.length; ++i) {
        for(let j = 0; j < arr2.length; ++j) {
            newArr.push(arr1[i] + arr2[j]);
        }
    }
    return newArr;
}

export abstract class RegexComponent {
    static getRandomVariationFromComponentList(components: RegexComponent[]) {
        return components.map(c => c.randomVariation()).join('');
    }
    static getVariationsListFromComponentList(components: RegexComponent[]) {
        let variations = [''];
    
        for(let i = 0; i < components.length; ++i) {
            variations = combine(variations, components[i].possibleVariations());
        }
    
        if(variations.length == 1 && variations[0].length == 0) return [];
        else return variations;
    }

    abstract randomVariation(): string;
    abstract possibleVariations(): string[];
    abstract toString(): string;
};

enum RegexAnchor {
    WORDBOUNDARY,
    START,
    END
}

class RegexAnchorComponent extends RegexComponent {
    type: RegexAnchor;

    constructor(type: RegexAnchor) {
        super();
        this.type = type;
    }

    randomVariation() { return '' };
    possibleVariations() {return [''] };

    toString() {
        return {[RegexAnchor.WORDBOUNDARY]: '\b', [RegexAnchor.START]: '^', [RegexAnchor.END]: '$'}[this.type];
    }
}

export class RegexLetterComponent extends RegexComponent {
    char: number;

    constructor(char: string | number) {
        super();
        if(typeof char == 'string') char = char.charCodeAt(0);
        this.char = char;
    }

    randomVariation() {
        return this.toString();
    }

    possibleVariations() {
        return [String.fromCharCode(this.char)];
    }

    toString() {
        return String.fromCharCode(this.char);
    }
}

export class RegexRangeComponent extends RegexComponent {
    start: number;
    end: number;

    constructor(start: string | number, end: string | number) {
        super();
        if(typeof start == 'string') start = start.charCodeAt(0);
        if(typeof end == 'string') end = end.charCodeAt(0);

        if(start <= end) {
            this.start = start;
            this.end = end;
        } else {
            this.start = end;
            this.end = start;
        }
    }

    randomVariation() {
        return String.fromCharCode(Math.floor(Math.random() * (this.end - this.start + 1) + this.start));
    }

    possibleVariations() {
        const variations = [];
        for(let i = this.start; i <= this.end; ++i) {
            variations.push(String.fromCharCode(i));
        }
        return variations;
    }

    toString() {
        return `${String.fromCharCode(this.start)}-${String.fromCharCode(this.end)}`;
    }
}

export class RegexAlternationComponent extends RegexComponent {
    left: RegexComponent[];
    right: RegexComponent[];

    constructor(left: RegexComponent[], right: RegexComponent[]) {
        super();
        this.left = left;
        this.right = right;
    }

    randomVariation() {
        return RegexComponent.getRandomVariationFromComponentList(Math.random() < 0.5 ? this.left : this.right);
    }

    possibleVariations() {
        return [...new Set([
            ...RegexComponent.getVariationsListFromComponentList(this.left),
            ...RegexComponent.getVariationsListFromComponentList(this.right)
        ])];
    }

    toString() {
        return `${this.left.map(c => c.toString()).join('')}|${this.right.map(c => c.toString()).join('')}`;
    }
}

export class RegexCollectionComponent extends RegexComponent {
    content: (RegexLetterComponent | RegexRangeComponent)[];

    constructor(content: (RegexLetterComponent | RegexRangeComponent)[]) {
        super();

        outer :
        for(let i = 0; i < content.length; ++i) {
            for(let j = 0; j < content.length; ++j) {
                if(i == j) continue;
                const left = content[i];
                const right = content[j];

                if(left instanceof RegexLetterComponent) {
                    if(right instanceof RegexLetterComponent) {
                        if(left.char == right.char) {
                            content.splice(j, 1);
                            i -= 1;
                            continue outer;
                        }
                    } else {
                        if(right.start <= left.char && left.char <= right.end) {
                            content.splice(i, 1);
                            i -= 1;
                            continue outer;
                        }
                    }
                } else {
                    if(right instanceof RegexLetterComponent) {
                        if(left.start <= right.char && right.char <= left.end) {
                            content.splice(j, 1);
                            i -= 1;
                            continue outer;
                        }
                    } else {
                        if(left.start <= right.end && left.end >= right.start) {
                            left.start = Math.min(left.start, right.start);
                            left.end = Math.max(left.end, right.end);
                            content.splice(j, 1);
                            i -= 1;
                            continue outer;
                        }
                    }
                }
            }
        }

        this.content = content.sort((a, b) => {
            if(a instanceof RegexLetterComponent)
                if(b instanceof RegexLetterComponent) return a.char - b.char;
                else return a.char - b.start;
            else
                if(b instanceof RegexLetterComponent) return a.end - b.char;
                else return a.end - b.start;
        });
    }

    invert() {
        if(!this.content.length) return new RegexCollectionComponent([new RegexRangeComponent(0, 0xffff)]);
        const components: (RegexLetterComponent|RegexRangeComponent)[] = [];

        const left = (n: RegexRangeComponent | RegexLetterComponent) => n instanceof RegexLetterComponent
            ? n.char
            : n.start;
        const right = (n: RegexRangeComponent | RegexLetterComponent) => n instanceof RegexLetterComponent
            ? n.char
            : n.end;

        if(left(this.content[0]) != 0) components.push(new RegexRangeComponent(0, left(this.content[0]) - 1));
        if(right(this.content[this.content.length - 1]) != 0xffff) components.push(new RegexRangeComponent(right(this.content[this.content.length - 1]) + 1, 0xffff));

        if(this.content.length != 1) {
            for(let i = 0; i < this.content.length - 1; ++i) {
                if(right(this.content[i]) != left(this.content[i + 1]) - 1) {
                    const rstart = right(this.content[i]) + 1;
                    const rend = left(this.content[i + 1]) - 1;
                    if(rstart == rend) components.push(new RegexLetterComponent(rstart));
                    else components.push(new RegexRangeComponent(rstart, rend));
                }
            }
        }

        return new RegexCollectionComponent(components);
    }

    randomVariation() {
        return this.content[Math.floor(Math.random() * this.content.length)].randomVariation();
    }

    possibleVariations(): string[] {
        return this.content.map(c => c.possibleVariations()).flat();
    }

    toString(): string {
        return `[${this.content.map(c => c.toString()).join('')}]`
    }
}

export class RegexGroupComponent extends RegexComponent {
    isCapturingGroup: boolean;
    content: RegexComponent[];

    constructor(content: RegexComponent[], isCapturingGroup: boolean) {
        super();
        this.content = content;
        this.isCapturingGroup = isCapturingGroup;
    }

    randomVariation() {
        return RegexComponent.getRandomVariationFromComponentList(this.content);
    }

    possibleVariations() {
        return RegexComponent.getVariationsListFromComponentList(this.content);
    }

    toString() {
        return `(${this.content.map(c => c.toString()).join('')})`
    }
}

export class RegexRepetitionComponent extends RegexComponent {
    left: RegexComponent;
    min: number;
    max: number;

    constructor(left: RegexComponent, min: number, max: number) {
        super();
        this.left = left;
        this.min = min;
        this.max = max;
    }

    randomVariation() {
        const min = this.min;
        const max = this.max == Number.POSITIVE_INFINITY ? this.min + 8 : this.max;

        let i = Math.floor(Math.random() * (max - min + 1) + min);
        let str = '';
        while(i --> 0) str += this.left.randomVariation();
        return str;
    }

    possibleVariations() {
        if(this.min == 0 && this.max == 0) return [''];
        const variations = this.left.possibleVariations();
        const totalVars = [];
        const max = this.max == Number.POSITIVE_INFINITY ? this.min + 1 : this.max;
        
        for(let i = this.min; i <= max; ++i) {
            let combinations = [...variations];
            let j = i;
            while(j --> 1) {
                combinations = combine(combinations, variations);
            }

            totalVars.push(...combinations);
        }
        return totalVars;
    }

    toString() {
        let op;
        if(this.min == 0 && this.max == 1) op = '?';
        else if(this.min == 0 && this.max == Infinity) op = '*';
        else if(this.min == 1 && this.max == Infinity) op = '+';
        else if(this.max == Infinity) op = `{${this.min},}`;
        else if(this.min == this.max) op = `{${this.min}}`;
        else op = `{${this.min},${this.max}}`;
        return `${this.left.toString()}${op}`;
    }
}

export class RegexContainer {
    states: RegexComponent[];
    firstMustBeOneOf: RegexComponent[] = [];

    constructor(states: RegexComponent[]) {
        this.states = states;

        const handleRepetition = (nodes: RegexComponent[]) => {
            if(nodes.length == 0) return;
            if(nodes[0] instanceof RegexRepetitionComponent) {
                if(nodes[0].min == 0) {
                    const arr = Array.from(nodes);
                    arr.shift();
                    handleRepetition(arr);
                }
                deriveFirst(nodes[0].left);
            } else return deriveFirst(nodes[0]);
        }

        const deriveFirst = (node: RegexComponent) => {
            if(node instanceof RegexLetterComponent || node instanceof RegexRangeComponent || node instanceof RegexCollectionComponent || node instanceof RegexAnchorComponent) {
                return this.firstMustBeOneOf.push(node);
            }

            if(node instanceof RegexGroupComponent) {
                handleRepetition(node.content);
                return;
            }

            if(node instanceof RegexAlternationComponent) {
                handleRepetition(node.left);
                handleRepetition(node.right);
                return;
            }

            throw new Error('INTERNAL ERROR: unable to handle first regex node: ' + node.toString());
        }

        handleRepetition(this.states);
    }

    getRandomMatch() {
        return RegexComponent.getRandomVariationFromComponentList(this.states);
    }

    getAllPossibleMatches() {
        return RegexComponent.getVariationsListFromComponentList(this.states);
    }

    toString() {
        return `/${this.states.map(c => c.toString()).join('')}/`;
    }
}

const escapeValues: any = {
    'n': new RegexLetterComponent('\n'),
    'r': new RegexLetterComponent('\r')
}

const dot = new RegexCollectionComponent([new RegexLetterComponent('\n')]).invert();

const shorthandCharacterClasses: any = {
    'w': new RegexCollectionComponent([
        new RegexRangeComponent('a', 'z'),
        new RegexRangeComponent('A', 'Z'),
        new RegexLetterComponent('_')
    ]),
    'd': new RegexCollectionComponent([
        new RegexRangeComponent('0', '9')
    ])
}

const eatNumber = (stream: CharStream) => {
    let num = '';
    while(!stream.eof() && '0' <= stream.peek() && stream.peek() <= '9') num += stream.next();
    return num;
}

const postprocessComponent = (stream: CharStream, component: RegexComponent) => {
    const c = stream.peek();
    switch(c) {
        default: return component;
        case '?' :
        case '*' :
        case '+' :
            stream.next();
            const repMin = {'?': 0, '*': 0, '+': 1}[c];
            const repMax = {'?': 1, '*': Infinity, '+': Infinity}[c];
            return new RegexRepetitionComponent(component, repMin, repMax);
        case '{' :
            stream.next();
            stream.skipWhitespace();
            const cRepMin = eatNumber(stream);
            if(!cRepMin.length) throw 'lol!';
            stream.skipWhitespace();
            if(stream.peek() == '}') {
                stream.next();
                return new RegexRepetitionComponent(component, +cRepMin, +cRepMin);
            }
            if(stream.peek() == ',') {
                stream.next();
                stream.skipWhitespace();
                const cRepMax = eatNumber(stream);
                if(cRepMax.length && +cRepMax < +cRepMin) throw 'w';
                const val = !cRepMax.length
                    ? new RegexRepetitionComponent(component, +cRepMin, Infinity)
                    : new RegexRepetitionComponent(component, +cRepMin, +cRepMax);
                stream.skipWhitespace();
                if(stream.peek() != '}') throw 'missing closing';
                stream.next();
                return val;
            } else throw 'invalid';
    }
}

const eatAtom = (stream: CharStream) => {
    const char = stream.next();
    switch(char) {
        case '\\' :
            const c = stream.peek();
            if(!c) throw 'unexpected end of file! @ escape';
            stream.next();
            if(escapeValues[c] instanceof RegexLetterComponent) return escapeValues[c];
            if(shorthandCharacterClasses[c] instanceof RegexCollectionComponent) return shorthandCharacterClasses[c];
            if(shorthandCharacterClasses[c.toLocaleLowerCase()] instanceof RegexCollectionComponent) return shorthandCharacterClasses[c.toLocaleLowerCase()].invert();
            return new RegexLetterComponent(c);
        case '.' : return dot;
        case '^' : return new RegexAnchorComponent(RegexAnchor.START);
        case '$' : return new RegexAnchorComponent(RegexAnchor.END);
        default :  return new RegexLetterComponent(char);
    }    
}

const eatCollection = (stream: CharStream) => {
    stream.next();
    let negate = false;
    if(stream.peek() == '^') {
        negate = true;
        stream.next();
    }

    const maybeRange = (left: RegexLetterComponent) => {
        if(stream.peek() == '-') {
            stream.next();
            const right = eatAtom(stream);
            if(!(right instanceof RegexLetterComponent)) throw 'letter cant be range!';
            if(left.char == right.char) return left;
            return new RegexRangeComponent(String.fromCharCode(left.char), String.fromCharCode(right.char));
        }
        return left;
    }

    const components = [];

    outer:
    while(true) switch(stream.peek()) {
        case '': throw 'unexepcted end of file!';
        case ']' : break outer;

        default :
            const val = eatAtom(stream);
            if(val instanceof RegexLetterComponent) {
                components.push(maybeRange(val));
            } else if(val instanceof RegexCollectionComponent) {
                components.push(...val.content);
            } else {
                components.push(val);
            }
            break;
    }
    stream.next();

    const val = new RegexCollectionComponent(components);
    if(negate) return val.invert();
    else return val; 
}

const eatGroup = (stream: CharStream) => {
    stream.next();
    let isCapturingGroup = true;
    if(stream.peek() == '?') {
        stream.next();
        if(stream.peek() == ':') {
            stream.next();
            isCapturingGroup = false;
        }  else throw 'invalid identifier lololol no ? allowed'
    }
    const content = eatComponents(stream, ')');
    stream.next();
    return new RegexGroupComponent(content, isCapturingGroup);
}

const eatComponents = (stream: CharStream, until: string): RegexComponent[] => {
    const components: RegexComponent[] = [];

    outer:
    while(!stream.eof()) {
        const c = stream.peek();
        switch(c) {
            case until : 
                break outer;
            case '|' :
                if(components.length == 0) throw 'wdhad';
                stream.next();
                const right = eatComponents(stream, until);
                if(right.length == 0) throw 'uh ohhh';
                const alternationNode = new RegexAlternationComponent(Array.from(components), right);
                components.length = 0;
                components.push(alternationNode);
                break outer;
            case '(' :
                components.push(postprocessComponent(stream, eatGroup(stream)));
                break;
            case '[' :
                components.push(postprocessComponent(stream, eatCollection(stream)));
                break;
            default :
                components.push(postprocessComponent(stream, eatAtom(stream)));
                break;
        }
    }

    if(stream.peek() != until) throw 'unexpected end of file!';

    return components;
}

export const eatRegex = (state: ParseState) => {
    const lexer = state.lexer;
    // starting / is implicitly skipped as it is in the buffer
    lexer.buffer = null;
    const stream = lexer.streams[lexer.streams.length - 1];
    const start = stream.info();

    const components = eatComponents(stream, '/');
    const expr = new RegexContainer(components);
    console.log(expr.toString());
    console.log(expr.getRandomMatch());
    console.log(expr.firstMustBeOneOf);

    throw 'lol'
}