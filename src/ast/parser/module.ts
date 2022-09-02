import { DerivativeTypeInfo } from "../../interpeter/types/derivative.js";
import { EnumTypeInfo } from "../../interpeter/types/enum.js";
import { LambdaTypeInfo } from "../../interpeter/types/lambda.js";
import { StructTypeInfo } from "../../interpeter/types/struct.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { CharRange } from "../../lexer/charinfo.js";
import { Token, TokenType } from "../../lexer/tokens/token.js";
import { ImportNode, StructTypeNodeField } from "../nodes/module.js";
import { eatExpression, TokenError } from "../parser.js";
import { eatString } from "./string.js";
import { eatTypeLiteral } from "./type.js";
import { eat, eat2, extractTypeInfo, nextIs, ParseState } from "./util.js";


export const eatToplevelExpression = (s: ParseState) => {
    if(nextIs(s, TokenType.KEYWORD, 'import')) return eatImport(s);
    if(nextIs(s, TokenType.KEYWORD, 'typedef')) return eatTypeDerivative(s);
    if(nextIs(s, TokenType.KEYWORD, 'struct')) return eatStructType(s);
    if(nextIs(s, TokenType.KEYWORD, 'enum')) return eatEnumType(s);
    return eatExpression(s);
}

const eatImport = (s: ParseState) => {
    const start = eat2(s, TokenType.KEYWORD, 'import').range.startInfo();
    const string = eatString(s);
    if(string.components.length != 1 || typeof string.components[0] != 'string')
        throw new TokenError(new Token(TokenType.ERROR, new CharRange(s.lexer.info(), s.lexer.info()), ''), `Import path string may not be a template literal!`);
    const node = new ImportNode(string.components[0], new CharRange(start, s.lexer.info()));
    s.imports.push(node);
    return node;
}

const eatTypeDerivative = (s: ParseState) => {
    eat2(s, TokenType.KEYWORD, 'typedef').range.startInfo();
    const name = eat(s, TokenType.IDENTIFIER);
    if(s.types.has(name.value)) throw new TokenError(name, `Tried to redefine ${s.types.get(name.value)}!`);
    eat2(s, TokenType.OPERATOR, '=');
    let type = eatTypeLiteral(s);
    if(!type.name.length) type.name = name.value;
    else type = new DerivativeTypeInfo(name.value, type);
    s.types.set(name.value, type);
    return null;
}

const eatStructType = (s: ParseState) => {
    eat2(s, TokenType.KEYWORD, 'struct').range.startInfo();
    const name = eat(s, TokenType.IDENTIFIER);
    if(s.types.has(name.value)) throw new TokenError(name, `Tried to redefine ${s.types.get(name.value)}!`);
    eat2(s, TokenType.PUNCTUATION, '{');

    const fields = new Map();

    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, '}')) break;

        const {name, mutable, type} = extractTypeInfo(s);
        fields.set(name, new StructTypeNodeField(name, mutable, type));

        if(!nextIs(s, TokenType.PUNCTUATION, '}')) eat2(s, TokenType.PUNCTUATION, ',');
    }
    eat2(s, TokenType.PUNCTUATION, '}').range.endInfo();

    s.types.set(name.value, new StructTypeInfo(name.value, fields));
    return null;
}

const eatEnumType = (s: ParseState) => {
    eat2(s, TokenType.KEYWORD, 'enum').range.startInfo();
    const name = eat(s, TokenType.IDENTIFIER);
    if(s.types.has(name.value)) throw new TokenError(name, `Tried to redefine ${s.types.get(name.value)}!`);
    eat2(s, TokenType.PUNCTUATION, '{');
    const values: [string, TypeInfo | null][] = [];
    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, '}')) break;

        const entry: [string, TypeInfo | null] = [eat(s, TokenType.IDENTIFIER).value, null];
        if(!nextIs(s, TokenType.PUNCTUATION, ',') && !nextIs(s, TokenType.PUNCTUATION, '}'))
            entry[1] = eatTypeLiteral(s);

        values.push(entry);

        if(!nextIs(s, TokenType.PUNCTUATION, '}')) eat2(s, TokenType.PUNCTUATION, ',');
    }
    eat2(s, TokenType.PUNCTUATION, '}').range.endInfo();
    s.types.set(name.value, new EnumTypeInfo(name.value, values));
    return null;
}