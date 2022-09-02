import { LambdaTypeInfo } from "../../interpeter/types/lambda.js";
import { defaultPrimitives, PrimitiveTypeInfo } from "../../interpeter/types/primitive.js";
import { ReferenceTypeInfo } from "../../interpeter/types/reference.js";
import { StructTypeInfo } from "../../interpeter/types/struct.js";
import { TupleTypeInfo } from "../../interpeter/types/tuple.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { TokenType } from "../../lexer/tokens/token.js";
import { StructTypeNodeField } from "../nodes/module.js";
import { TokenError } from "../parser.js";
import { eat, eat2, extractTypeInfo, nextIs, ParseState } from "./util.js";

export const eatTypeLiteral = (s: ParseState):TypeInfo => {
    if(nextIs(s, TokenType.PUNCTUATION, '{')) return postprocessTypeLiteral(s, eatAnonymousStructType(s));
    if(nextIs(s, TokenType.PUNCTUATION, '(')) return postprocessTypeLiteral(s, eatAnonymousTupleType(s));
    if(nextIs(s, TokenType.LAMBDA))           return postprocessTypeLiteral(s, eatAnonymousLambdaType(s));
    return postprocessTypeLiteral(s, eatTypeReference(s));
}

const postprocessTypeLiteral = (s: ParseState, t: TypeInfo) => {
    return t;
}

const eatTypeReference = (s: ParseState): ReferenceTypeInfo | PrimitiveTypeInfo => {
    let name;
    if(nextIs(s, TokenType.KEYWORD, 'enum')) name = eat2(s, TokenType.KEYWORD, 'enum');
    else if(nextIs(s, TokenType.KEYWORD, 'struct')) name = eat2(s, TokenType.KEYWORD, 'struct');
    else if(nextIs(s, TokenType.LAMBDA)) name = eat(s, TokenType.LAMBDA);
    else if(nextIs(s, TokenType.IDENTIFIER)) name = eat(s, TokenType.IDENTIFIER);
    else throw new TokenError(s.lexer.peek(), 'Invalid annotation,,,,,,,,,,,,,,,,,,,,,');

    // @ts-ignore
    if(typeof defaultPrimitives[name.value] != 'undefined') return defaultPrimitives[name.value];
    else return new ReferenceTypeInfo(name.value);
}

const eatAnonymousStructType = (s: ParseState): StructTypeInfo => {
    eat2(s, TokenType.PUNCTUATION, '{');
    const fields: Map<string, StructTypeNodeField> = new Map();
    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, '}')) break;

        const {name, mutable, type} = extractTypeInfo(s);
        fields.set(name, new StructTypeNodeField(name, mutable, type));

        if(!nextIs(s, TokenType.PUNCTUATION, '}')) eat2(s, TokenType.PUNCTUATION, ',');
    }
    eat2(s, TokenType.PUNCTUATION, '}');
    const type = new StructTypeInfo('', fields);
    s.anonymousTypes.push(type);
    return type;
}

const eatAnonymousLambdaType = (s: ParseState): LambdaTypeInfo | PrimitiveTypeInfo => {
    const parameters2d: {type: TypeInfo, mutable: boolean}[][] = [];
    const returnTypes: TypeInfo[] = [];

    while(!s.lexer.eof()) {
        eat(s, TokenType.LAMBDA);
        if(returnTypes.length == 0 && !nextIs(s, TokenType.PUNCTUATION, '(')) return defaultPrimitives['λ'];
        eat2(s, TokenType.PUNCTUATION, '(');
        const parameters: {type: TypeInfo, mutable: boolean}[] = [];
        while(!s.lexer.eof()) {
            if(nextIs(s, TokenType.PUNCTUATION, ')')) break;
            const mutable = nextIs(s, TokenType.KEYWORD, 'mut');
            if(mutable) eat2(s, TokenType.KEYWORD, 'mut');
            const type = eatTypeLiteral(s);
            parameters.push({mutable, type});
            if(!nextIs(s, TokenType.PUNCTUATION, ')')) eat2(s, TokenType.PUNCTUATION, ',');
            else break;
        }
        eat2(s, TokenType.PUNCTUATION, ')');
        eat2(s, TokenType.PUNCTUATION, ':');
        returnTypes.push(eatTypeLiteral(s));
        parameters2d.push(parameters);

        if(nextIs(s, TokenType.OPERATOR, '|')) eat2(s, TokenType.OPERATOR, '|');
        else break;
    }
    const type = new LambdaTypeInfo('', parameters2d, returnTypes);
    s.anonymousTypes.push(type);
    return type;
}

const eatAnonymousTupleType = (s: ParseState): TypeInfo => {
    eat2(s, TokenType.PUNCTUATION, '(');
    const types: TypeInfo[] = [];
    while(!s.lexer.eof()) {
        if(nextIs(s, TokenType.PUNCTUATION, ')')) break;
        types.push(eatTypeLiteral(s));
        if(nextIs(s, TokenType.PUNCTUATION, ')')) break;
        else eat2(s, TokenType.PUNCTUATION, ',');
    }
    eat2(s, TokenType.PUNCTUATION, ')');
    const type = types.length != 1 ? new TupleTypeInfo('', types) : types[0];
    s.anonymousTypes.push(type);
    return type;
}