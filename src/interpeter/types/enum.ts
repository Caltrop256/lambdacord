import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Value } from "../values/value.js";
import { PrimitiveTypeInfo, PrimitiveValueType } from "./primitive.js";
import { ReferenceTypeInfo } from "./reference.js";
import { TypeInfo, TypeType } from "./type.js";

export class EnumTypeInfoEntry {
    parent: EnumTypeInfo;
    name: string;
    discriminant: number;
    constructedType: TypeInfo | null;

    constructor(parent: EnumTypeInfo, name: string, discriminant: number, constructedType: TypeInfo | null) {
        this.parent = parent;
        this.name = name;
        this.discriminant = discriminant;
        this.constructedType = constructedType;
    }

    toString(simple: boolean = false) {
        return `${this.name}` + (this.constructedType instanceof TypeInfo ? `(${this.constructedType.toString(true)})` : '') + ` = ${this.discriminant}`;
    }

    resolveTypes(m: ModuleContainer): void {
        if(this.constructedType instanceof ReferenceTypeInfo) this.constructedType = m.getTypeInfo(this.constructedType.name);
    }
}

export class EnumTypeInfo extends TypeInfo {
    values: Map<string, EnumTypeInfoEntry>;

    constructor(name: string, values: [string, TypeInfo | null][]) {
        super(name, TypeType.ENUM);
        this.values = new Map(values.map(([s, type], i) => [
            s, 
            new EnumTypeInfoEntry(this, s, i, type)
        ]));
    }

    weight(): number {
        return 200;
    }

    apply(value: Value): Value {
        if(this.is(value.type)) return value;
        return value.clone(this);
    }

    is(type: TypeInfo): boolean {
        return type == this;
    }

    equals(type: TypeInfo): boolean {
        return this.is(type) || (type instanceof PrimitiveTypeInfo && (type.primType == PrimitiveValueType.ENUM || type.primType == PrimitiveValueType.ANY));
    }

    matches(type: TypeInfo): boolean {
        return this.equals(type);
    }

    toString(simple: boolean = false): string {
        if(simple) return `enum ${this.name}`;
        else return `enum ${this.name} {`
            + Array.from(this.values).map(e => e[1].toString(true)).join(', ') + '}';
    }

    resolveTypes(m: ModuleContainer): void {
        for(const [, c] of this.values) {
            c.resolveTypes(m);
        }
    }
}