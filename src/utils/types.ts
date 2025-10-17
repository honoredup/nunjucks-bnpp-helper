import type * as vscode from 'vscode';

export type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };

export type AsyncExtractor<T> = (control: vscode.CancellationToken) => Promise<T>;

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
