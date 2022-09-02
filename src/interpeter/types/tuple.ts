import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Value } from "../values/value.js";
import { defaultPrimitives, PrimitiveTypeInfo } from "./primitive.js";
import { ReferenceTypeInfo } from "./reference.js";
import { TypeInfo, TypeType } from "./type.js";

export class TupleTypeInfo extends TypeInfo {
    types: TypeInfo[];

    constructor(name: string, types: TypeInfo[]) {
        super(name, TypeType.TUPLE);
        this.types = types;
    }

    toString(simple?: boolean): string {
        return `(${this.types.map(s => s.toString(true)).join(', ')})`;
    }
    resolveTypes(m: ModuleContainer): void {
        for(let i = 0; i < this.types.length; ++i) {
            if(this.types[i] instanceof ReferenceTypeInfo)
                this.types[i] = m.getTypeInfo(this.types[i].name);
        }
    }
    weight(): number {
        return this.types.reduce((acc, t) => acc + t.weight(), 0);
    }
    apply(value: Value): Value {
        if(this.is(value.type)) return value;
        return value.clone(this);
    }
    is(type: TypeInfo): boolean {
        return (type instanceof TupleTypeInfo) && 
            (type.types.length == this.types.length) &&
            (this.types.every((t, i) => t.is(type.types[i])));
    }
    equals(type: TypeInfo): boolean {
        if(type instanceof PrimitiveTypeInfo) {
            return type.primType == defaultPrimitives['any'].primType;
        } else  return (type instanceof TupleTypeInfo) && 
            (type.types.length == this.types.length) &&
            (this.types.every((t, i) => type.types[i].equals(t)));
    }
    matches(type: TypeInfo): boolean {
        if(type instanceof PrimitiveTypeInfo) {
            return type.primType == defaultPrimitives['any'].primType;
        } else  return (type instanceof TupleTypeInfo) && 
            (type.types.length == this.types.length) &&
            (this.types.every((t, i) => type.types[i].matches(t)));
    }
}