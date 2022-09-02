import { ErrorType, RuntimeError } from "../error.js";
import { EnumTypeInfoEntry } from "../types/enum.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TypeInfo } from "../types/type.js";
import { IntegerValue } from "./IntegerValue.js";
import { StringValue } from "./StringValue.js";
import { Value } from "./value.js";

export class EnumValue extends Value {
    value: EnumTypeInfoEntry;
    holdingValue: Value | null;

    constructor(value: EnumTypeInfoEntry, holdingValue: Value | null, type: TypeInfo) {
        super(type);
        this.value = value;
        this.holdingValue = holdingValue;
    }

    weakCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return this;

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce enum ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return this;
        if(target.equals(defaultPrimitives['int'])) return target.apply(new IntegerValue(BigInt(this.value.discriminant)));
        if(target.equals(defaultPrimitives['string'])) return target.apply(new StringValue(this.value.name));

        throw new RuntimeError(ErrorType.Cast, `Can not coerce enum ${this.type} to ${target}!`);
    }
    isTruthy(): boolean {
        return true;
    }
    toString(): string {
        return `${this.type.name}::${this.value.name}${this.holdingValue ? '[' + this.holdingValue.toString() + ']' : ''}`;
    }
    clone(type?: TypeInfo | undefined): Value {
        return new EnumValue(this.value, this.holdingValue, type ?? this.type);
    }
    
    toJS() {
        throw new RuntimeError(ErrorType.Internal, `Can't convert ${this.type} to js value!`);
    }
}