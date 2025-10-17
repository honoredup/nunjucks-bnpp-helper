import * as fs from 'fs';
import * as vscode from 'vscode';
import { loadFromImport, preLoadDocImports } from '../loadDoc';
import type { AttrTokenDescriptor, ImportStringTokenDescriptor, TokenDescriptor, VarTokenDescriptor } from "../parser/parseTokenDescr";
import type { DocDescriptor, NodeDescriptor } from "../utils/DocDescriptor";
import type { AsyncExtractor } from '../utils/types';

export type TokenNodeSource = {
    token: TokenDescriptor,
    location: vscode.LocationLink[],
    description?: string,
    source?: DocDescriptor,
    descr?: NodeDescriptor,
};
export type TokenNodeSourceExtractor = AsyncExtractor<TokenNodeSource | undefined>;

export function getTokenDetailedInfo(dd: DocDescriptor, tokDescr: TokenDescriptor): TokenNodeSource | undefined | TokenNodeSourceExtractor {
    return _descrParsers[tokDescr.type](dd, tokDescr as any);
}


const _descrParsers = {
    "attr":             _parseAttr,
    "var":              _parseVar,
    "import.string":    _parseImportString,
    "dot":              _parseNull,
    "inner-scope":      _parseNull,
};

function _parseAttr(dd: DocDescriptor, tokDescr: AttrTokenDescriptor): TokenNodeSource | undefined | TokenNodeSourceExtractor {
    const imp = dd.findImport(tokDescr.objectSource.text);
    if (!imp) return undefined;
    const ret = (): TokenNodeSource | undefined => {
        const macro = imp.dd!.findMacro(tokDescr.curr.text);
        return macro && {
            token: tokDescr,
            location: [{
                originSelectionRange: new vscode.Range(tokDescr.line, tokDescr.curr.startIndex, tokDescr.line, tokDescr.curr.endIndex),
                targetRange: macro.def,
                targetUri: imp.dd!.doc.uri,
            }],
            description: macro.description,
            source: imp.dd,
            descr: macro,
        };
    };
    if (!imp.dd?.isLatest()) return async (control: vscode.CancellationToken) => {
        if (control.isCancellationRequested) return undefined;
        preLoadDocImports(await loadFromImport(imp));
        if (control.isCancellationRequested) return undefined;
        return ret();
    };
    return ret();
}

function _parseVar(dd: DocDescriptor, tokDescr: VarTokenDescriptor): TokenNodeSource | undefined {
    let desc: NodeDescriptor | undefined = dd.findMacro(tokDescr.curr.text);
    desc = desc || dd.findImport(tokDescr.curr.text);
    return desc && {
        token: tokDescr,
        location: [{
            originSelectionRange: new vscode.Range(tokDescr.line, tokDescr.curr.startIndex, tokDescr.line, tokDescr.curr.endIndex),
            targetRange: desc.def,
            targetUri: dd.doc.uri,
        }],
        description: desc.description,
        source: dd,
        descr: desc,
    };
}

function _parseImportString(dd: DocDescriptor, tokDescr: ImportStringTokenDescriptor): TokenNodeSource | undefined {
    const uri = vscode.Uri.joinPath(dd.doc.uri, "..", tokDescr.curr.text);
    if (!fs.existsSync(uri.fsPath)) return undefined;
    const root = vscode.workspace.getWorkspaceFolder(uri);
    let path = uri.fsPath;
    if (root) {
        path = uri.fsPath.substring(root.uri.fsPath.length + 1);
    }
    return {
        token: tokDescr,
        location: [{
            originSelectionRange: new vscode.Range(tokDescr.line, tokDescr.curr.startIndex - 1, tokDescr.line, tokDescr.curr.endIndex + 1),
            targetRange: new vscode.Range(0, 0, 0, 0),
            targetUri: uri,
        }],
        description: "```ts\nmodule \""+path+"\"",
    };
}

function _parseNull(dd: DocDescriptor, tokDescr: NodeDescriptor): undefined {
    return undefined;
}
