import { runFunction } from "../../ast/nodes/lambda.js";
import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { ExternalFunction, LambdaParameter, LambdaSignature, LambdaValue } from "../../interpeter/values/LambdaValue.js";
import { TupleValue } from "../../interpeter/values/TupleValue.js";
import { createFunction } from "./builtins.js";

const createCombinator = (len: number, func: ExternalFunction) => new LambdaValue(
    new LambdaSignature(new Array(len).fill(new LambdaParameter(defaultPrimitives['any'])), defaultPrimitives['any'], false, func)
);
// λx.x
const I = createCombinator(1, ([x], caller, scope, frame, callback) =>
    callback(x));
// λx.λy.x
const K = createCombinator(2, ([x, y], caller, scope, frame, callback) =>
    callback(x));
// λx.λy.y
const KI = createCombinator(2, ([x, y], caller, scope, frame, callback) =>
    callback(y));
// λf.λx.f x
const A = createCombinator(2, ([f, x], caller, scope, frame, callback) =>
    runFunction(f, x, caller, scope, frame, callback));
// λx.λf.f x
const T = createCombinator(2, ([x, f], caller, scope, frame, callback) =>
    runFunction(f, x, caller, scope, frame, callback));
// λf.λx.λy.f y x
const C = createCombinator(3, ([f, x, y], caller, scope, frame, callback) =>
    runFunction(f, y, caller, scope, frame, f0 =>
        runFunction(f0, x, caller, scope, frame, callback)));
// λf.λx.f x x
const W = createCombinator(2, ([f, x], caller, scope, frame, callback) =>
    runFunction(f, x, caller, scope, frame, f0 =>
        runFunction(f0, x, caller, scope, frame, callback)));
// λf.λg.λx.f (g x)
const B = createCombinator(3, ([f, g, x], caller, scope, frame, callback) =>
    runFunction(g, x, caller, scope, frame, res =>
        runFunction(f, res, caller, scope, frame, callback)));
// λf.f f
const M = createCombinator(1, ([f], caller, scope, frame, callback) =>
    frame.stagger(f, f => runFunction(f, f, caller, scope, frame, callback)));
// λf.λg.λx.f x (g x)
const S = createCombinator(3, ([f, g, x], caller, scope, frame, callback) =>
    runFunction(g, x, caller, scope, frame, res =>
        runFunction(f, new TupleValue([x, res]), caller, scope, frame, callback)));
// λf.(λx.f(λv.x x v))(λx.f(λv.x x v))
// technically a Z combinator but who cares;;;;
const Y = createCombinator(1, ([f], caller, scope, frame, callback) => {
    const t = createCombinator(1, ([x], caller, scope, frame, callback) =>
        runFunction(f, createCombinator(1, ([v], caller, scope, frame, callback) =>
            runFunction(x, new TupleValue([x, v]), caller, scope, frame, callback)), caller, scope, frame, callback));
    return runFunction(t, t, caller, scope, frame, callback);
})

const any = defaultPrimitives['any'];
const lambda = defaultPrimitives['λ'];
const callWithCurrentContinuation = createFunction([
    // @ts-ignore
    [[lambda], any, ([f]: [LambdaValue], caller, scope, frame, callback) => 
        runFunction(f, createCombinator(
            1,
            ([x], caller, scope, frame, __callback) => 
                callback(x)
        ), caller, scope, frame, callback)
    ]
])

export default {
    I, K, KI, A, T, C, W, B, M, S, Y,
    'call/cc': callWithCurrentContinuation
}