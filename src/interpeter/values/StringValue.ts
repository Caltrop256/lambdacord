import { CharStream } from "../../lexer/charstream.js";
import { numberMatcher } from "../../lexer/tokens/matchers/number.js";
import { Token, TokenType } from "../../lexer/tokens/token.js";
import { ErrorType, RuntimeError } from "../error.js";
import { defaultPrimitives } from "../types/primitive.js";
import { TypeInfo } from "../types/type.js";
import { IntegerValue } from "./IntegerValue.js";
import { RationalValue } from "./RationalValue.js";
import { Value } from "./value.js";

export class StringValue extends Value {
    value: string;

    constructor(value: string, type?: TypeInfo) {
        super(type ?? defaultPrimitives['string']);

        this.value = value;
    }

    isTruthy(): boolean {
        return this.value.length != 0;
    }
    toString(): string {
        return `"${this.value}"`;
    }
    clone(type: TypeInfo = this.type): Value {
        return new StringValue(this.value, type);
    }

    weakCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);

        throw new RuntimeError(ErrorType.Coercion, `Can not coerce ${this.type} to ${target}!`);
    }
    strongCoerceTo(target: TypeInfo): Value {
        if(target.equals(this.type) || this.type.equals(target)) return target.apply(this);
        if(target.equals(defaultPrimitives['int'])) {
            const stream = new CharStream(this.value, `string`);
            if(!numberMatcher.canidateCheck(stream.peek())) throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} "${this.value}" to ${target}!`);
            const token: Token = numberMatcher.getToken(stream);
            if(token.is(TokenType.ERROR) || !token.is(TokenType.INTEGER) || !stream.eof()) throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} "${this.value}" to ${target}!`);
            return target.apply(new IntegerValue(token.value))
        }
        if(target.equals(defaultPrimitives['ratio'])) {
            const stream = new CharStream(this.value, `string`);
            if(!numberMatcher.canidateCheck(stream.peek())) throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} "${this.value}" to ${target}!`);
            const token: Token = numberMatcher.getToken(stream);
            if(token.is(TokenType.ERROR) || !stream.eof()) throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} "${this.value}" to ${target}!`);
            if(token.is(TokenType.INTEGER)) return target.apply(new RationalValue(token.value, 1n));
            else if(token.is(TokenType.RATIO)) return target.apply(RationalValue.fromComponents(token.value[0], token.value[1], token.value[2]));
        }

        throw new RuntimeError(ErrorType.Cast, `Can not cast ${this.type} to ${target}!`);
    }

    toJS() {
        return this.value;
    }
}