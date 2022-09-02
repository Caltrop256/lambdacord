import { Colors } from "../colors.js";
import { Continuation, ContinuationFrame, Thunk } from "../interpeter/continuation.js";
import { ErrorType, RuntimeError } from "../interpeter/error.js";
import { Scope } from "../interpeter/scope.js";
import { defaultPrimitives } from "../interpeter/types/primitive.js";
import { TypeInfo } from "../interpeter/types/type.js";
import { CharRange } from "../lexer/charinfo.js";
import { TokenError } from "./parser.js";

export const indent = (depth: number) => ' '.repeat(4 * depth);

export abstract class Node {
    range: CharRange;

    canReturn: TypeInfo[] = [defaultPrimitives['any']];
    readPurity: number = -1;
    writePurity: number = -1;

    constructor(range: CharRange) {
        this.range = range;
    }

    abstract eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk>;
    abstract toString(depth: number): string;
}

export class ErrorNode extends Node {
    error: TokenError;
    ind: number = -1;

    constructor(error: TokenError) {
        super(error.token.range);
        this.error = error;
    }

    toString(depth: number) {
        return `${Colors.Red}{{ERROR[${this.ind}]}}${Colors.Reset}`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        throw new RuntimeError(ErrorType.AbstractSyntaxTree, `Executed Error Node[${this.ind}] in AST with message: ${Colors.Red}${this.error.message}${Colors.Reset}`);
    }
}
