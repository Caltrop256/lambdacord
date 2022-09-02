// @ts-nocheck
import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { IntegerValue } from "../../interpeter/values/IntegerValue.js";
import { createFunction } from "./builtins.js";

const int = defaultPrimitives['int'];

const shiftRight = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value >> m.value))
    ]
]);

const shiftLeft = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value << m.value))
    ]
]);

const bitwiseOr = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value | m.value))
    ]
]);

const bitwiseAnd = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value & m.value))
    ]
]);

const bitwiseXor = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value ^ m.value))
    ]
]);

const bitwiseNegate = createFunction([
    [[int], int, ([n]: [IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(~n.value))
    ]
]);

export default {
    'shift-right': shiftRight,
    'shift-left': shiftLeft,
    'bitwise-or': bitwiseOr,
    'bitwise-and': bitwiseAnd,
    'xor': bitwiseXor,
    'bitwise-negate': bitwiseNegate,

    'infix>>': shiftRight,
    'infix<<': shiftLeft,
    'infix|': bitwiseOr,
    'infix&': bitwiseAnd,
    'infix^': bitwiseXor,
    'prefix^': bitwiseNegate
}