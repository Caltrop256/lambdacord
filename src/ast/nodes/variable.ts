import { Continuation, ContinuationFrame, Thunk } from "../../interpeter/continuation.js";
import { ErrorType, RuntimeError } from "../../interpeter/error.js";
import { Scope, Variable } from "../../interpeter/scope.js";
import { EnumTypeInfo } from "../../interpeter/types/enum.js";
import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { ReferenceTypeInfo } from "../../interpeter/types/reference.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { ArrayValue } from "../../interpeter/values/ArrayValue.js";
import { EnumValue } from "../../interpeter/values/EnumValue.js";
import { IntegerValue } from "../../interpeter/values/IntegerValue.js";
import { LambdaValue } from "../../interpeter/values/LambdaValue.js";
import { StringValue } from "../../interpeter/values/StringValue.js";
import { StructValue } from "../../interpeter/values/StructValue.js";
import { TupleValue } from "../../interpeter/values/TupleValue.js";
import { Value } from "../../interpeter/values/value.js";
import { CharRange } from "../../lexer/charinfo.js";
import { Token } from "../../lexer/tokens/token.js";
import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Node } from "../node.js";
import { InfixNode } from "./operators.js";

export class VariableAccessNode extends Node {
    name: string;

    constructor(identifier: Token) {
        super(identifier.range);
        this.name = identifier.value;
    }

    toString(depth: number) {
        return this.name;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return callback(scope.getVariable(this.name).value);
    }
}

export class FieldAccessNode extends Node {
    left: Node;
    field: string;

    constructor(left: Node, field: string, range: CharRange) {
        super(range);
        this.left = left;
        this.field = field;
    }

    toString(depth: number) {
        return `${this.left.toString(depth)}.${this.field}`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        const attemptFunctionLookup = (res: Value, ifFailErrorMessage: string): Promise<Thunk> => {
            let f;
            try { f = scope.getVariable(this.field).value }
            catch(e) { throw new RuntimeError(ErrorType.Field, ifFailErrorMessage + '!') };
            if(!(f instanceof LambdaValue)) throw new RuntimeError(ErrorType.Field, ifFailErrorMessage + '!');
            return callback(f.bind([res]));
        };

        return frame.eval(this.left, scope, res => {
            if(!(res instanceof StructValue)) return attemptFunctionLookup(res, `Unable to access field '${this.field}' of non-struct type`);
            const value = res.fields.get(this.field);
            if(!value) return attemptFunctionLookup(res, `No field '${this.field}' in ${res.type}`);
            return callback(value.value);
        });
    }
}

export const constructEnum = async (type: EnumTypeInfo, field: string, nodes: Node[], frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> => {
    const item = type.values.get(field);
    if(!item) throw new RuntimeError(ErrorType.Field, `Enum value ${type.name}::${field} does not exist!`);

    if(nodes.length != 1) throw new RuntimeError(ErrorType.Enum, `Enum constructors take a single value (${nodes.length} provided)!`);
    return frame.eval(nodes[0], scope, res => {
        if(!(item.constructedType instanceof TypeInfo)) throw new RuntimeError(ErrorType.Enum, `Unit enum value ${type.name}::${field} can not be constructed!`);
        return callback(new EnumValue(item, res.weakCoerceTo(item.constructedType), type));
    });
}

export class VariableInitializationNode extends Node {
    name: string;
    varType: TypeInfo;
    mutable: boolean;
    right: Node;

    constructor(name: string, type: TypeInfo, mutable: boolean, right: Node, range: CharRange) {
        super(range);
        this.name = name;
        this.varType = type;
        this.mutable = mutable;
        this.right = right;
    }

    toString(depth: number) {
        return `let ${this.mutable ? 'mut ' : ''}${this.name}: ${this.varType} = ${this.right.toString(depth)}`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.right, scope, temp => {
            const type = this.varType;
            const value = temp.weakCoerceTo(type);
            const variable = new Variable(this.name, type, this.mutable, value, this);
            scope.defineVariable(variable);
            return callback(value);
        })
    }

    resolveReferenceTypes(m: ModuleContainer) {
        if(this.varType instanceof ReferenceTypeInfo) this.varType = m.getTypeInfo(this.varType.name);
    }
}

