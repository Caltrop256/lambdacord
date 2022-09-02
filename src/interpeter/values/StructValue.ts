import { Node } from "../../ast/node.js";
import { ErrorType, RuntimeError } from "../error.js";
import { Variable } from "../scope.js";
import { defaultPrimitives } from "../types/primitive.js";
import { StructTypeInfo } from "../types/struct.js";
import { TypeInfo } from "../types/type.js";
import { Value } from "./value.js";

const coerceFields = (fields: Map<string, StructField>, target: StructTypeInfo, strict: boolean) => {
    const result: Map<string, StructField> = new Map();
    if(strict) {
        const additional = [];
        for(const [fKey] of fields) {
            if(!target.fields.has(fKey)) additional.push(`"${fKey}"`);
        }
        if(additional.length != 0) throw new RuntimeError(ErrorType.Type, `Can't instantiate as ${target} because target type does not support surplus field${additional.length != 1 ? 's' : ''} ${additional.join(', ')}!`);
    }

    for(const [tKey, tVar] of target.fields) {
        const fVar = fields.get(tKey);
        if(!fVar) throw new RuntimeError(ErrorType.Coercion, `Missing field ${tKey} required to instantiate ${target}!`);
        if(!fVar.mutable && tVar.mutable) throw new RuntimeError(ErrorType.Immutability, `Can't coerce immutable field ${tKey} to mutable equivalent in ${target}!`);
        if(!fVar.value.type.matches(tVar.type)) throw new RuntimeError(ErrorType.Coercion, `Can't coerce field ${tKey}'s ${fVar.value.type} to ${tVar.type}! (Target struct: ${target})`);
        result.set(tKey, new StructField(
            tKey,
            tVar.type,
            tVar.mutable,
            tVar.type.is(defaultPrimitives['any']) ? fVar.value : fVar.value.weakCoerceTo(tVar.type),
            fVar.creator
        ))
    }

    return result;
}

export class StructField {
    mutable: boolean;
    type: TypeInfo;
    name: string;
    value: Value;
    creator: Node | null;

    constructor(name: string, type: TypeInfo, mutable: boolean, value: Value, creator: Node | null) {
        this.name = name;
        this.type = type;
        this.mutable = mutable;
        this.value = value;
        this.creator = creator;
    }

    toString() {
        return `${this.mutable ? 'mut ' : ''}${this.name}: ${this.type}(${this.value})`
    }
}

export class StructValue extends Value {
    fields: Map<string, StructField> = new Map();

    constructor(fields: Map<string, StructField>, type: TypeInfo) {
        const isStructTypeInfo = (type instanceof StructTypeInfo);
        if(type.equals(defaultPrimitives['struct']) && !isStructTypeInfo) super(StructTypeInfo.fromStructValue(fields))
        else {
            if(!isStructTypeInfo) throw new RuntimeError(ErrorType.Internal, `Invalid struct initializer type: ${type}!`);
            fields = coerceFields(fields, type, true);
            super(type);
        }
        this.fields = fields;
    }

    isTruthy(): boolean {
        return true;
    }
    toString(): string {
        if(this.fields.size == 0) return `{}`;
        else return `{${Array.from(this.fields).map(([name, variable]) => `${name}: ${variable.value}`).join(', ')}}`
    }
    clone(type: TypeInfo = this.type): Value {
        return new StructValue(new Map(Array.from(this.fields).map(([name, variable]) => [name, new StructField(
            variable.name,
            variable.type,
            variable.mutable,
            variable.value.clone(),
            variable.creator
        )])), type);
    }

    weakCoerceTo(target: TypeInfo): Value {
        if(target.is(defaultPrimitives['struct'])) return this;
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(target instanceof StructTypeInfo) return new StructValue(coerceFields(this.fields, target, false), target);

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.is(this.type) || this.type.equals(target)) return target.apply(this);
        if(target instanceof StructTypeInfo) return new StructValue(coerceFields(this.fields, target, false), target);

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }

    toJS() {
        const obj = Object.create(null);
        for(const [name, variable] of this.fields) {
            obj[name] = variable.value.toJS();
        }
        return obj;
    }
}