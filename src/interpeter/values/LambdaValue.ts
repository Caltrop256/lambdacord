import { Node } from "../../ast/node.js";
import { Continuation, ContinuationFrame, Thunk } from "../continuation.js";
import { ErrorType, RuntimeError } from "../error.js";
import { Scope, Variable } from "../scope.js";
import { LambdaTypeInfo } from "../types/lambda.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TypeInfo } from "../types/type.js";
import { Value } from "./value.js";

export type ExternalFunction = (args: Value[], caller: Node, scope: Scope, frame: ContinuationFrame, callback: Continuation) => Promise<Thunk>;
type LambdaBody = Node | ExternalFunction;

export class LambdaParameter {
    type: TypeInfo;
    name: string;
    mutable: boolean;

    constructor(type: TypeInfo, name?: string, mutable?: boolean) {
        this.type = type ?? defaultPrimitives['any'];
        this.name = name ?? '∅';
        this.mutable = mutable ?? false;
    }

    toString() {
        return `${this.mutable ? 'mut ' : ''}${this.name != '∅' ? `${this.name}:` : ''}${this.type}`;
    }
}

export class LambdaSignature {
    parameters: LambdaParameter[];
    returnType: TypeInfo;
    destructures: boolean;
    body: LambdaBody;
    scope: Scope | null;
    weight: number;

    constructor(parameters: LambdaParameter[], returnType: TypeInfo, destructures: boolean, body: LambdaBody, scope?: Scope) {
        this.parameters = parameters;
        this.returnType = returnType;
        this.destructures = destructures;
        this.body = body;
        this.scope = scope ?? null;

        this.weight = this.parameters.reduce((acc, val) => acc + val.type.weight(), 0);
    }

    equals(signature: LambdaSignature) {
        if(this.parameters.length != signature.parameters.length) return false;
        return this.parameters.every((v, i) => v.type.is(signature.parameters[i].type));
    }

    match(types: TypeInfo[], bindOperation: boolean) {
        if(types.length != this.parameters.length && !bindOperation) return false;
        for(let i = 0; i < types.length; ++i) {
            if(!types[i].equals(this.parameters[i].type)) return false;
        }
        return true;
    }

    matchCoerce(types: TypeInfo[], bindOperation: boolean) {
        if(types.length != this.parameters.length && !bindOperation) return false;
        for(let i = 0; i < types.length; ++i) {
            if(!types[i].matches(this.parameters[i].type)) return false;
        }
        return true;
    }

    createScope(values: Value[], requester: Node): Scope {
        if(this.scope == null) throw new RuntimeError(ErrorType.Internal, `Tried to construct subscope on External Function!`);
        const subscope = new Scope(this.scope);
        for(let i = 0; i < this.parameters.length; ++i) {
            subscope.defineVariable(new Variable(
                this.parameters[i].name,
                this.parameters[i].type,
                this.parameters[i].mutable,
                values[i],
                requester
            ));
        }
        return subscope;
    }

    toString() {
        return `(${this.parameters.map(p => p.toString()).join(', ')}):${this.returnType.name}`
    }

    clone() {
        return new LambdaSignature(
            this.parameters.map(p => new LambdaParameter(p.type, p.name, p.mutable)),
            this.returnType,
            this.destructures,
            this.body
        )
    }
}

export class LambdaValue extends Value {
    static coalesce(...lambdas: LambdaValue[]) {
        const signatures = [];
        let i = lambdas.length;
        while(i --> 0) signatures.push(...lambdas[i].signatures);
        return new LambdaValue(...signatures);
    }

    name: string = '';
    balanced: boolean;
    signatures: LambdaSignature[];

    constructor(...signatures: LambdaSignature[]) {
        signatures.sort((b, a) => a.weight - b.weight);
        super(LambdaTypeInfo.fromSignatures(signatures));
        this.signatures = signatures;

        this.balanced = true;
        let n = this.signatures[0].parameters.length;
        for(let i = 1; i < this.signatures.length; ++i) {
            if(this.signatures[i].parameters.length != n) {
                this.balanced = false;
                break;
            }
        }
    }

