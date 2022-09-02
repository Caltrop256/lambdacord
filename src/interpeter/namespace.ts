import { Variable } from "./scope.js";
import { TypeInfo } from "./types/type.js";
import { Value } from "./values/value.js";

export class Namespace {
    static fromBuiltInModule(name: string, o: any) {
        const types: Map<string, TypeInfo> = new Map();
        const vars: Map<string, Variable> = new Map();
        for(const k in o) {
            const item = o[k];
            if(item instanceof Value) vars.set(k, new Variable(k, item.type, false, item, null));
            else if(item instanceof Variable) vars.set(k, item);
            else if(item instanceof TypeInfo) types.set(k, item);
            else throw new Error(`Invalid object imported from module ${name}: ${item}!`);
        }
        return new Namespace(name, types, vars);
    }

    name: string;
    types: Map<string, TypeInfo>;
    vars: Map<string, Variable>;

    constructor(name: string, types: Map<string, TypeInfo> = new Map(), vars: Map<string, Variable> = new Map()) {
        this.name = name;
        this.types = types;
        this.vars = vars;
    }
}