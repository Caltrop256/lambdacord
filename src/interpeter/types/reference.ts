import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { ErrorType, RuntimeError } from "../error.js";
import { Value } from "../values/value.js";
import { TypeInfo, TypeType } from "./type.js";

export class ReferenceTypeInfo extends TypeInfo {
    resolveTypes(m: ModuleContainer): void {
        throw new Error("Method not implemented.");
    }
    weight(): number {
        throw new RuntimeError(ErrorType.Internal, `Unresolved reference type for ${this.name}!`);
    }
    apply(value: Value): Value {
        throw new RuntimeError(ErrorType.Internal, `Unresolved reference type for ${this.name}!`);
    }
    is(type: TypeInfo): boolean {
        throw new RuntimeError(ErrorType.Internal, `Unresolved reference type for ${this.name}!`);
    }
    equals(type: TypeInfo): boolean {
        throw new RuntimeError(ErrorType.Internal, `Unresolved reference type for ${this.name}!`);
    }
    matches(type: TypeInfo): boolean {
        throw new RuntimeError(ErrorType.Internal, `Unresolved reference type for ${this.name}!`);
    }
    constructor(name: string) {
        super(name, TypeType.INVALID);
    }

    toString(simple: boolean = false): string {
        return `UNRESOLVED_REFERENCE(${this.name})`;
    }
}