// @ts-nocheck
import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { LambdaParameter, LambdaSignature, LambdaValue } from "../../interpeter/values/LambdaValue.js";
import { StringValue } from "../../interpeter/values/StringValue.js";
import { TupleValue } from "../../interpeter/values/TupleValue.js";
import { createFunction } from "./builtins.js";


const echo = new LambdaValue(new LambdaSignature(
    [new LambdaParameter(defaultPrimitives['any'])],
    defaultPrimitives['any'],
    false,
    (args, caller, scope, frame, callback) => {
        if(args[0] instanceof TupleValue) args = args[0].values;
        const str = args
            .map(v => {
                if(v instanceof StringValue) return v.value;
                return v.toString(); 
            })
            .join(' ');
        console.log(str);
        if(args.length == 1) return callback(args[0]);
        else return callback(new TupleValue(args));
    }
))

export default {
    echo
}