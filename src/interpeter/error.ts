import { Node } from "../ast/node.js";
import { Colors } from "../colors.js";
import { CharRange } from "../lexer/charinfo.js";

export enum ErrorType {
    Unknown,
    Internal,
    Type,
    AbstractSyntaxTree,
    UnexpectedType,
    Field,
    Selector,
    OutOfBounds,
    Assignment,
    Immutability,
    Variable,
    Coercion,
    Cast,
    Dispatch,
    Arithmetic,
    Range,
    Enum
}

export class RuntimeError extends Error {
    timestamp: number = Date.now();
    category: ErrorType;

    constructor(type: ErrorType, message: string) {
        super(message);
        this.category = type;
    }
}

const formatEnum = (v: ErrorType) => ErrorType[v].replace(/[a-z](A-Z)/g, ' $1');

export class TransmittedError extends Error {
    range: CharRange;

    constructor(range: CharRange, error: RuntimeError, extra: string = '') {
        super(`${Colors.Red}${range} ${formatEnum(error.category)} Error:${Colors.Reset} ${error.message}${extra}`);
        this.range = range;
    }
}