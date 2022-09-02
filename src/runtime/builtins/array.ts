// @ts-nocheck

import { runFunction } from "../../ast/nodes/lambda.js";
import { defaultPrimitives } from "../../interpeter/types/primitive.js";
import { ArrayValue } from "../../interpeter/values/ArrayValue.js";
import { IntegerValue } from "../../interpeter/values/IntegerValue.js";
import { LambdaValue } from "../../interpeter/values/LambdaValue.js";
import { TupleValue } from "../../interpeter/values/TupleValue.js";
import { createFunction } from "./builtins.js";

const int = defaultPrimitives['int'];
const array = defaultPrimitives['array'];
const lambda = defaultPrimitives['λ'];

const range = createFunction([
    [[int], array, ([size]: [IntegerValue], caller, scope, frame, callback) => {
        if(size.value >= 0n) {
            const len = Number(size.value);
            const arr = new Array(len);
            let i = len;
            while(i --> 0) arr[i] = new IntegerValue(BigInt(i));
            return callback(new ArrayValue(arr));
        } else {
            const len = Number(-size.value);
            const arr = new Array(len);
            let i = len;
            while(i --> 0) arr[i] = new IntegerValue(BigInt(i - len + 1));
            return callback(new ArrayValue(arr));
        }
    }]
])

const length = createFunction([
    [[array], int, ([arr]: [ArrayValue], caller, scope, frame, callback) => {
        return callback(new IntegerValue(BigInt(arr.items.length)));
    }]
])

const map = createFunction([
    [[array, lambda], array, ([arr, f]: [ArrayValue, LambdaValue], caller, scope, frame, callback) => {
        if(arr.items.length == 0) return callback(arr);
        const newArr: Value[] = [];
        const maxArgs = Math.max(...f.signatures.map(s => s.parameters.length));

        const iterateItems = (ind: number): Promise<Thunk> => {
            if(ind == arr.items.length) return callback(new ArrayValue(newArr));
            else {
                const callbackArgs: Value[] = [];
                switch(maxArgs) {
                    case 3 : callbackArgs.unshift(arr);
                    case 2 : callbackArgs.unshift(new IntegerValue(BigInt(ind)));
                    case 1 : callbackArgs.unshift(arr.items[ind]);
                }
                return runFunction(f, callbackArgs.length != 1 ? new TupleValue(callbackArgs) : callbackArgs[0], caller, scope, frame, result => {
                    newArr.push(result);
                    return iterateItems(ind + 1);
                })
            }
        };
        return iterateItems(0);
    }]
])

export default {
    range,
    length,
    map,
    'prefix#': range,
    'infix->': map
}

// defineFunction('length', [
//     [['array'], 'int', // @ts-ignore
//         (args: [ArrayValue], caller, frame, callback) =>
//             callback(new IntegerValue(BigInt(args[0].items.length)))
//     ],
//     [['string'], 'int', // @ts-ignore
//         (args: [StringValue], caller, frame, callback) =>
//             callback(new IntegerValue(BigInt(args[0].value.length)))
//     ]
// ])

// defineFunction('slice', [
//     [['array', 'int', 'int'], 'array', // @ts-ignore
//         (args: [ArrayValue, IntegerValue, IntegerValue], caller, frame, callback) => 
//             callback(new ArrayValue(args[0].items.slice(Number(args[1].value), Number(args[2].value))))
//     ]
// ])

// defineFunction('map', [
//     [['array', 'λ'], 'array', // @ts-ignore
//         (args: [ArrayValue, LambdaValue], caller, frame, callback) => {
//             if(args[0].items.length == 0) return callback(args[0]);
//             const newArr: Value[] = [];
//             const maxArgs = Math.max(...args[1].signatures.map(s => s.parameters.length));

//             const iterateItems = (ind: number): Promise<Thunk> => {
//                 if(ind == args[0].items.length) return callback(new ArrayValue(newArr));
//                 else {
//                     const callbackArgs: Value[] = [];
//                     switch(maxArgs) {
//                         case 3 : callbackArgs.unshift(args[0]);
//                         case 2 : callbackArgs.unshift(new IntegerValue(BigInt(ind)));
//                         case 1 : callbackArgs.unshift(args[0].items[ind]);
//                     }
//                     return args[1].multipleDispatch(callbackArgs, caller, frame, result => {
//                         newArr.push(result);
//                         return iterateItems(ind + 1);
//                     });
//                 }
//             };
//             return iterateItems(0);
//         }
//     ],
//     [['string', 'λ'], 'string', // @ts-ignore
//     (args: [StringValue, LambdaValue], caller, frame, callback) => {
//         let newstr: string = '';
//         const maxArgs = Math.max(...args[1].signatures.map(s => s.parameters.length));

//         const iterateItems = (ind: number): Promise<Thunk> => {
//             if(ind == args[0].value.length) return callback(new StringValue(newstr));
//             else {
//                 const callbackArgs: Value[] = [];
//                 switch(maxArgs) {
//                     case 3 : callbackArgs.unshift(args[0]);
//                     case 2 : callbackArgs.unshift(new IntegerValue(BigInt(ind)));
//                     case 1 : callbackArgs.unshift(new IntegerValue(BigInt(args[0].value.charCodeAt(ind))));
//                 }
//                 return args[1].multipleDispatch(callbackArgs, caller, frame, result => {
//                     // @ts-ignore
//                     newstr += String.fromCharCode(Number(result.weakCoerceTo(defaultPrimitives['int'], caller).value));
//                     return iterateItems(ind + 1);
//                 });
//             }
//         };
//         return iterateItems(0);
//     }
// ]
// ])

// defineFunction('fold-right', [
//     [['array', 'λ', 'any'], 'any', // @ts-ignore
//         ([array, cb, initial]: [ArrayValue, LambdaValue, Value], caller, frame, callback) => {
//             const maxArgs = Math.max(...cb.signatures.map(s => s.parameters.length));

//             const iterateItems = (ind: number, value: Value): Promise<Thunk> => {
//                 if(ind < 0n) return callback(value);
//                 else {
//                     const callbackArgs: Value[] = [];
//                     switch(maxArgs) {
//                         case 4 : callbackArgs.unshift(array);
//                         case 3 : callbackArgs.unshift(new IntegerValue(BigInt(ind)));
//                         case 2 : callbackArgs.unshift(array.items[ind]);
//                         case 1 : callbackArgs.unshift(value);
//                     }
//                     return cb.multipleDispatch(callbackArgs, caller, frame, result => {
//                         return iterateItems(ind - 1, result);
//                     })
//                 }
//             }
//             return iterateItems(array.items.length - 1, initial);
//         }
//     ]
// ])

// }