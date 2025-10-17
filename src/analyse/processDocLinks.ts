import * as fs from 'fs';
import * as vscode from 'vscode';
import type { DocDescriptor, DocLink } from "../utils/DocDescriptor";
import { state } from '../state';

export async function processDocLinks(dd: DocDescriptor, cancel: vscode.CancellationToken) {
    const res: DocLink[] = [];
    for (const link of dd.docLinks) {
        if (link.target) {
            res.push(link);
            continue;
        } else if (state.cache.docLinks.has(link.token.text)) {
            const red = state.cache.docLinks.get(link.token.text);
            link.target = red!.target;
            link.tooltip = red!.tooltip;
            res.push(link);
            continue;
        }
        if (cancel.isCancellationRequested) return res;
        let shouldCache = false;
        let uri = vscode.Uri.joinPath(dd.doc.uri, "..", link.token.text);
        if (!fs.existsSync(uri.fsPath)) {
            let includes = state.config.get("docLinks.includePaths");
            includes = includes.map((path) => path+(path.endsWith("/") ? "" : "/")+link.token.text);
            const excludes = state.config.get("docLinks.excludePaths");
            const files = await vscode.workspace.findFiles("{"+includes.join(",")+"}", "{"+excludes.join(",")+"}", undefined, cancel);
            if (!files.length) continue;
            uri = files[0];
            shouldCache = true;
        }
        link.target = uri;
        const root = vscode.workspace.getWorkspaceFolder(uri);
        if (root) {
            link.tooltip = uri.fsPath.substring(root.uri.fsPath.length + 1);
        }
        shouldCache && state.cache.docLinks.set(link.token.text, {
            text: link.token.text,
            target: link.target,
            tooltip: link.tooltip,
        });
        res.push(link);
    }
    return res;
}
