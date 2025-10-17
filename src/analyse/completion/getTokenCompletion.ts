import type * as vscode from 'vscode';
import { loadFromImport, preLoadDocImports } from '../../loadDoc';
import type { AttrTokenDescriptor, DotTokenDescriptor, PositionDescriptor, TokenDescriptor } from '../../parser/parseTokenDescr';
import type { DocDescriptor, NodeDescriptor } from '../../utils/DocDescriptor';
import type { AsyncExtractor } from '../../utils/types';


export type NodeDescriptorsExtractor = AsyncExtractor<NodeDescriptor[] | undefined>;

export function getTokenCompletion(dd: DocDescriptor, tokDescr: PositionDescriptor): NodeDescriptor[] | undefined | NodeDescriptorsExtractor {
    return _descrParsers[typeof tokDescr === "string" ? tokDescr : tokDescr.type](dd, tokDescr as any);
}

const _descrParsers = {
    "attr":             _parseMacro,
    "dot":              _parseMacro,
    "var":              _parseGeneric,
    "space":            _parseGeneric,
    "inner-scope":      _parseGeneric,
    "import.string":    _parseNull,
};


function _parseGeneric(dd: DocDescriptor, tokDescr: "space"): NodeDescriptor[] | undefined {
    let acc: NodeDescriptor[] = [];
    acc = acc.concat(dd.macros);
    acc = acc.concat(dd.imports);
    return acc;
}

function _parseMacro(dd: DocDescriptor, tokDescr: DotTokenDescriptor | AttrTokenDescriptor): NodeDescriptor[] | undefined | NodeDescriptorsExtractor {
    const imp = dd.findImport(tokDescr.objectSource.text);
    if (!imp) return undefined;
    const ret = () => {
        return [...imp.dd!.macros];
    };
    if (!imp.dd?.isLatest()) return async (control: vscode.CancellationToken) => {
        if (control.isCancellationRequested) return undefined;
        preLoadDocImports(await loadFromImport(imp));
        if (control.isCancellationRequested) return undefined;
        return ret();
    };
    return ret();
}

function _parseNull(dd: DocDescriptor, tokDescr: TokenDescriptor) {
    return undefined;
}
