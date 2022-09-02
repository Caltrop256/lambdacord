import { ErrorType, RuntimeError } from "../error.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TypeInfo } from "../types/type.js";
import { BooleanValue } from "./BooleanValue.js";
import { RationalValue } from "./RationalValue.js";
import { StringValue } from "./StringValue.js";
import { Value } from "./value.js";

export class IntegerValue extends Value {
    value: bigint;
    
    constructor(value: bigint, type?: TypeInfo) {
        super(type ?? defaultPrimitives['int']);
        this.value = value;
    }

    isTruthy(): boolean {
        return this.value != 0n;
    }

    toString():string {
        return this.value.toString();
    }

    clone(type: TypeInfo = this.type) {
        return new IntegerValue(this.value, type);
    }

    weakCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(defaultPrimitives['ratio'].equals(target)) return target.apply(new RationalValue(this.value, 1n));
        if(defaultPrimitives['bool'].equals(target)) return target.apply(new BooleanValue(this.value != 0n));

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(target.equals(defaultPrimitives['ratio'])) return target.apply(new RationalValue(this.value, 1n));
        if(target.equals(defaultPrimitives['bool'])) return target.apply(new BooleanValue(this.value != 0n));
        if(target.equals(defaultPrimitives['string'])) return target.apply(new StringValue(this.value.toString()));

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }

    toJS() {
        return this.value;
    }
}