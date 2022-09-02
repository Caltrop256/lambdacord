import { ErrorType, RuntimeError } from "../error.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TypeInfo } from "../types/type.js";
import { IntegerValue } from "./IntegerValue.js";
import { RationalValue } from "./RationalValue.js";
import { StringValue } from "./StringValue.js";
import { Value } from "./value.js";

export class BooleanValue extends Value {
    value: boolean;

    constructor(value: boolean, type?: TypeInfo) {
        super(type ?? defaultPrimitives['bool']);
        this.value = value;
    }

    isTruthy(): boolean {
        return this.value;
    }
    toString(): string {
        return this.value.toString();
    }
    clone(type: TypeInfo = this.type): Value {
        return new BooleanValue(this.value, type);
    }
    
    weakCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(defaultPrimitives['int'].equals(target)) return target.apply(new IntegerValue(BigInt(+this.value)));
        if(defaultPrimitives['ratio'].equals(target)) return target.apply(new RationalValue(BigInt(+this.value), 1n));

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(target.equals(defaultPrimitives['int'])) return target.apply(new IntegerValue(BigInt(+this.value)));
        if(target.equals(defaultPrimitives['ratio'])) return target.apply(new RationalValue(BigInt(+this.value), 1n));
        if(target.equals(defaultPrimitives['string'])) return target.apply(new StringValue(this.value.toString()));

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }

    toJS(): boolean {
        return this.value;
    }
}