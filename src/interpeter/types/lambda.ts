import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { LambdaSignature } from "../values/LambdaValue.js";
import { Value } from "../values/value.js";
import { defaultPrimitives, PrimitiveTypeInfo } from "./primitive.js";
import { ReferenceTypeInfo } from "./reference.js";
import { TypeInfo, TypeType } from "./type.js";

export class LambdaTypeInfo extends TypeInfo {
    static fromSignatures(signatures: LambdaSignature[]) {
        return new LambdaTypeInfo(
            '', 
            signatures.map(s => s.parameters.map(p => ({type: p.type, mutable: p.mutable}))),
            signatures.map(s => s.returnType)
        )
    }

    parameters: {type: TypeInfo, mutable: boolean}[][];
    returnType: TypeInfo[];

    constructor(name: string, parameters: {type: TypeInfo, mutable: boolean}[][], returnType: TypeInfo[]) {
        super(name, TypeType.LAMBDA);
        this.parameters = parameters;
        this.returnType = returnType;
    }

    toString(simple: boolean = false): string {
        return this.parameters.map((p, i) => `λ(${p.map(a => `${a.mutable ? 'mut ' : ''}${a.type.toString(true)}`).join(', ')}):${this.returnType[i].toString(true)}`).join(' | ');
    }
    weight(): number {
        return 1000;
    }
    apply(value: Value): Value {
        if(this.is(value.type)) return value;
        return value.clone(this);
    }
    is(type: TypeInfo): boolean {
        return type == this;
    }
    equals(type: TypeInfo): boolean {
        if(type instanceof PrimitiveTypeInfo && (type.is(defaultPrimitives['any']) || type.is(defaultPrimitives['λ'])))
            return true;
        return this.is(type);
    }
    matches(type: TypeInfo): boolean {
        if(this.equals(type)) return true;
        if(type instanceof LambdaTypeInfo) {
            if(type.returnType.length > this.returnType.length) return false;
            outer:
            for(let i = 0; i < type.returnType.length; ++i) {
                search:
                for(let j = 0; j < this.returnType.length; ++j) {
                    if(type.parameters[i].length != this.parameters[j].length) continue search;
                    if(!this.returnType[j].matches(type.returnType[i])) continue search;
                    for(let k = 0; k < type.parameters[i].length; ++k) {
                        if(!this.parameters[j][k].type.matches(type.parameters[i][k].type)) continue search;
                    }
                    continue outer;
                }
                return false;
            }
            return true;
        }
        return false;
    }
    resolveTypes(m: ModuleContainer): void {
        for(let i = 0; i < this.returnType.length; ++i) {
            if(this.returnType[i] instanceof ReferenceTypeInfo) this.returnType[i] = m.getTypeInfo(this.returnType[i].name);
        }
        for(const p2d of this.parameters) {
            for(const p of p2d) {
                if(p.type instanceof ReferenceTypeInfo) p.type = m.getTypeInfo(p.type.name);
            }
        }
    }
}