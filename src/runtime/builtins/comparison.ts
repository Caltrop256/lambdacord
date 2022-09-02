// @ts-nocheck
import { runFunction } from "../../ast/nodes/lambda.js";
import { ErrorType, RuntimeError } from "../../interpeter/error.js";
import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { BooleanValue } from "../../interpeter/values/BooleanValue.js";
import { EnumValue } from "../../interpeter/values/EnumValue.js";
import { IntegerValue } from "../../interpeter/values/IntegerValue.js";
import { RationalValue } from "../../interpeter/values/RationalValue.js";
import { StringValue } from "../../interpeter/values/StringValue.js";
import { TupleValue } from "../../interpeter/values/TupleValue.js";
import { createFunction } from "./builtins.js";

const any = defaultPrimitives['any'];
const bool = defaultPrimitives['bool'];
const int = defaultPrimitives['int'];
const ratio = defaultPrimitives['ratio'];
const string = defaultPrimitives['string'];
const enum_t = defaultPrimitives['enum'];

const compare = createFunction([
    [[int, int], int, ([a, b]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(a.value - b.value))
    ],
    [[ratio, ratio], int, ([a, b]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(a.s * a.n * b.d - b.s * b.n * a.d))
    ],
    [[string, string], int, ([a, b]: [StringValue, StringValue], caller, scope, frame, callback) => {
        const l = a.value;
        const r = b.value;
        if(l == r) return callback(new IntegerValue(0n));
        const len = Math.max(l.length, r.length);
        for(let i = 0; i < len; ++i) {
            const lc = l.charCodeAt(i);
            const rc = r.charCodeAt(i);
            if(lc != lc) return callback(new IntegerValue(BigInt(-rc)));
            if(rc != rc) return callback(new IntegerValue(BigInt(lc)));
            if(lc != rc) return callback(new IntegerValue(BigInt(lc - rc)));
        }
    }],
    [[enum_t, enum_t], int, ([a, b]: [EnumValue, EnumValue], caller, scope, frame, callback) =>{
        if(!a.type.is(b.type)) throw new RuntimeError(ErrorType.Enum, `Can not compare two different Enum Types (${a.type} & ${b.type})!`);
        return callback(new IntegerValue(BigInt(a.value.discriminant - b.value.discriminant)));
    }]
])

const createComparison = (cond: (x: bigint) => boolean) => createFunction([
    [[any, any], bool, (args, caller, scope, frame, callback) =>
        runFunction(compare, new TupleValue(args), caller, scope, frame, res =>
            callback(new BooleanValue(cond(res.value))))
    ]
]);

const equals = createComparison(x => x == 0n);
const notEqual = createComparison(x => x != 0n);
const lessThan = createComparison(x => x < 0n);
const lessThanOrEqual = createComparison(x => x <= 0n);
const greaterThan = createComparison(x => x > 0n);
const greaterThanOrEqual = createComparison(x => x >= 0n);

export default {
    compare,
    equals,
    'not-equal': notEqual,
    'less-than': lessThan,
    'less-than-or-equals': lessThanOrEqual,
    'greater-than': greaterThan,
    'greater-than-or-equals': greaterThanOrEqual,

    'infix==': equals,
    'infix!=': notEqual,
    'infix<': lessThan,
    'infix<=': lessThanOrEqual,
    'infix>': greaterThan,
    'infix>=': greaterThanOrEqual
}
