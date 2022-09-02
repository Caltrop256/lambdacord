import { Continuation, ContinuationFrame, Thunk } from "../../interpeter/continuation.js";
import { ErrorType, RuntimeError } from "../../interpeter/error.js";
import { Scope } from "../../interpeter/scope.js";
import { BooleanValue } from "../../interpeter/values/BooleanValue.js";
import { CharRange } from "../../lexer/charinfo.js";
import { indent, Node } from "../node.js";

export class BlockNode extends Node {
    expressions: Node[];

    constructor(expressions: Node[]) {
        super(new CharRange(expressions[0].range.startInfo(), expressions[expressions.length - 1].range.endInfo()));
        this.expressions = expressions;
    }

    toString(depth:number) {
        return '{' + 
            this.expressions
            .map(n => '\n' + indent(depth + 1) + n.toString(depth + 1))
            .join(';') + 
        '\n' + indent(depth) + '}';
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        const iterateBlock = (i: number): Promise<Thunk> => {
            if(i == this.expressions.length - 1) {
                return frame.eval(this.expressions[i], scope, value => {
                    return callback(value);
                })
            } else {
                return frame.eval(this.expressions[i], scope, value => {
                    return iterateBlock(i + 1);
                })
            }
        }
        return iterateBlock(0);
    }
}

export class BranchNode extends Node {
    condition: Node;
    trueArm: Node;
    falseArm: Node | null;

    constructor(condition: Node, trueArm: Node, falseArm: Node | null, range: CharRange) {
        super(range);
        this.condition = condition;
        this.trueArm = trueArm;
        this.falseArm = falseArm;
    }

    toString(depth: number) {
        return `if ${this.condition.toString(depth)} ? ${this.trueArm.toString(depth)}`
            + (this.falseArm != null
            ? ` : ${this.falseArm?.toString(depth)}` : '');
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        return frame.eval(this.condition, scope, cond => {
            if(cond.isTruthy()) return frame.eval(this.trueArm, scope, res => callback(res));
            if(this.falseArm != null) return frame.eval(this.falseArm, scope, res => callback(res));
            return callback(new BooleanValue(false));
        })
    }
}

export class MatchNode extends Node {
    scrutinee: Node[];
    arms: [Node[][], Node][];

    constructor(scrutinee: Node[], arms: [Node[][], Node][], range: CharRange) {
        super(range);
        this.scrutinee = scrutinee;
        this.arms = arms;
    }

    toString(depth: number) {
        return `match (${this.scrutinee.map(s => s.toString(depth)).join(', ')}) {\n${indent(depth + 1)}` + 
            this.arms.map(a => `(${a[0].map(t => t.map(c => c.toString(depth)).join(' : ')).join(', ')}) : ${a[1]}`).join('\n' + indent(depth + 1)) + 
            `\n${indent(depth)}}`;
    }

    async eval(frame: ContinuationFrame, scope: Scope, callback: Continuation): Promise<Thunk> {
        throw new RuntimeError(ErrorType.Internal, `not implemented!`);
    }
}