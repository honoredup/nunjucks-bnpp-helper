import * as vscode from "vscode";

type ConfigMapping = {
    "docLinks.enabled": boolean,
    "docLinks.excludePaths": string[],
    "docLinks.includePaths": string[],
    "hover.enabled": boolean,
}

export class ExtConfig {
    private _packageName: string;
    private _cache: Map<keyof ConfigMapping, any>;

    constructor(packageName: string) {
        this._packageName = packageName;
        this._cache = new Map();
    }

    public get<T extends keyof ConfigMapping>(key: T): ConfigMapping[T] {
        let res = this._cache.get(key);
        if (res) return res;
        const config = vscode.workspace.getConfiguration(this._packageName);
        res = config.get(key)!;
        this._cache.set(key, res);
        return res;
    }

    public onConfigChanged(e: vscode.ConfigurationChangeEvent) {
        if (e.affectsConfiguration(this._packageName)) {
            this._cache = new Map();
        }
        const thisRef = this;
        const packageName = this._packageName;
        function on<T extends keyof ConfigMapping>(key: T, callback: (value: ConfigMapping[T]) => any) {
            if (e.affectsConfiguration(packageName+"."+key)) {
                callback(thisRef.get(key));
            }
            return { on };
        }
        return { on };
    }
}
