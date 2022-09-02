import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Value } from "../values/value.js";

export enum TypeType {
    INVALID,
    PRIMITIVE,
    DERIVATIVE,
    STRUCT,
    ENUM,
    ARRAY,
    TUPLE,
    LAMBDA
}

export abstract class TypeInfo {
    name: string;
    type: TypeType;

    constructor(name: string, type: TypeType) {
        this.name = name;
        this.type = type;
    }

    // TODO:
    // Only display type names after first recursion
    // for anonymous types display in full but dont expand named types
    abstract toString(simple?: boolean): string;

    abstract resolveTypes(m: ModuleContainer): void;

    abstract weight(): number;
    abstract apply(value: Value): Value;

    // strict equality
    abstract is(type: TypeInfo): boolean;
    // abstract equality
    abstract equals(type: TypeInfo): boolean;
    // coerceable
    abstract matches(type: TypeInfo): boolean;
}