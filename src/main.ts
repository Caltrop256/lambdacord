import { CharStream } from "./lexer/charstream.js";
import { Colors } from "./colors.js";
import { Runtime } from "./runtime/runtime.js";

const [,,filePath] = process.argv;

if(!filePath) {
    console.error(`${Colors.Red}Please specify a file to run!${Colors.Reset}`);
    process.exit(0);
}

const runtime = new Runtime();
const stream = CharStream.fromFilePath(filePath);
runtime.createModule(stream);
runtime.runModuleSync(stream.location)
.then(value => {
    console.log(value);
    console.log(`${Colors.Cyan}${value}${Colors.Reset}`);
})
.catch(err => {
    console.error(err.message);
});