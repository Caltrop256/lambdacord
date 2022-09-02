import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Value } from "../values/value.js";
import { ReferenceTypeInfo } from "./reference.js";
import { TypeInfo, TypeType } from "./type.js";

export class DerivativeTypeInfo extends TypeInfo {
    sup: TypeInfo;

    constructor(name: string, sup: TypeInfo) {
        super(name, TypeType.DERIVATIVE);
        this.sup = sup;
    }

    weight() {
        return this.sup.weight() + 10000;
    }

    apply(value: Value): Value {
        if(this.is(value.type)) return value;
        return value.clone(this);
    }

    is(type: TypeInfo): boolean {
        return type instanceof DerivativeTypeInfo && this.sup.is(type.sup);
    }

    equals(type: TypeInfo) {
        return this.is(type) || this.sup.equals(type);
    }

    matches(type: TypeInfo) {
        return this.sup.matches(type);
    }

    toString(simple: boolean = false): string {
        if(simple) return this.name;
        else return `(${this.name} -> ${this.sup.toString(true)})`;
    }

    resolveTypes(m: ModuleContainer): void {
        if(this.sup instanceof ReferenceTypeInfo) this.sup = m.getTypeInfo(this.sup.name);
    }
}