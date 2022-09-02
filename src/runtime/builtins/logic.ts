// @ts-nocheck
import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { BooleanValue } from "../../interpeter/values/BooleanValue.js";
import { Value } from "../../interpeter/values/value.js";
import { createFunction } from "./builtins.js";

const any = defaultPrimitives['any'];
const bool = defaultPrimitives['bool'];

const not = createFunction([
    [[any], bool, ([v]: [Value], caller, scope, frame, callback) =>
        callback(new BooleanValue(!v.isTruthy()))
    ]
]);

const or = createFunction([
    [[any, any], any, ([v1, v2], caller, scope, frame, callback) =>
        callback(v1.isTruthy() ? v1 : v2)
    ]
])

const and = createFunction([
    [[any, any], any, ([v1, v2], caller, scope, frame, callback) =>
        callback(v1.isTruthy() ? v2 : v1)
    ]
])

export default {
    not, or, and,

    "prefix!": not,
    "infix||": or,
    "infix&&": and
}