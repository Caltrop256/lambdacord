import { Continuation, ContinuationFrame, Thunk } from "../../interpeter/continuation.js";
import { ErrorType, RuntimeError } from "../../interpeter/error.js";
import { Scope } from "../../interpeter/scope.js";
import { ReferenceTypeInfo } from "../../interpeter/types/reference.js";
import { TypeInfo } from "../../interpeter/types/type.js";
import { LambdaValue } from "../../interpeter/values/LambdaValue.js";
import { RationalValue } from "../../interpeter/values/RationalValue.js";
import { CharRange } from "../../lexer/charinfo.js";
import { Token } from "../../lexer/tokens/token.js";
import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Node } from "../node.js";
import { evaluateAssignment } from "./variable.js";

export class CastNode extends Node {
    left: Node;
    right: TypeInfo;

    constructor(left: Node, right: TypeInfo, range: CharRange) {
        super(range);
        this.left = left;
        this.right = right;
    }

    toString(depth: number) {
        return `(${this.left.toString(depth)}:${this.right})`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.left, scope, left => {
            return callback(left.strongCoerceTo(this.right));
        });
    };

    resolveReferenceTypes(m: ModuleContainer) {
        if(this.right instanceof ReferenceTypeInfo) this.right = m.getTypeInfo(this.right.name);
    }
}

export class InfixNode extends Node {
    left: Node;
    right: Node;
    op: string;

    constructor(left: Node, right: Node, operator: Token) {
        super(operator.range);
        this.left = left;
        this.right = right;
        this.op = operator.value;
    }

    toString(depth: number) {
        return `(${this.left.toString(depth)} ${this.op} ${this.right.toString(depth)})`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        if(this.op == '=') return evaluateAssignment(this, frame, scope, callback);

        return frame.eval(this.left, scope, left => frame.eval(this.right, scope, right => {
            const name = 'infix' + this.op;
            const func = scope.getVariable(name);
            if(!(func.value instanceof LambdaValue)) throw new RuntimeError(ErrorType.UnexpectedType, `Invoked operator '${this.op}' (${name}) is not a lambda!`);

            return func.value.multipleDispatch([left, right], this, scope, frame, result => {
                return callback(result);
            })
        }));
    }
}

export class PrefixNode extends Node {
    right: Node;
    op: string;

    constructor(operator: Token, right: Node) {
        super(operator.range);
        this.right = right;
        this.op = operator.value;
    }

    toString() {
        return `(${this.op}${this.right})`
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.right, scope, right => {
            const name = 'prefix' + this.op;
            const func = scope.getVariable(name);
            if(!(func.value instanceof LambdaValue)) throw new RuntimeError(ErrorType.UnexpectedType, `Invoked operator '${this.op}' (${name}) is not a lambda!`);

            return func.value.multipleDispatch([right], this, scope, frame, result => {
                return callback(result);
            })
        });
    }
}

export class PostfixNode extends Node {
    left: Node;
    op: string;

    constructor(left: Node, operator: Token) {
        super(operator.range);
        this.left = left;
        this.op = operator.value;
    }

    toString() {
        return `(${this.left}${this.op})`
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.left, scope, left => {
            const name = 'postfix' + this.op;
            const func = scope.getVariable(name);
            if(!(func.value instanceof LambdaValue)) throw new RuntimeError(ErrorType.UnexpectedType, `Invoked operator '${this.op}' (${name}) is not a lambda!`);

            return func.value.multipleDispatch([left], this, scope, frame, result => {
                return callback(result);
            })
        });
    }
}

export class SuperscriptExponentiationNode extends Node {
    left: Node;
    right: bigint;

    constructor(left: Node, right: Token) {
        super(right.range);
        this.left = left;
        this.right = right.value;
    }

    toString(depth: number) {
        return `(${this.left.toString(depth)}${this.right.toString().split('').map(c => {
            if(c == '-') return '⁻';
            else return '⁰¹²³⁴⁵⁶⁷⁸⁹'.charAt(+c);
        }).join('')})`
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.left, scope, left => {
            const name = 'infix**';
            const func = scope.getVariable(name);
            if(!(func.value instanceof LambdaValue)) throw new RuntimeError(ErrorType.UnexpectedType, `Expected exponentiation function redefined to non-lambda type!`);
            
            return func.value.multipleDispatch([left, new RationalValue(this.right, 1n)], this, scope, frame, result => {
                return callback(result);
            })
        })
    }
}