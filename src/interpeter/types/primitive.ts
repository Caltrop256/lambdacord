import { ModuleContainer } from "../../runtime/ModuleContainer.js";
import { Value } from "../values/value.js";
import { TypeInfo, TypeType } from "./type.js";

export enum PrimitiveValueType {
    ANY,
    BOOLEAN,
    RATIO,
    INTEGER,
    LAMBDA,
    UNIT,
    ENUM,
    STRING,
    ARRAY,
    TUPLE,
    STRUCT,
    REGEX,

    __len
}

export class PrimitiveTypeInfo extends TypeInfo {
    primType: PrimitiveValueType;

    constructor(name: string, type: PrimitiveValueType) {
        super(name, TypeType.PRIMITIVE);
        this.primType = type;
    }

    weight(): number {
        return this.primType + 1;
    }

    apply(value: Value): Value {
        if(this.primType == PrimitiveValueType.ANY || this.is(value.type)) return value;
        return value.clone(this);
    }

    is(type: TypeInfo): boolean {
        return type instanceof PrimitiveTypeInfo && type.primType == this.primType
    }

    equals(type: TypeInfo): boolean {
        return (this.primType == PrimitiveValueType.ANY) ||
            (type instanceof PrimitiveTypeInfo && (
                type.primType == PrimitiveValueType.ANY ||
                type.primType == this.primType
            ));
    }

    matches(type: TypeInfo): boolean {
        return this.equals(type) || (type instanceof PrimitiveTypeInfo && primitiveTransitionMatrix[this.primType][type.primType]);
    }

    toString(simple: boolean = false): string {
        return this.name;
    }

    resolveTypes(m: ModuleContainer): void {
        return;
    }
}

export const defaultPrimitives = {
    'any'   : new PrimitiveTypeInfo('any',    PrimitiveValueType.ANY),
    'bool'  : new PrimitiveTypeInfo('bool',   PrimitiveValueType.BOOLEAN),
    'int'   : new PrimitiveTypeInfo('int',    PrimitiveValueType.INTEGER),
    'ratio' : new PrimitiveTypeInfo('ratio',  PrimitiveValueType.RATIO),
    'λ'     : new PrimitiveTypeInfo('λ',      PrimitiveValueType.LAMBDA),
    'unit'  : new PrimitiveTypeInfo('unit',   PrimitiveValueType.UNIT),
    'enum'  : new PrimitiveTypeInfo('enum',   PrimitiveValueType.ENUM),
    'string': new PrimitiveTypeInfo('string', PrimitiveValueType.STRING),
    'array' : new PrimitiveTypeInfo('array',  PrimitiveValueType.ARRAY),
    'tuple' : new PrimitiveTypeInfo('tuple',  PrimitiveValueType.TUPLE),
    'struct': new PrimitiveTypeInfo('struct', PrimitiveValueType.STRUCT)
}

const primitiveTransitionMatrix: boolean[][] = Array.from({length: PrimitiveValueType.__len}, () => Array.from({length: PrimitiveValueType.__len}, () => false));
primitiveTransitionMatrix[PrimitiveValueType.BOOLEAN][PrimitiveValueType.INTEGER] = true;
primitiveTransitionMatrix[PrimitiveValueType.BOOLEAN][PrimitiveValueType.RATIO] = true;
primitiveTransitionMatrix[PrimitiveValueType.INTEGER][PrimitiveValueType.BOOLEAN] = true;
primitiveTransitionMatrix[PrimitiveValueType.RATIO][PrimitiveValueType.BOOLEAN] = true;
primitiveTransitionMatrix[PrimitiveValueType.INTEGER][PrimitiveValueType.RATIO] = true;
