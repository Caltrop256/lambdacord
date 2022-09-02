import { ErrorType, RuntimeError } from "../error.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TypeInfo } from "../types/type.js";
import { Value } from "./value.js";

export class ArrayValue extends Value {
    items: Value[];

    constructor(items: Value[], type?: TypeInfo) {
        super(type ?? defaultPrimitives['array']);
        this.items = items;
    }

    isTruthy(): boolean {
        return this.items.length != 0;
    }
    //FIXME: cyclical values still possible!!!!!!
    toString(): string {
        let str = '[';
        for(let i = 0; i < this.items.length; ++i) {
            if(this.items[i] == this) str += '<Circular>';
            else str += this.items[i].toString();

            if(i != this.items.length - 1) str += ', ';
        }
        return str + ']';
    }
    clone(type: TypeInfo = this.type): Value {
        const items = new Array(this.items.length);
        const arr = new ArrayValue(items, type);

        for(let i = 0; i < this.items.length; ++i) {
            if(this.items[i] == this) items[i] = arr;
            else items[i] = this.items[i].clone();
        }

        arr.items = items;
        return arr;
    }

    weakCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }

    toJS(): any[] {
        return this.items.map(i => i.toJS());
    }
}