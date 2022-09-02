// @ts-nocheck
import { ErrorType, RuntimeError } from "../../../interpeter/error.js";
import { DerivativeTypeInfo } from "../../../interpeter/types/derivative.js";
import { defaultPrimitives } from "../../../interpeter/types/primitive.js";
import { ArrayValue } from "../../../interpeter/values/ArrayValue.js";
import { BooleanValue } from "../../../interpeter/values/BooleanValue.js";
import { IntegerValue } from "../../../interpeter/values/IntegerValue.js";
import { gcd as bigIntGcd, RationalValue } from "../../../interpeter/values/RationalValue.js";
import { StringValue } from "../../../interpeter/values/StringValue.js";
import { createFunction } from "../builtins.js";
import { ratioPow } from "./pow.js";

const bool = defaultPrimitives['bool'];
const int = defaultPrimitives['int'];
const ratio = defaultPrimitives['ratio'];
const string = defaultPrimitives['string'];
const array = defaultPrimitives['array'];
const ratioStrict = new DerivativeTypeInfo('ratio-strict', ratio);

const Pi = new RationalValue(5419351n, 1725033n);

const abs = createFunction([
    [[int], int, ([n]: [IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value < 0n ? -n.value : n.value))
    ],
    [[ratio], ratio, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(new RationalValue(x.n, x.d))
    ]
]);

const sign = createFunction([
    [[int], int, ([n]: [IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value < 0n ? -1n : n.value > 0n ? 1n : 0n))
    ],
    [[ratio], int, ([x]: [RationalValue], caller, scope, frame, callback) => 
        callback(new IntegerValue(x.n == 0n ? 0n : x.s))
    ]
])

const add = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value + m.value))
    ],
    [[ratio, ratio], ratio, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(new RationalValue(
            x.s * x.n * y.d + y.s * x.d * y.n,
            x.d * y.d
        ))
    ],
    [[string, string], string, ([str1, str2]: [StringValue, StringValue], caller, scope, frame, callback) => 
        callback(new StringValue(str1.value + str2.value))
    ]
])

const sub = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value - m.value))
    ],
    [[ratio, ratio], ratio, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(new RationalValue(
            x.s * x.n * y.d - y.s * x.d * y.n,
            x.d * y.d
        ))
    ]
])

const mult = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(n.value * m.value))
    ],
    [[ratio, ratio], ratio, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(new RationalValue(
            x.s * y.s * x.n * y.n,
            x.d * y.d            
        ))
    ],
    [[int, string], string, ([x, str]: [IntegerValue, StringValue], caller, scope, frame, callback) => {
        if(x.value < 0n) throw new RuntimeError(ErrorType.Range, `String can not be repeated less than 0 (${x.value}) times!`);
        let n = x.value;
        let res = '';
        while(n --> 0n) res += str.value;
        return callback(new StringValue(res));
    }]
])

const div = createFunction([
    [[int, int], ratio, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) => {
        if(m.value == 0n) throw new RuntimeError(ErrorType.Arithmetic, `Division by zero (${n} / ${m})!`);
        return callback(new RationalValue(n.value, m.value));
    }],
    [[ratio, ratio], ratio, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) => {
        if(y.n == 0n) throw new RuntimeError(ErrorType.Arithmetic, `Division by zero (${x} / ${y})!`);
        return callback(new RationalValue(
            x.s * y.s * x.n * y.d,
            x.d * y.n
        ));
    }]
])

const integerDivision = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) => {
        if(m.value == 0n) throw new RuntimeError(ErrorType.Arithmetic, `Division by zero (${n} / ${m})!`);
        return callback(new IntegerValue(n.value / m.value));
    }]
])

const mod = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) => {
        if(m.value == 0n) throw new RuntimeError(ErrorType.Arithmetic, `Division by zero (${n} / ${m})!`);
        return callback(new IntegerValue(n.value % m.value))
    }],
    [[ratio, ratio], ratio, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) => {
        if(y.n == 0n) throw new RuntimeError(ErrorType.Arithmetic, `Division by zero (${x} / ${y})!`);
        return callback(new RationalValue(
            x.s * (y.d * x.n) % (y.n * x.d),
            x.d * y.d
        ));
    }]
])

const pow = createFunction([
    [[int, int], int, ([b, e]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(b.value ** e.value))
    ],
    [[ratio, ratio], ratio, ([b, e]: [RationalValue, RationalValue], caller, scope, frame, callback) => 
        callback(ratioPow(b, e, true))
    ],
    [[ratioStrict, ratioStrict], ratioStrict, ([b, e]: [RationalValue, RationalValue], caller, scope, frame, callback) => 
        callback(ratioPow(b, e, false))
    ]
])

const root = createFunction([
    [[ratio, ratio], ratio, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(y, new RationalValue(x.s * x.d, x.n), true))
    ],
    [[ratioStrict, ratioStrict], ratioStrict, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(y, new RationalValue(x.s * x.d, x.n), false))
    ]
])

const sqrt = createFunction([
    [[ratio], ratio, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(x, new RationalValue(1n, 2n), true))
    ],
    [[ratioStrict], ratioStrict, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(x, new RationalValue(1n, 2n), false))
    ]
])

const cbrt = createFunction([
    [[ratio], ratio, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(x, new RationalValue(1n, 3n), true))
    ],
    [[ratioStrict], ratioStrict, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(x, new RationalValue(1n, 3n), false))
    ]
])

const qdrt = createFunction([
    [[ratio], ratio, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(x, new RationalValue(1n, 4n), true))
    ],
    [[ratioStrict], ratioStrict, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(ratioPow(x, new RationalValue(1n, 4n), false))
    ]
])

