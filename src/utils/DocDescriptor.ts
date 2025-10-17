import type * as vscode from 'vscode';
import type * as vsctm from 'vscode-textmate';
import type { Writeable } from './types';

export type Token = Writeable<vsctm.IToken> & { text: string };

export type BaseNodeDescriptor = {
    tokensStart: number,
    tokensEnd: number,
    def: vscode.Range,
    description?: string,
};
export type ImportDescriptor = BaseNodeDescriptor & {
    readonly type: "import",
    source: string,
    name: Token,
    dd?: DocDescriptor,
};
export type MacroDescriptor = BaseNodeDescriptor & {
    readonly type: "macro",
    name: Token,
};
export type NodeDescriptor = ImportDescriptor | MacroDescriptor;

export type DocLink = vscode.DocumentLink & {
    token: Token;
};

export class DocDescriptor {
    public id: string;
    public version: number;
    public doc: vscode.TextDocument;
    public tokens: Token[];
    public lines: number[];
    public docLinks: DocLink[];
    public imports: ImportDescriptor[];
    public macros: MacroDescriptor[];

    constructor(document: vscode.TextDocument) {
        this.id = document.uri.fsPath;
        this.doc = document;
        this.version = document.version;
        this.tokens = [];
        this.lines = [];
        this.docLinks = [];
        this.imports = [];
        this.macros = [];
    }

    public isLatest() {
        return !this.doc.isClosed && this.version === this.doc.version;
    }

    public reset() {
        this.version = this.doc.version;
        this.tokens = [];
        this.lines = [];
        this.docLinks = [];
        this.imports = [];
        this.macros = [];
    }

    public tokenAt(position: vscode.Position) {
        const limit = position.line === this.lines.length ? this.tokens.length : this.lines[position.line + 1];
        const target = position.character - 1;
        let token: Token;
        for (let i = this.lines[position.line]; i < limit; ++i) {
            token = this.tokens[i];
            if (token.startIndex <= target && target < token.endIndex) {
                return i;
            }
        }
        return -1;
    }

    public findImport(name: string) {
        return this.imports.find((imp) => imp.name.text === name);
    }

    public findMacro(name: string) {
        return this.macros.find((mac) => mac.name.text === name);
    }

    public matchImports(name: string) {
        return this.imports.reduce<ImportDescriptor[]>((acc, imp) => {
            if (imp.name.text.toLowerCase().includes(name.toLowerCase())) {
                acc.push(imp);
            }
            return acc;
        }, []);
    }

    public matchMacros(name: string) {
        return this.macros.reduce<MacroDescriptor[]>((acc, mac) => {
            if (mac.name.text.toLowerCase().includes(name.toLowerCase())) {
                acc.push(mac);
            }
            return acc;
        }, []);
    }
}
