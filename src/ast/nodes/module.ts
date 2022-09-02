import { Continuation, ContinuationFrame, Thunk } from "../../interpeter/continuation.js";
import { Scope } from "../../interpeter/scope.js";
import { ReferenceTypeInfo } from "../../interpeter/types/reference.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { IntegerValue } from "../../interpeter/values/IntegerValue.js";
import { CharRange } from "../../lexer/charinfo.js";
import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Node } from "../node.js";

export class ImportNode extends Node {
    module: string;

    constructor(module: string, range: CharRange) {
        super(range);
        this.module = module;
    }

    toString(depth: number) {
        return `import "${this.module}"`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return callback(new IntegerValue(1n));
    }
}

export class StructTypeNodeField {
    name: string;
    mutable: boolean;
    type: TypeInfo;

    constructor(name: string, mutable: boolean, type: TypeInfo) {
        this.name = name;
        this.mutable = mutable;
        this.type = type;
    }

    toString(simple: boolean = false) {
        if(simple) return `${this.mutable ? 'mut ' : ''}${this.name}: ${this.type.name}`
        else return `${this.mutable ? 'mut ' : ''}${this.name}: ${this.type.toString(true)}`
    }

    resolveReferenceTypes(m: ModuleContainer) {
        if(this.type instanceof ReferenceTypeInfo) this.type = m.getTypeInfo(this.type.name);
    }
}