const negate = createFunction([
    [[int], int, ([n]: [IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(-n.value))
    ],
    [[ratio], ratio, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(new RationalValue(-x.s * x.n, x.d))
    ]
])

const invert = createFunction([
    [[ratio], ratio, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(new RationalValue(x.s * x.d, x.n))
    ]
])

const fact = createFunction([
    [[int], int, ([n]: [IntegerValue], caller, scope, frame, callback) => {
        if(n.value < 0n) throw new RuntimeError(ErrorType.Arithmetic, `Can not perform factorial operation on negative number (${n})!`);
        switch(n.value) {
            case 0n :
            case 1n :
                return callback(new IntegerValue(1n));
            case 2n :
                return callback(new IntegerValue(2n));
            default :
                let i = n.value;
                let acc = 1n;
                while(i --> 1n) acc += acc * i;
                return callback(new IntegerValue(acc));
        }
    }]
])

const gcd = createFunction([
    [[int, int], int, ([n, m]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(bigIntGcd(n.value, m.value)))
    ],
    [[ratio, ratio], ratio, ([x, y]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(new RationalValue(
            bigIntGcd(y.n, x.n) * bigIntGcd(y.d, x.d),
            y.d * x.d
        ))
    ]
])

const continuedFraction = createFunction([
    [[ratio], array, ([x]: [RationalValue], caller, scope, frame, callback) => {
        let a = x.n;
        let b = x.d;
        let values: IntegerValue[] = [];

        do {
            values.push(new IntegerValue(a / b));
            let x = a % b;
            a = b;
            b = x;
        } while(a != 1n);
        
        return callback(new ArrayValue(values));
    }]
])

const floor = createFunction([
    [[ratio, int], ratio, ([r, places]: [RationalValue, IntegerValue], caller, scope, frame, callback) => {
        if(places.value < 0n) throw new RuntimeError(ErrorType.Arithmetic, `Can not round to negative places (${places.value})!`);
        const p = 10n ** places.value;
        return callback(new RationalValue(
            r.s * p * r.n / r.d - (p * r.n % r.d > 0n && r.s < 0n ? 1n : 0n),
            p
        ));
    }],
    [[ratio], int, ([r]: [RationalValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(r.s * r.n / r.d - (r.n % r.d > 0n && r.s < 0n ? 1n : 0n)))
    ]
]);

const ceil = createFunction([
    [[ratio, int], ratio, ([r, places]: [RationalValue, IntegerValue], caller, scope, frame, callback) => {
        if(places.value < 0n) throw new RuntimeError(ErrorType.Arithmetic, `Can not round to negative places (${places.value})!`);
        const p = 10n ** places.value;
        return callback(new RationalValue(
            r.s * p * r.n / r.d + (p * r.n % r.d > 0n && r.s >= 0n ? 1n : 0n),
            p
        ));
    }],
    [[ratio], int, ([r]: [RationalValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(r.s * r.n / r.d + (r.n % r.d > 0n && r.s >= 0n ? 1n : 0n)))
    ]
]);

const round = createFunction([
    [[ratio, int], ratio, ([r, places]: [RationalValue, IntegerValue], caller, scope, frame, callback) => {
        if(places.value < 0n) throw new RuntimeError(ErrorType.Arithmetic, `Can not round to negative places (${places.value})!`);
        const p = 10n ** places.value;
        return callback(new RationalValue(
            r.s * p * r.n / r.d + (p * r.n % r.d > 0n && r.s >= 0n ? 1n : 0n),
            p
        ));
    }],
    [[ratio], int, ([r]: [RationalValue], caller, scope, frame, callback) =>
        callback(new IntegerValue(r.s * r.n / r.d + r.s * ((r.s >= 0n ? 1n : 0n) + 2n * (r.n % r.d) > r.d ? 1n : 0n)))
    ]
]);

const divides = createFunction([
    [[int, int], bool, ([m, n]: [IntegerValue, IntegerValue], caller, scope, frame, callback) =>
        callback(new BooleanValue(n.value % m.value == 0))
    ],
    [[ratio, ratio], bool, ([y, x]: [RationalValue, RationalValue], caller, scope, frame, callback) =>
        callback(new BooleanValue(!(!(y.n * x.d) || ((x.n * y.d) % (y.n * x.d)))))
    ]
])

const isOdd = createFunction([
    [[int], bool, ([n]: [IntegerValue], caller, scope, frame, callback) =>
        callback(new BooleanValue(n.value % 2n != 0n))
    ],
    [[ratio], bool, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(new BooleanValue((!(2n * x.d) || (x.n % (2n * x.d)))))
    ]
])

const isEven = createFunction([
    [[int], bool, ([n]: [IntegerValue], caller, scope, frame, callback) =>
        callback(new BooleanValue(n.value % 2n == 0n))
    ],
    [[ratio], bool, ([x]: [RationalValue], caller, scope, frame, callback) =>
        callback(new BooleanValue(!(!(2n * x.d) || (x.n % (2n * x.d)))))
    ]
])


export default {
    'ratio-strict': ratioStrict,
    Pi,
    abs, sign, add, sub, mult, div, mod, pow, root, sqrt, cbrt, qdrt, negate, invert, fact, gcd, floor, ceil, round,
    'int-div': integerDivision,
    'continued-fraction': continuedFraction,

    'divides?': divides,
    'odd?': isOdd,
    'even?': isEven,

    'infix+': add,
    'infix-': sub,

    'infix*': mult,
    'infix/': div,
    'infix//': integerDivision,
    'infix%': mod,

    'infix**': pow,
    'infix√': root,
    'prefix√': sqrt,
    'prefix∛': cbrt,
    'prefix∜': qdrt,

    'prefix-': negate,
    'postfix!': fact
}