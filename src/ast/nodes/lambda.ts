import { Continuation, ContinuationFrame, Thunk } from "../../interpeter/continuation.js";
import { ErrorType, RuntimeError } from "../../interpeter/error.js";
import { Scope } from "../../interpeter/scope.js";
import { LambdaValue } from "../../interpeter/values/LambdaValue.js";
import { TupleValue } from "../../interpeter/values/TupleValue.js";
import { Value } from "../../interpeter/values/value.js";
import { CharRange } from "../../lexer/charinfo.js";
import { Node } from "../node.js";

const abstractApplication = async (target: Value, args: Value[], multipleDispatch: boolean, caller: Node, scope: Scope, frame: ContinuationFrame, callback: Continuation): Promise<Thunk> => {
    if(!(target instanceof LambdaValue)) {
        args = [target, ...args];
        target = scope.getVariable('infix*').value;
    }

    if(!(target instanceof LambdaValue)) throw new RuntimeError(ErrorType.UnexpectedType, `Implicit multiplication impossible, infix* redefined to non-lambda type!`);

    if(multipleDispatch) return target.multipleDispatch(args, caller, scope, frame, result => callback(result));
    else return target.singleDispatch(args[0], caller, scope, frame, result => {
        const newArgs = Array.from(args);
        newArgs.shift();
        if(newArgs.length == 0) return callback(result);
        else return abstractApplication(result, newArgs, false, caller, scope, frame, result => callback(result));
    });
}

export const runFunction = async (f: Value, a: Value, caller: Node, scope: Scope, frame: ContinuationFrame, callback: Continuation): Promise<Thunk> => {
    if(a instanceof TupleValue && f instanceof LambdaValue && f.signatures.some(s => s.destructures)) 
        return abstractApplication(f, a.values, true, caller, scope, frame, callback);
    else 
        return abstractApplication(f, [a], false, caller, scope, frame, callback);
}

export class FunctionApplicationNode extends Node {
    func: Node;
    arg: Node;

    constructor(func: Node, arg: Node, range: CharRange) {
        super(range);
        this.func = func;
        this.arg = arg;
    }

    toString(depth: number) {
        return `${this.func.toString(depth)} ${this.arg.toString(depth)}`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.func, scope, f => {
            return frame.eval(this.arg, scope, a => {
                return runFunction(f, a, this, scope, frame, callback);
            })
        });
    }
}