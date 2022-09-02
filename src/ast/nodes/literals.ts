import { ContinuationFrame, Continuation, Thunk } from "../../interpeter/continuation.js";
import { ErrorType, RuntimeError } from "../../interpeter/error.js";
import { Scope, Variable } from "../../interpeter/scope.js";
import { ReferenceTypeInfo } from "../../interpeter/types/reference.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { ArrayValue } from "../../interpeter/values/ArrayValue.js";
import { BooleanValue } from "../../interpeter/values/BooleanValue.js";
import { IntegerValue } from "../../interpeter/values/IntegerValue.js";
import { LambdaParameter, LambdaSignature, LambdaValue } from "../../interpeter/values/LambdaValue.js";
import { RationalValue } from "../../interpeter/values/RationalValue.js";
import { StringValue } from "../../interpeter/values/StringValue.js";
import { StructValue } from "../../interpeter/values/StructValue.js";
import { TupleValue } from "../../interpeter/values/TupleValue.js";
import { Value } from "../../interpeter/values/value.js";
import { CharRange } from "../../lexer/charinfo.js";
import { Token } from "../../lexer/tokens/token.js";
import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { indent, Node } from "../node.js";
import { VariableInitializationNode } from "./variable.js";

export class IntegerNode extends Node {
    value: bigint;

    constructor(token: Token) {
        super(token.range);
        this.value = token.value;
    }

    toString() {
        return this.value.toString();
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return callback(new IntegerValue(this.value));
    }
}

export class RatioNode extends Node {
    value: [bigint, string, string];

    constructor(token: Token) {
        super(token.range);
        this.value = token.value;
    }

    toString() {
        return `${this.value[0]}.${this.value[1]}${this.value[2].split('').map(c => c + String.fromCharCode(773)).join('')}`
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return callback(RationalValue.fromComponents(...this.value));
    }
}

export class BooleanNode extends Node {
    value: boolean;

    constructor(token: Token) {
        super(token.range);
        this.value = token.value == 'true';
    }

    toString() {
        return this.value.toString();
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return callback(new BooleanValue(this.value));
    } 
}

type LambdaNodeParamter = {mutable: boolean, name: string, type: TypeInfo};
export class LambdaNode extends Node {
    parameters: LambdaNodeParamter[];
    returnType: TypeInfo;
    destructures: boolean;
    body: Node;

    constructor(parameters: LambdaNodeParamter[], returnType: TypeInfo, destructures: boolean, body: Node, range: CharRange) {
        super(range);
        this.parameters = parameters;
        this.returnType = returnType;
        this.destructures = destructures;
        this.body = body;
    }

    toString(depth: number) {
        return `(λ${this.parameters.map((p) => `${p.mutable ? 'mut ' : ''}${p.name}:${p.type}`).join(', ')}):${this.returnType} ${this.body.toString(depth)}`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return callback(new LambdaValue(new LambdaSignature(
            this.parameters.map(p => new LambdaParameter(
                p.type,
                p.name,
                p.mutable
            )),
            this.returnType,
            this.destructures,
            this.body,
            scope
        )));
    }

    resolveReferenceTypes(m: ModuleContainer) {
        if(this.returnType instanceof ReferenceTypeInfo) this.returnType = m.getTypeInfo(this.returnType.name);
        for(const p of this.parameters) {
            if(p.type instanceof ReferenceTypeInfo) p.type = m.getTypeInfo(p.type.name);
        }
    }
}

export class StringNode extends Node {
    components: (string | Node)[];

    constructor(components: (string | Node)[], range: CharRange) {
        super(range);
        this.components = components;
    }

    toString(depth: number) {
        return `"${this.components.map(n => {
            if(n instanceof Node) return `\${${n.toString(depth)}}`;
            else return n;
        }).join('')}"`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        let str = '';
        const readComponents = (i: number): Promise<Thunk> => {
            if(i == this.components.length) {
                return callback(new StringValue(str));
            } else {
                const compontent = this.components[i];
                if(typeof compontent == 'string') {
                    str += compontent;
                    return readComponents(i + 1);
                } else if(compontent instanceof Node) {
                    return frame.eval(compontent, scope, value => {
                        if(value instanceof StringValue) str += value.value;
                        else str += value.toString();
                        return readComponents(i + 1);
                    });
                } else throw new RuntimeError(ErrorType.Internal, `Non-string or Node compontent in string literal!`);
            }
        }
        return readComponents(0);
    };
}

export class ArrayNode extends Node {
    items: Node[];

    constructor(items: Node[], range: CharRange) {
        super(range);
        this.items = items;
    }

    toString(depth: number) {
        return `[${this.items.map(i => i.toString(depth)).join(', ')}]`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        const values: Value[] = [];
        const iterateItems = (i: number): Promise<Thunk> => {
            if(i == this.items.length) {
                return callback(new ArrayValue(values));
            } else {
                return frame.eval(this.items[i], scope, value => {
                    values.push(value);
                    return iterateItems(i + 1);
                })
            }
        }
        return iterateItems(0);
    }
}

export class StructNode extends Node {
    structType: TypeInfo;
    fields: Map<string, VariableInitializationNode>;

    constructor(structType: TypeInfo, fields: Map<string, VariableInitializationNode>, range: CharRange) {
        super(range);
        this.structType = structType;
        this.fields = fields;
    }

    toString(depth: number) {
        if(this.fields.size == 0) return this.structType.name + ' {}';
        return this.structType.name + ' {\n'
            + Array.from(this.fields).map(([, node]) => `${indent(depth + 1)}${node.toString(depth + 1).substring(4)}`).join('\n')
            + `\n${indent(depth)}}`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        const evaluatedFields: Map<string, Variable> = new Map();
        const fields = Array.from(this.fields);
        const iterateFields = (i: number): Promise<Thunk> => {
            if(i == fields.length) {
                return callback(new StructValue(evaluatedFields, this.structType));
            } else {
                const typeInfo = fields[i][1].varType;
                return frame.eval(fields[i][1].right, scope, value => {
                    evaluatedFields.set(fields[i][0], new Variable(
                        fields[i][0],
                        typeInfo,
                        fields[i][1].mutable,
                        value.weakCoerceTo(typeInfo),
                        this
                    ));
                    return iterateFields(i + 1);
                })
            }
        }
        return iterateFields(0);
    }

    resolveReferenceTypes(m: ModuleContainer) {
        if(this.structType instanceof ReferenceTypeInfo) this.structType = m.getTypeInfo(this.structType.name);
        for(const [, f] of this.fields) {
            if(f.varType instanceof ReferenceTypeInfo) f.varType = m.getTypeInfo(f.varType.name);
        }
    }
}

export class TupleNode extends Node {
    values: Node[];

    constructor(values: Node[], range: CharRange) {
        super(range);
        this.values = values;
    }

    eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        const vals: Value[] = [];
        const ittrVals = (ind: number): Promise<Thunk> => {
            if(ind == this.values.length) {
                return callback(new TupleValue(vals));
            } else {
                return frame.eval(this.values[ind], scope, res => {
                    vals.push(res);
                    return ittrVals(ind + 1);
                });
            }
        }
        return ittrVals(0);
    }
    toString(depth: number): string {
        return `(${this.values.map(v => v.toString(depth)).join(', ')})`
    }
    
}