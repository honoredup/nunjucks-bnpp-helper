import type * as vsctm from 'vscode-textmate';
import { DocDescriptor, DocLink } from "./DocDescriptor";

type ReducedDocLink = Pick<DocLink, "target" | "tooltip"> & { text: string };

export class ExtCache {
    public grammarDef = new Map<string, vsctm.IRawGrammar>();
    public dds = new Map<string, DocDescriptor>();
    public docLinks = new Map<string, ReducedDocLink>();
}
