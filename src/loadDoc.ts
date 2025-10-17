import * as vscode from 'vscode';
import { parseDoc } from './parser/parseDoc';
import { state } from './state';
import { DocDescriptor, ImportDescriptor } from './utils/DocDescriptor';

export function loadDoc(document: vscode.TextDocument) {
    let dd = state.cache.dds.get(document.uri.fsPath);
    if (dd) dd.doc = document;
    if (dd && dd.isLatest()) return dd;
    else if (dd) dd.reset();
    else {
        dd = new DocDescriptor(document);
        state.cache.dds.set(document.uri.fsPath, dd);
    }
    return parseDoc(dd);
}

export async function preLoadDocImports(dd: DocDescriptor) {
    const acc: Promise<void>[] = [];

    for (let i = 0; i < dd.imports.length; ++i) {
        if (dd.imports[i].dd?.isLatest()) {
            continue;
        }
        acc.push(new Promise((resolve) => {
            setTimeout(async () => {
                const subdd = await loadFromImport(dd.imports[i]);
                await preLoadDocImports(subdd);
                resolve();
            });
        }));
    }
    return await Promise.all(acc);
}

export async function loadFromImport(imp: ImportDescriptor) {
    const dd = imp.dd ?? state.cache.dds.get(imp.source);
    if (dd?.isLatest()) {
        imp.dd = dd;
        return imp.dd;
    }
    let doc = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === imp.source);
    if (!doc) {
        doc = await vscode.workspace.openTextDocument(imp.source);
    }
    imp.dd = loadDoc(doc);
    return imp.dd;
}
