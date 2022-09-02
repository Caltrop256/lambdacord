// import { ErrorType, RuntimeError } from "../../interpeter/error.js";
// import { IntegerValue } from "../../interpeter/values/IntegerValue.js";
// import { StringValue } from "../../interpeter/values/StringValue.js";
// import { defineFunction, defineSymmetricalInfix } from "./builtins.js";


// export const __load_string = () => {

// defineSymmetricalInfix('repeat', [
//     [['int', 'string'], 'string', // @ts-ignore
//         (args: [IntegerValue, StringValue], caller, frame, callback) => {
//             if(args[0].value < 0n) throw new RuntimeError(ErrorType.Range, `String can not be repeated less than 0 (${args[0].value}) times!`);
//             let n = args[0].value;
//             let res = '';
//             while(n --> 0n) res += args[1].value;
//             return callback(new StringValue(res));
//         }
//     ]
// ])

// defineFunction('concatenate', [
//     [['string', 'string'], 'string', // @ts-ignore
//         (args: [StringValue, StringValue], caller, frame, callback) =>
//             callback(new StringValue(args[0].value + args[1].value))
//     ]
// ])

// }