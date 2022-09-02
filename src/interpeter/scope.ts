import { Node } from "../ast/node.js";
import { ErrorType, RuntimeError } from "./error.js";
import { TypeInfo } from "./types/type.js";
import { Value } from "./values/value.js";

export class Variable {
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

export class Scope {
    parent: Scope | null;
    vars: Map<string, Variable>;

    constructor(parent?: Scope) {
        this.parent = parent ?? null;
        this.vars = new Map();
    }

    getVariable(name: string): Variable {
        let scope: Scope | null = this;
        do {
            const val = scope.vars.get(name);
            if(val instanceof Variable) return val;
        } while(scope = scope.parent);
        throw new RuntimeError(ErrorType.Variable, `${name} is not defined!`);
    }

    updateVariable(variable: Variable): void {
        let scope: Scope | null = this;
        do {
            const val = scope.vars.get(variable.name);
            if(val instanceof Variable) {
                if(!val.mutable) {
                    if(val.creator) throw new RuntimeError(ErrorType.Immutability, `Can not replace ${val} with ${variable} as it was defined immutable @ ${val.creator.range}!`);
                    else throw new RuntimeError(ErrorType.Immutability, `Can not replace ${val} with ${variable} as it was defined immutable!`);
                }
                else scope.vars.set(variable.name, variable);
                return;
            };
        } while(scope = scope.parent);
        throw new RuntimeError(ErrorType.Assignment, `${variable.name} was never initialized and can't be reassigned to ${variable}!`);
    }

    defineVariable(variable: Variable): void {
        const def = this.vars.get(variable.name);
        if(typeof def != 'undefined') {
            if(def.creator) throw new RuntimeError(ErrorType.Variable, `${variable} already defined as ${def} @ ${def.creator.range}!`);
            else throw new RuntimeError(ErrorType.Variable, `${variable} already defined as ${def}!`);
        }
        this.vars.set(variable.name, variable);
    }
}