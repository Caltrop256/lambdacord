import { ErrorType, RuntimeError } from "../error.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TupleTypeInfo } from "../types/tuple.js";
import { TypeInfo } from "../types/type.js";
import { StringValue } from "./StringValue.js";
import { Value } from "./value.js";


export class TupleValue extends Value {
    values: Value[];

    constructor(values: Value[]) {
        if(values.length == 1) throw new RuntimeError(ErrorType.Internal, `Tried to initiate non-tuple as tuple!`);
        super(new TupleTypeInfo('', values.map(v => v.type)));
        this.values = values;
    }
    isTruthy(): boolean {
        return true;
    }
    toString(): string {
        return `(${this.values.map(v => v.toString()).join(', ')})`
    }
    clone(type?: TypeInfo): Value {
        return new TupleValue(this.values.map(v => v.clone(v.type)));
    }
    weakCoerceTo(target: TypeInfo): Value {
        if(target.equals(defaultPrimitives['any'])) return this;
        if(target instanceof TupleTypeInfo && target.matches(this.type)) {
            return new TupleValue(this.values.map((v, i) => v.weakCoerceTo(target.types[i])));
        }

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.equals(defaultPrimitives['any'])) return this;
        if(target instanceof TupleTypeInfo && target.matches(this.type)) {
            return new TupleValue(this.values.map((v, i) => v.strongCoerceTo(target.types[i])));
        }
        if(target.equals(defaultPrimitives['string'])) return target.apply(new StringValue(this.toString()));

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }

    toJS() {
        return this.values.map(v => v.toJS());
    }
}