export class TupleDestructuringNode extends Node {
    names: (string | null)[];
    mutable: boolean;
    right: Node;

    constructor(names: (string | null)[], mutable: boolean, right: Node, range: CharRange) {
        super(range);
        this.names = names;
        this.mutable = mutable;
        this.right = right;
    }

    toString(depth: number): string {
        return `let (${this.names.join(', ')}) = ${this.right.toString(depth)}`;
    }

    eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.right, scope, tuple => {
            if(!(tuple instanceof TupleValue))
                throw new RuntimeError(ErrorType.Assignment, `Can not destructure non-tuple type!`);
            for(let i = 0; i < this.names.length; ++i) {
                const name = this.names[i];
                if(typeof name != 'string') continue;
                if(i >= tuple.values.length)
                    throw new RuntimeError(ErrorType.OutOfBounds, `Can't destructure ${tuple} into ${i + 1} or more distinct values!`);

                const variable = new Variable(
                    name,
                    defaultPrimitives['any'],
                    this.mutable,
                    tuple.values[i],
                    this
                );
                scope.defineVariable(variable);  
            }
            return callback(tuple);
        });
    }

    resolveReferenceTypes(m: ModuleContainer) {}
}

export class SelectorNode extends Node {
    left: Node;
    args: Node[];

    constructor(left: Node, args: Node[], range: CharRange) {
        super(range);
        this.left = left;
        this.args = args;
    }

    toString(depth: number) {
        return `${this.left.toString(depth)}[${this.args.map(a => a.toString(depth)).join(', ')}]`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.left, scope, val => {
            if(this.args.length == 0) throw new RuntimeError(ErrorType.Selector, `Can not apply empty selector to struct or array!`);
            let left: Value = val;
            const iterateArgs = (i: number): Promise<Thunk> => {
                return frame.eval(this.args[i], scope, res => {
                    if(left instanceof ArrayValue) {
                        if(!(res instanceof IntegerValue)) throw new RuntimeError(ErrorType.Selector, `Can not apply non-integer selector to type ${left.type}!`);
                        if(res.value < 0n || res.value >= BigInt(left.items.length)) throw new RuntimeError(ErrorType.OutOfBounds, `Tried to access out of bounds array index (${res.value}/${left.items.length - 1})!`);
        
                        left = left.items[Number(res.value)];
        
                        if(i == this.args.length - 1) return callback(left);
                        else return iterateArgs(i + 1);
                    } else if(left instanceof StructValue) {
                        if(!(res instanceof StringValue)) throw new RuntimeError(ErrorType.Selector, `Can not apply non-string selector to type ${left.type}!`);
                        const newLeft = left.fields.get(res.value);
                        if(!newLeft) throw new RuntimeError(ErrorType.Field, `No field "${res.value}" in struct!`);
                        left = newLeft.value;
        
                        if(i == this.args.length - 1) return callback(left);
                        else return iterateArgs(i + 1);
                    } else throw new RuntimeError(ErrorType.Selector, `Can not apply selector to type ${left.type}!`);
                });
            }
            return iterateArgs(0);  
        })
    }
}

