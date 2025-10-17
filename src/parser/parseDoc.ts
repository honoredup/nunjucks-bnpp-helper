import * as vscode from 'vscode';
import type { DocDescriptor } from '../utils/DocDescriptor';
import { processMacroComment } from './processMacroComment';
import { match } from "./tokens/patternMatching";
import { tokenizeDocument } from "./tokens/tokenizer";


export function parseDoc(dd: DocDescriptor) {
    const { tokens, lines, docLinks } = tokenizeDocument(dd.doc);
    dd.tokens = tokens;
    dd.lines = lines;
    dd.docLinks = docLinks;
    let line = 0;
    for (let i = 0; i < tokens.length - 1; ++i) {
        for (; line < lines.length - 1 && i >= lines[line + 1]; ++line);
        if (match["delim.open"](tokens[i]) && match["keyword"](tokens[i + 1])) {
            i = _keywrodParser[tokens[i + 1].text]?.(dd, i + 1, line) ?? i;
        }
    }
    return dd;
}


const _keywrodParser: Record<string, typeof _parseImport> = {
    "import": _parseImport,
    "macro": _parseMacro,
};

function _parseImport(dd: DocDescriptor, start: number, lineNumber: number) {
    if (dd.tokens.length - start < 6) return start;
    if (!(
        match["string.full"](dd.tokens[start + 1], dd.tokens, start + 1)
        && match["keyword.as"](dd.tokens[start + 4])
        && match["variable"](dd.tokens[start + 5])
    )) {
        return start;
    }
    let idx = start + 6;
    if (
        match["keyword.with-context"](dd.tokens[idx])
        || match["keyword.with-context"](dd.tokens[idx])
    ) {
        ++idx;
    }
    if (!(
        dd.tokens.length > idx
        && match["delim.close"](dd.tokens[idx])
    )) {
        return start;
    }
    const name = dd.tokens[start + 5];
    const path = vscode.Uri.joinPath(dd.doc.uri, "..", dd.tokens[start + 2].text);
    const pathSteps = path.fsPath.split('/');
    let fileName = pathSteps[pathSteps.length - 1];
    const extIdx = fileName.lastIndexOf(".");
    if (extIdx !== -1) fileName = fileName.substring(0, extIdx);
    dd.imports.push({
        type: "import",
        tokensStart: start - 1,
        tokensEnd: idx,
        def: new vscode.Range(lineNumber, name.startIndex, lineNumber, name.endIndex),
        source: path.fsPath,
        name: name,
        description: "```ts\nmodule \""+fileName+"\"\nimport "+name.text,
    });
    return idx;
}

function _parseMacro(dd: DocDescriptor, start: number, lineNumber: number) {
    if (dd.tokens.length - start < 6) return start;
    if (!(
        match["variable"](dd.tokens[start + 1])
        && match["parenthesis.open"](dd.tokens[start + 2])
    )) {
        return start;
    }
    let idx = start + 3;
    for (; idx < dd.tokens.length; ++idx) {
        if (match["parenthesis.close"](dd.tokens[idx])) break;
        if (match["delim.close"](dd.tokens[idx])) return start;
    }
    ++idx;
    if (!match["delim.close"](dd.tokens[idx])) return start;
    const name = dd.tokens[start + 1];
    let description: string | undefined = undefined;
    if (
        start >= 4
        && match["comment.open"](dd.tokens[start - 4])
        && match["comment"](dd.tokens[start - 3])
        && match["comment.close"](dd.tokens[start - 2])
    ) {
        description = dd.tokens[start - 3].text;
        description = processMacroComment(name.text, description);
    }
    dd.macros.push({
        type: "macro",
        tokensStart: start,
        tokensEnd: idx,
        def: new vscode.Range(lineNumber, name.startIndex, lineNumber, name.endIndex),
        name: name,
        description: description,
    });
    return idx;
}
