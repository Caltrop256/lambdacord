import { parse } from "../ast/parser.js";
import { ParseState } from "../ast/parser/util.js";
import { Colors } from "../colors.js";
import { ContinuationFrame, Thunk } from "../interpeter/continuation.js";
import { ErrorType, RuntimeError, TransmittedError } from "../interpeter/error.js";
import { Scope } from "../interpeter/scope.js";
import { Value } from "../interpeter/values/value.js";
import { CharStream } from "../lexer/charstream.js";
import { Lexer } from "../lexer/lexer.js";
import { ModuleContainer } from "./ModuleContainer.js";
import { IntegerValue } from "../interpeter/values/IntegerValue.js";
import { BooleanValue } from "../interpeter/values/BooleanValue.js";
import { RationalValue } from "../interpeter/values/RationalValue.js";
import { TupleValue } from "../interpeter/values/TupleValue.js";
import { StructField, StructValue } from "../interpeter/values/StructValue.js";
import { StringValue } from "../interpeter/values/StringValue.js";
import { defaultPrimitives } from "../interpeter/types/primitive.js";
import { ArrayValue } from "../interpeter/values/ArrayValue.js";
import { Namespace } from "../interpeter/namespace.js";

import * as ARITHMETIC from './builtins/arithmetic/arithmetic.js';
import * as ARRAY from './builtins/array.js';
import * as BITWISE from './builtins/bitwise.js';
import * as COMBINATORS from './builtins/combinators.js'
import * as COMPARISON from './builtins/comparison.js'
import * as CONSOLE from './builtins/console.js'
import * as LOGIC from './builtins/logic.js'

export class Runtime {
    modules: Map<string, ModuleContainer | Namespace> = new Map();

    constructor() {
        const items: [string, any][] = [
            ['std::arithmetic', ARITHMETIC.default],
            ['std::array', ARRAY.default],
            ['std::bitwise', BITWISE.default],
            ['std::combinators', COMBINATORS.default],
            ['std::comparison', COMPARISON.default],
            ['std::console', CONSOLE.default],
            ['std::logic', LOGIC.default]
        ];
        for(const [key, val] of items) this.modules.set(key, Namespace.fromBuiltInModule(key, val));
    }

    createModule(stream: CharStream) {
        if(this.modules.has(stream.location)) throw new Error(`INTERNAL ERROR: module ${stream.location} already exists!`);
        const lexer = new Lexer(stream);
        const result: ParseState = parse(lexer);

        if(result.errors.length) {
            for(const error of result.errors) {
                console.log(`${Colors.Red}[${error.ind.toString().padStart(result.errors.length.toString().length, '0')}]${error.error.token.range}${Colors.Reset}\t${error.error.message}`);
            }
        }

        const module = new ModuleContainer(stream.location, new Scope(), result, [...this.modules.values()].map(v => v instanceof ModuleContainer ? v.exports : v));

        console.log(result.AST.toString(0));

        this.modules.set(module.location, module);
    }

    runModuleSync(location: string) {
        return new Promise(async (resolve: (value: Value) => void, reject) => {
            const module = this.modules.get(location);
            if(!module) throw new Error(`INTERNAL ERROR: No such module: ${location}!`);
            if(!(module instanceof ModuleContainer)) throw new Error(`INTERNAL ERROR: tried to execute static / internal module!`);
            const frame = new ContinuationFrame(module, 100);
            const finalCallback = async (value: Value): Promise<null> => {
                resolve(value);
                return null;
            }
    
            try {
                let thunkPromise = frame.eval(module.AST, new Scope(module.scope), finalCallback);
                let thunk: Thunk;
                while(thunk = await thunkPromise) thunkPromise = thunk();
            } catch(err) {
                if(err instanceof TransmittedError) return reject(err);
                else if(err instanceof Error) throw new Error(`INTERNAL ERROR: ${err.stack}`);
                else throw new Error(`INTERNAL ERROR: ${err}`);
            }
        });
    }

    createValueFromJS(jsVal: any): Value {
        switch(typeof jsVal) {
            case 'bigint' : return new IntegerValue(jsVal);
            case 'boolean' : return new BooleanValue(jsVal);
            case 'function' : throw new RuntimeError(ErrorType.UnexpectedType, `Cant convert jsfunc to lambda!`);
            case 'number' : 
                if(!isFinite(jsVal)) throw new RuntimeError(ErrorType.Arithmetic, `Unable to represent abstract float value ${jsVal}!`);
                if(Number.isSafeInteger(jsVal)) return new IntegerValue(BigInt(jsVal));
                return RationalValue.fromFloat(jsVal);
            case 'object' :
                if(jsVal == null) return new TupleValue([]);
                if(Array.isArray(jsVal)) {
                    return new ArrayValue(jsVal.map(js => this.createValueFromJS(js)));
                }

                const fields: Map<string, StructField> = new Map();
                for(const k in jsVal) {
                    const val = this.createValueFromJS(jsVal[k]);
                    fields.set(k, new StructField(k, val.type, false, val, null));
                }
                return new StructValue(fields, defaultPrimitives['struct']);
            case 'string' : return new StringValue(jsVal);
            case 'symbol' : return new StringValue(jsVal.toString());
            case 'undefined' : return new TupleValue([]);
        }
    }
}