    bind(values: Value[]): LambdaValue {
        const valueTypes = values.map(v => v.type);
        const relevantSignatures: LambdaSignature[] = this.signatures.filter(s => s.matchCoerce(valueTypes, true));

        if(!relevantSignatures.length) {
            const inputTypes = `(${values.map(v => v.type.toString()).join(', ')})`;
            throw new RuntimeError(
                ErrorType.Dispatch, 
                `Failed to bind ${inputTypes} to any overloads!:\n\t${this.signaturesToString()}`
            );
        }

        const body: ExternalFunction = async (args, caller, scope, frame, callback) =>
            this.multipleDispatch([...values, ...args], caller, scope, frame, callback);
        return new LambdaValue(...relevantSignatures.map(s => {
            s = s.clone();
            s.body = body;
            s.parameters.splice(0, values.length);
            return s;
        }))
    }

    async singleDispatch(value: Value, caller: Node, scope: Scope, frame: ContinuationFrame, callback: Continuation): Promise<Thunk> {
        //if(!this.balanced) throw new RuntimeError(ErrorType.Dispatch, `Overload lengths are unbalanced and not suited for single dispatch!:\n\t${this.signaturesToString()}`);

        if(this.balanced) {
            if(this.signatures[0].parameters.length == 0)
                return this.multipleDispatch([], caller, scope, frame, result => callback(result));
            else if(this.signatures[0].parameters.length == 1)
                return this.multipleDispatch([value], caller, scope, frame, result => callback(result));
        } else {
            for(const signature of this.signatures) if(signature.parameters.length == 0)
                return this.multipleDispatch([], caller, scope, frame, result => callback(result));
            for(const signature of this.signatures) if(signature.parameters.length == 1)
                return this.multipleDispatch([value], caller, scope, frame, result => callback(result));
        }

        return callback(this.bind([value]));
    }

    async multipleDispatch(values: Value[], caller: Node, scope: Scope, frame: ContinuationFrame, callback: Continuation): Promise<Thunk> {
        const valueTypes = values.map(v => v.type);
        let matchingSignature: LambdaSignature | null = null;

        for(const signature of this.signatures) {
            if(signature.match(valueTypes, false)) {
                matchingSignature = signature;
                break;
            }
        }

        if(matchingSignature == null) for(const signature of this.signatures) {
            if(signature.matchCoerce(valueTypes, false)) {
                matchingSignature = signature;
                break;
            }
        }

        if(matchingSignature != null) {
            const signature = matchingSignature;
            const args = values.map((v, i) => v.weakCoerceTo(signature.parameters[i].type));

            frame.callStack.push(caller.range);
            const funcCallback = (result: Value): Promise<Thunk> => {
                frame.callStack.pop();
                return callback(result.weakCoerceTo(signature.returnType));
            }

            if(signature.body instanceof Node) {
                return frame.eval(signature.body, signature.createScope(args, caller), funcCallback);
            } else {
                return signature.body(args, caller, scope, frame, funcCallback);
            }
        } else {
            const source = ('op' in caller)
                // @ts-ignore
                ? ` for operator '${caller.op}'` 
                : '';

            const inputTypes = `(${values.map(v => v.type.toString()).join(', ')})`;

            throw new RuntimeError(ErrorType.Dispatch, `Input ${inputTypes} did not match any overloads${source}!:\n\t${this.signaturesToString()}`);
        }
    }

    signaturesToString() {
        return this.signatures.map(s => s.toString()).join('\n\t')
    }

    weakCoerceTo(target: TypeInfo): Value {
        if(target.is(defaultPrimitives['λ'])) return this;
        if(target.equals(this.type)) return target.apply(this);
        if(this.type.matches(target)) return this;

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.is(defaultPrimitives['λ'])) return this;
        if(target.equals(this.type)) return target.apply(this);

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }

    isTruthy(): boolean {
        return true;
    }
    toString(): string {
        return `(λ\t${this.signaturesToString()})`
    }
    clone(type: TypeInfo = this.type): Value {
        return new LambdaValue(...this.signatures);
    }

    toJS() {
        throw new RuntimeError(ErrorType.Internal, `Can't convert ${this.type} to js value!`);
    }
}