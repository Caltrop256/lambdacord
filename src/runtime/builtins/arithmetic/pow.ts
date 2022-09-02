import { ErrorType, RuntimeError } from "../../../interpeter/error.js";
import { factorize, RationalValue } from "../../../interpeter/values/RationalValue.js";

export const ratioPow = (b: RationalValue, e: RationalValue, approximate: boolean) => {
    const integerPow = (b: RationalValue, e: RationalValue) => {
        if(e.s == -1n) return new RationalValue((b.s * b.d) ** e.n, b.n ** e.n);
        else return new RationalValue((b.s * b.n) ** e.n, b.d ** e.n);
    }

    if(e.d == 1n) return integerPow(b, e);
    if(b.s == -1n) throw new RuntimeError(ErrorType.Arithmetic, `The result of (${b}^${e}) is complex!`);

    const handleIrrational = () => {
        if(!approximate) 
            throw new RuntimeError(ErrorType.Arithmetic, `The result of (${b}^${e}) is irrational and the ${b.type} type does not allow for approximation!`);
        if(!approximate) 
            throw new RuntimeError(ErrorType.Arithmetic, `The result of (${b}^${e}) is irrational and the ${e.type} type does not allow for approximation!`);

        const fApprox = Math.round(b.toJS() ** e.toJS());

        let lower: RationalValue;
        let upper: RationalValue;

        if(Number.isSafeInteger(fApprox)) {
            lower = RationalValue.fromFloat(fApprox - 1);
            upper = RationalValue.fromFloat(fApprox + 1);
        } else {
            lower = integerPow(b, new RationalValue(e.s * e.n / e.d, 1n));
            upper = integerPow(b, new RationalValue(e.s * e.n / e.d + 1n, 1n));
        }

        let rInt: RationalValue;
        let rFrac: RationalValue;

        // if 1 / e is not an integer
        if(e.n != 1n) {
            // TODO: add approximation when inversion is not an integer (maybe recursion?)
            return RationalValue.fromFloat(b.toJS() ** e.toJS());
        } else {
            rInt = new RationalValue(e.s * e.d, e.n);
            rFrac = new RationalValue(1n, 1n);
        }

        let ittr = 100;
        while(ittr --> 0) {
            // (lower + upper) / 2
            const mid = new RationalValue(
                lower.s * lower.n * upper.d + upper.s * lower.d * upper.n,
                lower.d * upper.d * 2n
            );
            // if mid^rInt < b
            const midP = integerPow(mid, rInt);
            if(midP.s * midP.n * b.d - b.s * b.n * midP.d < 0n) {
                lower = mid;
            } else {
                upper = mid;
            }
        }

        return new RationalValue(
            lower.s * lower.n * upper.d + upper.s * lower.d * upper.n,
            lower.d * upper.d * 2n
        );
    }

    const N = factorize(b.n);
    const D = factorize(b.d);

    let n = 1n;
    let d = 1n;
    
    for(let [k, Nk] of N) {
        if(k == 1n) continue;
        if(k == 0n) {
            n = 0n;
            break;
        }
        Nk *= e.n;
        if(Nk % e.d == 0n) Nk /= e.d;
        else return handleIrrational(); 
        n *= k ** Nk;
        N.set(k, Nk);
    }

    for(let [k, Dk] of D) {
        if(k == 1n) continue;
        Dk *= e.n;
        if(Dk % e.d == 0n) Dk /= e.d;
        else return handleIrrational();
        d *= k ** Dk;
        D.set(k, Dk);
    }

    if(e.s < 0n) return new RationalValue(d, n);
    else return new RationalValue(n, d);
}