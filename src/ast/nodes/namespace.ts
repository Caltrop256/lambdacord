import { ContinuationFrame, Continuation, Thunk } from "../../interpeter/continuation.js";
import { Scope, Variable } from "../../interpeter/scope.js";
import { EnumTypeInfo } from "../../interpeter/types/enum.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { CharRange } from "../../lexer/charinfo.js";
import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Node } from "../node.js";

const resolvePath = (namespacePath: string[], m: ModuleContainer): EnumTypeInfo | TypeInfo | null => {
    if(namespacePath.length == 1) {
        const left = namespacePath[0];
        const type = m.availableTypes.get(left);
        if(type && type instanceof EnumTypeInfo) {
            return type;
        }
    }
    return null;
}

export class NamespaceAccessNode extends Node {
    namespacePath: string[];
    field: string;

    constructor(namespacePath: string[], field: string, range: CharRange) {
        super(range);
        this.namespacePath = namespacePath;
        this.field = field;
    }

    toString(depth: number): string {
        return this.namespacePath.join('::') + '::' + this.field;
    }

    eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        throw '';
    }
}