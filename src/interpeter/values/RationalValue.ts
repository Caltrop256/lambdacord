import { ErrorType, RuntimeError } from "../error.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TypeInfo } from "../types/type.js";
import { BooleanValue } from "./BooleanValue.js";
import { IntegerValue } from "./IntegerValue.js";
import { StringValue } from "./StringValue.js";
import { Value } from "./value.js";

const abs = (n: bigint) => n < 0n ? -n : n;
const sign = (n: bigint) => n < 0n ? -1n : n > 0n ? 1n : 0n;
export const gcd = (a: bigint, b: bigint) => {
    if(a == 0n) return b;
    if(b == 0n) return a;

    for(;;) {
        a %= b;
        if(a == 0n) return b;
        b %= a;
        if(b == 0n) return a;
    }
}
export const factorize = (num: bigint) => {
    const factors: Map<bigint, bigint> = new Map();
    let n = num;
    let i = 2n;
    let s = 4n;

    while(s <= n) {
        while(n % i == 0n) {
            n /= i;
            factors.set(i, (factors.get(i) || 0n) + 1n);
        }
        s += 2n * i + 1n;
        i += 1n;
    }

    if(n != num) {
        if(n > 1n) factors.set(n, (factors.get(n) || 0n) + 1n);
    } else factors.set(num, (factors.get(num) || 0n) + 1n);
    return factors;
}

const maxLen = 117n;

const getCycleLength = (d: bigint) => {
    while(d % 2n == 0n) d /= 2n;
    while(d % 5n == 0n) d /= 5n;

    if(d == 1n) return 0n;

    let rem = 10n % d;
    let t = 1n;
    while(rem != 1n) {
        if(t >= maxLen) return 0n;
        rem = rem * 10n % d;
        t += 1n;
    }
    return t;
}

const getCycleOffset = (d: bigint, length: bigint) => {
    let rem1 = 1n;
    let rem2 = 1n;

    let b = 10n;
    let e = length;
    while(e > 0n) {
        if (e & 1n) rem2 = (rem2 * b) % d;
        b = (b * b) % d;
        e >>= 1n;
    }

    let t = 0n;
    for(;;) {
        if(rem1 == rem2) return t;
        rem1 = rem1 * 10n % d;
        rem2 = rem2 * 10n % d;
        t += 1n
    }
}

type RatioSign = 1n | -1n;

export class RationalValue extends Value {
    s: RatioSign;
    n: bigint;
    d: bigint;

    constructor(numerator: bigint, denominator: bigint, type?: TypeInfo) {
        super(type ?? defaultPrimitives['ratio']);

        if(denominator == 0n) throw new RuntimeError(ErrorType.Internal, 'Division by 0 on fraction creation');

        this.s = sign(numerator * denominator) || 1n;
        this.n = abs(numerator);
        this.d = abs(denominator);

        const c = gcd(this.n, this.d);
        this.n /= c;
        this.d /= c;
    }

    static fromComponents(mantissa: bigint, characteristic: string, cyclic: string) {
        const characteristicDenom = characteristic.length ? (10n ** BigInt(characteristic.length)) : 1n;
        const cyclicDenom = (10n ** BigInt(cyclic.length) - 1n) || 1n;

        const denominator = characteristicDenom * cyclicDenom;
        const numerator = BigInt(cyclic) + denominator * mantissa + cyclicDenom * BigInt(characteristic);

        return new RationalValue(numerator, denominator);
    }

    static fromFloat(x: number) {
        if(!isFinite(x)) throw new Error(`Can't represent ${x} as rational value!`);
        let n = x;
        let d = 1n;

        while(Math.trunc(n) != n) {
            n *= 10;
            d *= 10n;
        }

        return new RationalValue(BigInt(n), d);
    }

    isTruthy(): boolean {
        return this.n != 0n;
    }

    toJS(): number {
        return Number(this.s * this.n) / Number(this.d);
    }

    toString(): string {
        let str = '';
        if(this.s == -1n) str += '-';

        let n = this.n;
        let d = this.d;

        const cycleLength = getCycleLength(d);

        str += n / d;
        n %= d;
        n *= 10n;

        if(n != 0n) str += '.';

        if(cycleLength != 0n) {
            const cycleIndex = getCycleOffset(d, cycleLength);
            let i = cycleIndex;
            while(i --> 0) {
                str += n / d;
                n %= d;
                n *= 10n;
            }
            i = cycleLength;
            while(i --> 0) {
                str += (n / d) + String.fromCharCode(773);
                n %= d;
                n *= 10n;
            }
        } else {
            let i = maxLen;
            while(n != 0n && i --> 0) {
                str += n / d;
                n %= d;
                n *= 10n;
            }
            if(n != 0n) str += '[...]';
        }

        return str;
    }
    clone(type: TypeInfo = this.type): Value {
        return new RationalValue(this.s * this.n, this.d, type);
    }

    weakCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(defaultPrimitives['bool'].equals(target)) return target.apply(new BooleanValue(this.n != 0n));

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(target.equals(defaultPrimitives['bool'])) return target.apply(new BooleanValue(this.n != 0n));
        if(target.equals(defaultPrimitives['int'])) return target.apply(new IntegerValue(this.s * this.n / this.d));
        if(target.equals(defaultPrimitives['string'])) return target.apply(new StringValue(this.toString()));

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }
}