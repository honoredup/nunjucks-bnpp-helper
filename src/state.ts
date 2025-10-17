import type * as vsctm from 'vscode-textmate';
import type { DocDescriptor } from './utils/DocDescriptor';
import { ExtCache } from './utils/ExtCache';
import { ExtConfig } from './utils/ExtConfig';


type State = {
    package: {
        name: string,
        displayName: "Nunjucks BNPP Helper",
    }
    cache: ExtCache,
    config: ExtConfig,
    grammar: {
        registry: vsctm.Registry,
        tokenizer: vsctm.IGrammar,
        scope: "text.html.jinja",
        dependecies: "samuelcolvin.jinjahtml",
    },
};
export let state: State = {
    package: {
        displayName: "Nunjucks BNPP Helper",
    },
    grammar: {
        scope: "text.html.jinja",
        dependecies: "samuelcolvin.jinjahtml",
    },
} as State;
