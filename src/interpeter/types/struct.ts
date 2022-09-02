import { StructTypeNodeField } from "../../ast/nodes/module.js";
import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Variable } from "../scope.js";
import { StructField } from "../values/StructValue.js";
import { Value } from "../values/value.js";
import { PrimitiveTypeInfo, PrimitiveValueType } from "./primitive.js";
import { ReferenceTypeInfo } from "./reference.js";
import { TypeInfo, TypeType } from "./type.js";

export class StructTypeInfo extends TypeInfo {
    fields: Map<string, StructTypeNodeField>;

    static fromStructValue(fields: Map<string, StructField>) {
        const _fields = new Map(Array.from(fields).map(([key, value]) => [
            key,
            new StructTypeNodeField(key, value.mutable, value.mutable ? value.type : value.value.type)
        ]));
        return new StructTypeInfo('', _fields);
    }

    constructor(name: string, fields: Map<string, StructTypeNodeField>) {
        super(name, TypeType.STRUCT);
        this.fields = fields;
    }

    weight() {
        let n = 0;
        for(const [name, field] of this.fields) {
            n += field.type.weight();
        }
        return n;
    }

    apply(value: Value): Value {
        if(this.is(value.type)) return value;
        return value.clone(this);
    }

    is(type: TypeInfo): boolean {
        if(!(type instanceof StructTypeInfo)) return false;
        return type == this;
    }

    equals(type: TypeInfo): boolean {
        if(type instanceof PrimitiveTypeInfo && (type.primType == PrimitiveValueType.STRUCT || type.primType == PrimitiveValueType.ANY)) return true;
        return this.is(type);
    }

    matches(type: TypeInfo): boolean {
        if(this.equals(type)) return true;

        if(type instanceof StructTypeInfo) {
            for(const [name, field] of type.fields) {
                if(!this.fields.has(name)) return false;
                const sInfo = this.fields.get(name);
                if(!sInfo) return false;
                if(field.mutable && !sInfo.mutable) return false;
                const sType = sInfo.type;
                const fType = field.type;
                if(!sType.matches(fType)) return false;
            }
            return true;
        }

        return false;
    }

    toString(simple: boolean = false): string {
        if(simple && this.name.length) return `struct ${this.name}`;
        return `struct ${this.name.length ? this.name + ' ' : ''}{${Array.from(this.fields).map(f => f[1].toString(true)).join(', ')}}`
    }

    resolveTypes(m: ModuleContainer): void {
        for(const [, f] of this.fields) {
            if(f.type instanceof ReferenceTypeInfo) f.type = m.getTypeInfo(f.type.name);
        }
    }
}