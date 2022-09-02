import { TypeInfo } from "../types/type.js";


export abstract class Value {
    type: TypeInfo;

    constructor(type: TypeInfo) {
        this.type = type;
    }

    abstract weakCoerceTo(target: TypeInfo): Value;
    abstract strongCoerceTo(target: TypeInfo): Value; 

    abstract isTruthy(): boolean;
    abstract toString(): string;
    abstract clone(type?: TypeInfo): Value;

    abstract toJS(): any;
}