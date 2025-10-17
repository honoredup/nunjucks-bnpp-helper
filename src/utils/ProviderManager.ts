import type * as vscode from "vscode";

export class ProviderManager<Keys extends string> {
    public context: vscode.ExtensionContext;
    private _builders: Record<Keys, () => vscode.Disposable>;
    private _providers: Partial<Record<Keys, vscode.Disposable>>;

    constructor(context: vscode.ExtensionContext, builders: Record<Keys, () => vscode.Disposable>) {
        this.context = context;
        this._providers = {};
        this._builders = builders;
    }

    public buildAllExcept(exclude: Partial<Record<Keys, boolean>>) {
        for (const key in this._builders) {
            if (exclude[key]) continue;
            this._providers[key] = this._builders[key]();
            this.context.subscriptions.push(this._providers[key]);
        }
    }

    public manage(key: Keys, activate: boolean) {
        if (!activate && this._providers[key]) {
            this._providers[key].dispose();
            this._providers[key] = undefined;
        } else if (activate && !this._providers[key]) {
            this._providers[key] = this._builders[key]();
            this.context.subscriptions.push(this._providers[key]);
        }
    }
}
