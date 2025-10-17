import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as oniguruma from 'vscode-oniguruma';
import * as vsctm from 'vscode-textmate';
import { state } from '../../state';


export async function createGrammarRegistry() {
    const grammarIndex = _buildBuiltingGrammarIndex();

    const registry = new vsctm.Registry({
        onigLib: _createOnigLib(),
        loadGrammar: async (scopeName) => {
            if (state.cache.grammarDef.has(scopeName)) return state.cache.grammarDef.get(scopeName)!;

            const grammarPath = grammarIndex[scopeName];
            if (!grammarPath) {
                console.warn(`No grammar found for scope: ${scopeName}`);
                return null;
            }
            const content = await fs.promises.readFile(grammarPath, 'utf8');
            const grammar = vsctm.parseRawGrammar(content, grammarPath);
            state.cache.grammarDef.set(scopeName, grammar);
            return grammar;
        },
    });
    return registry;
}

function _buildBuiltingGrammarIndex() {
    const index: Record<string, string> = {};

    for (const ext of vscode.extensions.all) {
        const contributes = ext.packageJSON?.contributes;
        if (!contributes?.grammars) continue;

        for (const grammar of contributes.grammars) {
            if (grammar.scopeName && grammar.path) {
                const fileUri = vscode.Uri.joinPath(ext.extensionUri, grammar.path);
                index[grammar.scopeName] = fileUri.fsPath;
            }
        }
    }
    return index;
}

async function _createOnigLib() {
    const wasmBin = fs.readFileSync(path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
    return oniguruma.loadWASM(wasmBin).then(() => {
        return {
            createOnigScanner(patterns: string[]) { return new oniguruma.OnigScanner(patterns); },
            createOnigString(s: string) { return new oniguruma.OnigString(s); }
        };
    });
}
