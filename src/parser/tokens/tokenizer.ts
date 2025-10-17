import * as vscode from 'vscode';
import * as vsctm from 'vscode-textmate';
import { state } from '../../state';
import type { DocLink, Token } from '../../utils/DocDescriptor';
import { match } from './patternMatching';

export function tokenizeDocument(document: vscode.TextDocument) {
    const lines: number[] = [];
    const tokens: Token[] = [];
    const docLinks: DocLink[] = [];
    let ruleStack = vsctm.INITIAL;
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const result = state.grammar.tokenizer.tokenizeLine(line, ruleStack);
        lines.push(tokens.length);
        const move = _processLine(line, i, result.tokens, tokens, docLinks);
        if (move === 0) --lines[lines.length - 1];
        ruleStack = result.ruleStack;
    }
    return {
        lines,
        tokens,
        docLinks,
    };
}

function _processLine(line: string, lineNum: number, tokens: vsctm.IToken[], acc: Token[], docLinks: DocLink[]) {
    const start = acc.length;
    for (const token of tokens) {
        const text = line.substring(token.startIndex, token.endIndex);
        if (acc.length > 1
            && match["comment"](token)
            && match["comment"](acc[acc.length - 1])
        ) {
            acc[acc.length - 1].endIndex += token.endIndex;
            acc[acc.length - 1].text += "\n"+text;
            continue;
        }
        if (token.endIndex === token.startIndex || !/\S/.test(text)) continue;
        const deepest = token.scopes[token.scopes.length - 1];
        if (deepest === state.grammar.scope) continue;
        const tok: Token = { ...token, text: text };
        if (match["string"](token)
            && !text.endsWith(".njk")
            && text.match(/^\/?[a-zA-Z0-9_\-\. ]+(?:\/[a-zA-Z0-9_\-\. ]+)*\.[a-zA-Z0-9]+$/)
        ) {
            docLinks.push({
                range: new vscode.Range(lineNum, token.startIndex - 1, lineNum, token.endIndex - 1),
                token: tok,
            });
        }
        acc.push(tok);
    }
    return acc.length - start;
}
