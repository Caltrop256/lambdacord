// import { Thunk } from "../../interpeter/continuation.js";
// import { ErrorType, RuntimeError } from "../../interpeter/error.js";
// import { defaultPrimitives } from "../../interpeter/types/primitive.js";
// import { BooleanValue } from "../../interpeter/values/BooleanValue.js";
// import { ExternalFunction, LambdaParameter, LambdaSignature, LambdaValue } from "../../interpeter/values/LambdaValue.js";
// import { Value } from "../../interpeter/values/value.js";
// import { defineFunction } from "./builtins.js";

// export const __load_lambda = () => {

// defineFunction('compose', [
//     [['λ', 'λ'], 'λ', // @ts-ignore
//         (args: [LambdaValue, LambdaValue], caller, scope, frame, callback) => {
//             const f = args[0];
//             const g = args[1];

//             const body: ExternalFunction = (args, caller, frame, callback) => 
//                 g.multipleDispatch(args, caller, frame, result => 
//                     f.singleDispatch(result, caller, frame, finalResult =>
//                         callback(finalResult)
//                     )    
//                 );

//             const signatures = g.signatures.map(s => {
//                 s = s.clone();
//                 s.returnType = defaultPrimitives['any'];
//                 s.body = body;
//                 return s;
//             });

//             return callback(new LambdaValue(...signatures));
//         }
//     ]
// ])

// defineFunction('coalesce', [
//     [['λ', 'λ'], 'λ', // @ts-ignore
//         (args: [LambdaValue, LambdaValue], caller, frame, callback) =>
//             callback(LambdaValue.coalesce(...args))
//     ]
// ])

// defineFunction('church-iterate', [
//     [['int', 'λ'], 'λ', // @ts-ignore
//         (args: [IntegerValue, LambdaValue], caller, frame, callback) => {
//             const num = args[0].value;
//             if(num < 0n) throw new RuntimeError(ErrorType.Dispatch, `Can not repeat a function negative (${num}) times!`);
//             const foreignFunction = args[1];
//             return callback(new LambdaValue(new LambdaSignature(
//                 [new LambdaParameter(defaultPrimitives['any'])],
//                 defaultPrimitives['any'],
//                 (args: Value[], caller, frame, callback) => {                    
//                     let temp = args[0];
//                     const loop = (n: bigint): Promise<Thunk> => {
//                         if(n == num) return callback(temp);
//                         else return foreignFunction.singleDispatch(temp, caller, frame, result => {
//                             temp = result;
//                             return loop(n + 1n);
//                         })
//                     }
//                     return loop(0n);
//                 }
//             )))
//         }
//     ],
//     [['bool', 'any', 'any'], 'any', // @ts-ignore
//         (args: [BooleanValue, Value, Value], caller, frame, callback) =>
//             callback(args[0].value ? args[1] : args[2])
//     ]
// ])

// defineFunction('call/cc', [
//     [['λ'], 'any', // @ts-ignore
//         (args: [LambdaValue], caller, frame, callback) =>
//             args[0].multipleDispatch([new LambdaValue(new LambdaSignature(
//                 [new LambdaParameter(defaultPrimitives['any'])],
//                 defaultPrimitives['any'],
//                 (args: Value[], caller, frame, __callback) => {
//                     return callback(args[0]);
//                 }
//             ))], caller, frame, result => callback(result))
//     ]
// ])

// }