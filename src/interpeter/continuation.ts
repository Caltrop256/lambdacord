import { Node } from "../ast/node.js";
import { Colors } from "../colors.js";
import { CharRange } from "../lexer/charinfo.js";
import { ModuleContainer } from "../runtime/ModuleContainer.js";
import { ErrorType, RuntimeError, TransmittedError } from "./error.js";
import { Scope } from "./scope.js";
import { TupleValue } from "./values/TupleValue.js";
import { Value } from "./values/value";

export type Thunk = (() => Promise<Thunk>) | null;
export type Continuation = (value: Value) => Promise<Thunk>;

export class ContinuationFrame {
    stackDepth: number = 0;
    maxStackDepth: number;

    lastValue: Value = new TupleValue([]);
    callStack: CharRange[] = [];

    module: ModuleContainer;

    constructor(module: ModuleContainer, maxStackDepth: number) {
        this.module = module;
        this.maxStackDepth = maxStackDepth;
    }

    async stagger(value: Value, continuation: Continuation): Promise<Thunk> {
        this.stackDepth += 1;
        this.lastValue = value;
        if(this.stackDepth >= this.maxStackDepth) {
            this.stackDepth = 0;
            const thunk: Thunk = (): Promise<Thunk> => continuation(value);
            return thunk;
        } else return await continuation(value);
    }

    async eval(node: Node, scope: Scope, continuation: Continuation): Promise<Thunk> {
        try {
            return await node.eval(this, scope, async (value: Value): Promise<Thunk> => this.stagger(value, continuation));
        } catch(err) {
            if(err instanceof TransmittedError) throw err;
            let error;
            if(!(err instanceof RuntimeError)) {
                if(err instanceof Error) error = new RuntimeError(ErrorType.Internal, err.stack ?? err.message);
                else error = new RuntimeError(ErrorType.Internal, `${err}`);
            } else error = err;
            const callstack = `\n\n\t${Colors.Red}Stack Trace:${Colors.Reset}\n\t${this.callStack.splice(0, 30).map(c => c.toString()).join('\n\t')}`;
            throw new TransmittedError(node.range, error, callstack);
        }
    }
}