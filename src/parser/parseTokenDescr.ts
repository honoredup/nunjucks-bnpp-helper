import type * as vscode from 'vscode';
import type { DocDescriptor, Token } from "../utils/DocDescriptor";
import { match } from './tokens/patternMatching';

export type TokenDescriptorBase = {
    curr: Token,
    idx: number,
    line: number,
};
export type AttrTokenDescriptor = TokenDescriptorBase & {
    readonly type: "attr",
    objectSource: Token,
};
export type VarTokenDescriptor = TokenDescriptorBase & {
    readonly type: "var",
};
export type ImportStringTokenDescriptor = TokenDescriptorBase & {
    readonly type: "import.string",
};
export type DotTokenDescriptor = TokenDescriptorBase & {
    readonly type: "dot",
    objectSource: Token,
};
export type InnerScopeTokenDescriptor = TokenDescriptorBase & {
    readonly type: "inner-scope",
};
export type TokenDescriptor =
    AttrTokenDescriptor
    | VarTokenDescriptor
    | ImportStringTokenDescriptor
    | DotTokenDescriptor
    | InnerScopeTokenDescriptor
    ;
export type PositionDescriptor =
    "space"
    | TokenDescriptor
    ;

export function parsePosToTokenDescr(dd: DocDescriptor, position: vscode.Position): PositionDescriptor | undefined {
    let tokIdx = dd.tokenAt(position);
    if (tokIdx === -1) {
        const line = dd.doc.lineAt(position.line);
        const text = line.text.substring(position.character - 1, position.character);
        if (text.match(/^\s+$/)) {
            return "space";
        }
    }
    return parseTokenDescr(dd, tokIdx, position.line);
}

export function parseTokenDescr(dd: DocDescriptor, tokIdx: number, line: number): TokenDescriptor | undefined {
    if (tokIdx === -1) return undefined;
    for (const parser of _tokenParsers) {
        const res = parser(dd, tokIdx, line);
        if (res) return res;
    }
    return undefined;
}

const _tokenParsers = [
    _parseAttr,
    _parseVar,
    _parseImportString,
    _parseDot,
    _parsePunctuation,
];

function _parseAttr(dd: DocDescriptor, tokIdx: number, line: number): TokenDescriptor | undefined {
    if (
        tokIdx > 2
        && match["variable"](dd.tokens[tokIdx - 2])
        && match["dot"](dd.tokens[tokIdx - 1])
        && match["attr"](dd.tokens[tokIdx])
    ) {
        return {
            type: "attr",
            idx: tokIdx,
            line: line,
            curr: dd.tokens[tokIdx],
            objectSource: dd.tokens[tokIdx - 2],
        };
    }
    return undefined;
}

function _parseVar(dd: DocDescriptor, tokIdx: number, line: number): TokenDescriptor | undefined {
    if (match["variable"](dd.tokens[tokIdx])) {
        return {
            type: "var",
            idx: tokIdx,
            line: line,
            curr: dd.tokens[tokIdx],
        };
    }
    return undefined;
}

function _parseImportString(dd: DocDescriptor, tokIdx: number, line: number): TokenDescriptor | undefined {
    if (
        tokIdx > 2
        && match["keyword.import"](dd.tokens[tokIdx - 2])
        && match["string"](dd.tokens[tokIdx])
    ) {
        return {
            type: "import.string",
            idx: tokIdx,
            line: line,
            curr: dd.tokens[tokIdx],
        };
    }
    return undefined;
}

function _parseDot(dd: DocDescriptor, tokIdx: number, line: number): TokenDescriptor | undefined {
    if (
        tokIdx > 1
        && match["variable"](dd.tokens[tokIdx - 1])
        && match["dot"](dd.tokens[tokIdx])
    ) {
        return {
            type: "dot",
            idx: tokIdx,
            line: line,
            curr: dd.tokens[tokIdx],
            objectSource: dd.tokens[tokIdx - 1],
        };
    }
    return undefined;
}

function _parsePunctuation(dd: DocDescriptor, tokIdx: number, line: number): TokenDescriptor | undefined {
    if (match["njk.scope"](dd.tokens[tokIdx])) {
        return {
            type: "inner-scope",
            idx: tokIdx,
            line: line,
            curr: dd.tokens[tokIdx],
        };
    }
    return undefined;
}
