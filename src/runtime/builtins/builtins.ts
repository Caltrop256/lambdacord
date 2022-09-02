import { TypeInfo } from "../../interpeter/types/type.js";
import { ExternalFunction, LambdaParameter, LambdaSignature, LambdaValue } from "../../interpeter/values/LambdaValue.js";


export const createFunction = (f: [TypeInfo[], TypeInfo, ExternalFunction][]) => {
    return new LambdaValue(...f.map(s => {
        const matches = s[2].toString().match(/^\(\[(.+)\]/);
        const argnames = matches && matches[1] ? matches[1].split(/\s*,\s*/) : [];
        return new LambdaSignature(
            s[0].map((p, i) => new LambdaParameter(p, argnames[i])),
            s[1],
            true,
            s[2]
        );    
    }));
};