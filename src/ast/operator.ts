enum OperatorPrecedenceLevel {
    UNSPECIFIED = -Infinity,
    ASSIGNMENT = 0,
    LOGIC,
    EQUALITY,
    COMPARISON,
    BITWISE,
    ADDARITHMETIC,
    MULTARITHMETIC,
    EXPONENTIATION,
    ARRAY,
    COMPOSITION,
    RANGE
}

enum OperatorAssociativity {
    UNSPECIFIED,
    LEFT,
    RIGHT
}

class OperatorInfo {
    symbol: string;
    precedence: OperatorPrecedenceLevel;
    associativity: OperatorAssociativity;

    constructor(symbol: string, precedence: OperatorPrecedenceLevel, associativity: OperatorAssociativity) {
        this.symbol = symbol;
        this.precedence = precedence;
        this.associativity = associativity;
    }
}

const operatorsInfoTable = {
    '{INFIX_PARSE_ABSOLUTE_MINIMUM}': new OperatorInfo('', OperatorPrecedenceLevel.UNSPECIFIED, OperatorAssociativity.UNSPECIFIED),
    '=': new OperatorInfo('=', OperatorPrecedenceLevel.ASSIGNMENT, OperatorAssociativity.RIGHT),

    '||': new OperatorInfo('||', OperatorPrecedenceLevel.LOGIC, OperatorAssociativity.LEFT),
    '&&': new OperatorInfo('&&', OperatorPrecedenceLevel.LOGIC, OperatorAssociativity.LEFT),

    '==': new OperatorInfo('==', OperatorPrecedenceLevel.EQUALITY, OperatorAssociativity.LEFT),
    '!=': new OperatorInfo('!=', OperatorPrecedenceLevel.EQUALITY, OperatorAssociativity.LEFT),
    '=~': new OperatorInfo('=~', OperatorPrecedenceLevel.COMPARISON, OperatorAssociativity.LEFT),

    '<': new OperatorInfo('<', OperatorPrecedenceLevel.COMPARISON, OperatorAssociativity.LEFT),
    '<=': new OperatorInfo('<=', OperatorPrecedenceLevel.COMPARISON, OperatorAssociativity.LEFT),
    '>': new OperatorInfo('>', OperatorPrecedenceLevel.COMPARISON, OperatorAssociativity.LEFT),
    '>=': new OperatorInfo('>=', OperatorPrecedenceLevel.COMPARISON, OperatorAssociativity.LEFT),

    '>>': new OperatorInfo('>>', OperatorPrecedenceLevel.BITWISE, OperatorAssociativity.LEFT),
    '<<': new OperatorInfo('<<', OperatorPrecedenceLevel.BITWISE, OperatorAssociativity.LEFT),
    '|': new OperatorInfo('|', OperatorPrecedenceLevel.BITWISE, OperatorAssociativity.LEFT),
    '&': new OperatorInfo('&', OperatorPrecedenceLevel.BITWISE, OperatorAssociativity.LEFT),
    '^': new OperatorInfo('^', OperatorPrecedenceLevel.BITWISE, OperatorAssociativity.LEFT),

    '+': new OperatorInfo('+', OperatorPrecedenceLevel.ADDARITHMETIC, OperatorAssociativity.LEFT),
    '-': new OperatorInfo('-', OperatorPrecedenceLevel.ADDARITHMETIC, OperatorAssociativity.LEFT),

    '*': new OperatorInfo('*', OperatorPrecedenceLevel.MULTARITHMETIC, OperatorAssociativity.LEFT),
    '/': new OperatorInfo('/', OperatorPrecedenceLevel.MULTARITHMETIC, OperatorAssociativity.LEFT),
    '//': new OperatorInfo('//', OperatorPrecedenceLevel.MULTARITHMETIC, OperatorAssociativity.LEFT),
    '%': new OperatorInfo('%', OperatorPrecedenceLevel.MULTARITHMETIC, OperatorAssociativity.LEFT),

    '**': new OperatorInfo('**', OperatorPrecedenceLevel.EXPONENTIATION, OperatorAssociativity.RIGHT),
    '√': new OperatorInfo('√', OperatorPrecedenceLevel.EXPONENTIATION, OperatorAssociativity.LEFT),

    '->': new OperatorInfo('->', OperatorPrecedenceLevel.ARRAY, OperatorAssociativity.LEFT),

    '..': new OperatorInfo('..', OperatorPrecedenceLevel.RANGE, OperatorAssociativity.LEFT)
}

export const getOperatorInfoBySymbol = (operator:string):OperatorInfo => {
    // @ts-ignore
    if(operatorsInfoTable[operator] instanceof OperatorInfo) return operatorsInfoTable[operator];
    throw new Error(`INTERNAL ERROR: Lexer matched non-existent operator: '${operator}' (0x${operator.charCodeAt(0).toString(16).padStart(4, '0')})!`);
}

export const groupOperatorsLeft = (operatorLeft: string, operatorRight: string):boolean => {
    const opL = getOperatorInfoBySymbol(operatorLeft);
    const opR = getOperatorInfoBySymbol(operatorRight);
    if(opL.precedence == opR.precedence) return opR.associativity != OperatorAssociativity.RIGHT;
    return opL.precedence >= opR.precedence;
}