export const evaluateArrayAndStructAccess = async (node: SelectorNode, val: ArrayValue | StructValue, frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> => {
    if(node.args.length == 0) throw new RuntimeError(ErrorType.Selector, `Can not apply empty selector to struct or array!`);
    let left: Value = val;
    const iterateArgs = (i: number): Promise<Thunk> => {
        return frame.eval(node.args[i], scope, res => {
            if(left instanceof ArrayValue) {
                if(!(res instanceof IntegerValue)) throw new RuntimeError(ErrorType.Selector, `Can not apply non-integer selector to type ${left.type}!`);
                if(res.value < 0n || res.value >= BigInt(left.items.length)) throw new RuntimeError(ErrorType.OutOfBounds, `Tried to access out of bounds array index (${res.value}/${left.items.length - 1})!`);

                left = left.items[Number(res.value)];

                if(i == node.args.length - 1) return callback(left);
                else return iterateArgs(i + 1);
            } else if(left instanceof StructValue) {
                if(!(res instanceof StringValue)) throw new RuntimeError(ErrorType.Selector, `Can not apply non-string selector to type ${left.type}!`);
                const newLeft = left.fields.get(res.value);
                if(!newLeft) throw new RuntimeError(ErrorType.Field, `No field "${res.value}" in struct!`);
                left = newLeft.value;

                if(i == node.args.length - 1) return callback(left);
                else return iterateArgs(i + 1);
            } else throw new RuntimeError(ErrorType.Selector, `Can not apply selector to type ${left.type}!`);
        });
    }
    return iterateArgs(0);
}

export const evaluateAssignment = async (node: InfixNode, frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> => {
    return frame.eval(node.right, scope, _valueToAssign => {
        const valueToAssign = _valueToAssign;
        if(node.left instanceof VariableAccessNode) {
            if(!(node.left instanceof VariableAccessNode)) throw new RuntimeError(ErrorType.Assignment, `Can not re-assign anonymous value!`);
            const def = scope.getVariable(node.left.name);
            const variable = new Variable(node.left.name, def.type, true, valueToAssign.weakCoerceTo(def.type), node);
            scope.updateVariable(variable);
            return callback(valueToAssign);
        } else if(node.left instanceof SelectorNode) {
            if(!(node.left.left instanceof VariableAccessNode)) throw new RuntimeError(ErrorType.Assignment, `Can not re-assign anonymous value!`);
            //const def = scope.getVariable(node.left.func.name);
            //if(!def.mutable) throw new RuntimeError(node, `Can not change member in immutable variable!`);
            return frame.eval(node.left.left, scope, value => {
                if(!(node.left instanceof SelectorNode)) throw new RuntimeError(ErrorType.Internal, `Failed sanity check, invalid function ndoe!`);
                const args = node.left.args;
                let left = value;
                const iterateArgs = (i: number): Promise<Thunk> => {
                    return frame.eval(args[i], scope, res => {
                        if(left instanceof ArrayValue) {
                            if(!(res instanceof IntegerValue)) throw new RuntimeError(ErrorType.Selector, `Can not apply non-integer selector to type ${left.type}!`);
                            if(res.value < 0n || res.value >= BigInt(left.items.length)) throw new RuntimeError(ErrorType.OutOfBounds, `Tried to access out of bounds array index (${res.value}/${left.items.length - 1})!`);
        
                            if(i >= args.length - 1) {
                                left.items[Number(res.value)] = valueToAssign;
                                return callback(valueToAssign);
                            } else {
                                left = left.items[Number(res.value)];
                                return iterateArgs(i + 1);
                            }
                        } else if(left instanceof StructValue) {
                            if(!(res instanceof StringValue)) throw new RuntimeError(ErrorType.Selector, `Can not apply non-string selector to type ${left.type}!`);
                            const newLeft = left.fields.get(res.value);

                            if(i >= args.length - 1) {
                                if(!newLeft) {
                                    throw new RuntimeError(ErrorType.Field, `No field "${res.value}" in struct!`);
                                } else {
                                    if(!newLeft.mutable) throw new RuntimeError(ErrorType.Immutability, `Field ${newLeft} is not mutable!`);
                                    left.fields.set(res.value, new Variable(
                                        res.value,
                                        newLeft.type,
                                        true,
                                        valueToAssign.weakCoerceTo(newLeft.type),
                                        args[i]
                                    ))
                                }
                                return callback(valueToAssign);
                            } else {
                                if(!newLeft) throw new RuntimeError(ErrorType.Field, `No field "${res.value}" in struct!`);
                                left = newLeft.value;
                                return iterateArgs(i + 1);
                            }
                        } else throw new RuntimeError(ErrorType.UnexpectedType, `Can not apply selector to type ${left.type}!`);
                    });
                }
                return iterateArgs(0);
            });
        } else throw new RuntimeError(ErrorType.Assignment, `Can not re-assign anonymous value!`);
    })        
}