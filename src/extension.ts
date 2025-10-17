import * as vscode from "vscode";
import { getTokenCompletion } from "./analyse/completion/getTokenCompletion";
import { getTokenDetailedInfo } from "./analyse/getTokenDetailedInfo";
import { processDocLinks } from "./analyse/processDocLinks";
import { loadDoc, preLoadDocImports } from "./loadDoc";
import { createGrammarRegistry } from "./parser/grammar/registry";
import { parsePosToTokenDescr } from "./parser/parseTokenDescr";
import { state } from "./state";
import { ExtCache } from "./utils/ExtCache";
import { ExtConfig } from "./utils/ExtConfig";
import { ProviderManager } from "./utils/ProviderManager";

let providers: ReturnType<typeof createProviders>;

async function initState(context: vscode.ExtensionContext) {
    state.package.name = context.extension.id;
    const idx = state.package.name.lastIndexOf(".");
    if (idx !== -1) {
        state.package.name = state.package.name.substring(idx + 1);
    }
    state.cache = new ExtCache();
    state.config = new ExtConfig(state.package.name);
    state.grammar.registry = await createGrammarRegistry();
    const tmp = await state.grammar.registry.loadGrammar(state.grammar.scope);
    if (!tmp) {
        const ext = vscode.extensions.getExtension(state.grammar.dependecies);
        if (!ext) {
            // This should never happen thanks to package.json extensionDependencies
            await vscode.window.showErrorMessage(
                "Failed to initialize Nunjucks Grammar Helper.\nYou need to install the extension \"Better Jinja\".",
                "See \"Better Jinja\""
            ).then((selection) => {
                if (selection === "See \"Better Jinja\"") {
                    vscode.env.openExternal(vscode.Uri.parse("vscode:extension/"+state.grammar.dependecies));
                }
            });
        }
        throw Error("Could not load grammar!");
    }
    state.grammar.tokenizer = tmp;
    const doc = vscode.window.activeTextEditor?.document;
    if (doc) {
        const dd = loadDoc(doc);
        await preLoadDocImports(dd);
    }
    vscode.workspace.textDocuments.forEach((doc) => {
        setTimeout(() => {
            const dd = loadDoc(doc);
            preLoadDocImports(dd);
        });
    });
}


function createProviders(context: vscode.ExtensionContext) {
    return new ProviderManager(context, {
        "cmd.restart": () => vscode.commands.registerCommand("nunjucks-bnpp-helper.restart",
            async () => {
                await initState(context);
                vscode.window.showInformationMessage("Nunjucks Helper successfully restarted!");
            }
        ),
        "event.doc.open": () => vscode.workspace.onDidOpenTextDocument(
            (doc: vscode.TextDocument) => {
                if (doc.languageId !== "nunjucks") return;
                const dd = loadDoc(doc);
                preLoadDocImports(dd);
            }
        ),
        "hover": () => vscode.languages.registerHoverProvider("nunjucks", {
            async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                const dd = loadDoc(document);
                const tokDescr = parsePosToTokenDescr(dd, position);
                if (!tokDescr || tokDescr === "space") return;
                let source = getTokenDetailedInfo(dd, tokDescr);
                if (typeof source === "function") source = await source(token);
                if (!source || !source.description) return;
                const markdown = new vscode.MarkdownString(source.description);
                markdown.isTrusted = true;
                return new vscode.Hover(markdown, source.location[0].originSelectionRange);
            },
        }),
        "definition": () => vscode.languages.registerDefinitionProvider("nunjucks", {
            async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                const dd = loadDoc(document);
                const tokDescr = parsePosToTokenDescr(dd, position);
                if (!tokDescr || tokDescr === "space") return;
                let source = getTokenDetailedInfo(dd, tokDescr);
                if (typeof source === "function") source = await source(token);
                if (!source) return;
                return source.location;
            }
        }),
        "auto-complete": () => vscode.languages.registerCompletionItemProvider("nunjucks", {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
                const dd = loadDoc(document);
                const tokDescr = parsePosToTokenDescr(dd, position);
                if (!tokDescr) return;
                let res = getTokenCompletion(dd, tokDescr);
                if (res && typeof res === "function") res = await res(token);
                if (!res) return;
                const items: vscode.CompletionItem[] = [];

                for (const node of res) {
                    const item = new vscode.CompletionItem(node.name.text, node.type === "macro" ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Module);
                    if (node.description) item.documentation = new vscode.MarkdownString(node.description);
                    items.push(item);
                }
                return items;
            }
        }, "."),
        "doc-links": () => vscode.languages.registerDocumentLinkProvider("nunjucks", {
            async provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken) {
                const dd = loadDoc(document);
                const res = await processDocLinks(dd, token);
                return res;
            },
        }),
        "event.config.change": () => vscode.workspace.onDidChangeConfiguration(
            (e: vscode.ConfigurationChangeEvent) => {
                state.config.onConfigChanged(e)
                    .on("docLinks.enabled", (val) => {
                        providers.manage("doc-links", val);
                    })
                    .on("hover.enabled", (val) => {
                        providers.manage("hover", val);
                    })
                ;
            }
        ),
    });
}


export async function activate(context: vscode.ExtensionContext) {
    await initState(context);
    providers = createProviders(context);
    providers.buildAllExcept({
        "doc-links": !state.config.get("docLinks.enabled"),
        "hover": !state.config.get("hover.enabled"),
    });
}


// export function deactivate() {}
