import { Node } from "../ast/node.js";
import { ParseState } from "../ast/parser/util.js";
import { ErrorType, RuntimeError } from "../interpeter/error.js";
import { Namespace } from "../interpeter/namespace.js";
import { Scope } from "../interpeter/scope.js";
import { TypeInfo } from "../interpeter/types/type.js";

export class ModuleContainer {
    availableTypes: Map<string, TypeInfo> = new Map();
    namespaces: Map<string, Namespace> = new Map();
    exports: Namespace;
    
    location: string;
    scope: Scope;
    AST: Node;

    constructor(location: string, scope: Scope, result: ParseState, importedNamespaces: Namespace[]) {
        this.location = location;
        this.exports = new Namespace(location);
        this.scope = scope;
        this.AST = result.AST;
        
        for(const namespace of importedNamespaces) this.import(namespace);
        for(const [, type] of result.types) {
            if(this.availableTypes.has(type.name)) throw new Error(`Type ${type} collides with imported type ${this.availableTypes.get(type.name)}!`);
            this.availableTypes.set(type.name, type);
        }
        for(const [, type] of this.availableTypes) type.resolveTypes(this);
        for(const type of result.anonymousTypes) type.resolveTypes(this);
        // @ts-ignore
        for(const node of result.requiresTypeResolve) node.resolveReferenceTypes(this);
    }

    getTypeInfo(name: string):TypeInfo {
        const info = this.availableTypes.get(name);
        if(info instanceof TypeInfo) return info;
        
        throw new RuntimeError(ErrorType.Type, `Type '${name}' is not defined or unavailable in ${this.location}`);
    }

    import(foreign: Namespace) {
        for(const [, v] of foreign.vars) this.scope.defineVariable(v);
        for(const [name, t] of foreign.types) this.availableTypes.set(name, t);
        return;
        if(this.namespaces.has(foreign.name)) throw new Error(`Already imported ${foreign.name}!`);
        this.namespaces.set(foreign.name, foreign);
    }
}
