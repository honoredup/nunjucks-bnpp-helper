import type * as vsctm from 'vscode-textmate';
import type { Token } from '../../utils/DocDescriptor';

const _scopesTester = {
    "delim":                ["entity.other.jinja.delimiter.tag"],
    "delim.variable":       ["variable.meta.scope.jinja",  "variable.entity.other.jinja.delimiter"],
    "delim.comment":        ["comment.block.jinja",  "entity.other.jinja.delimiter.comment"],
    "keyword":              ["keyword.control.jinja"],
    "str.single.begin":     ["string.quoted.single.jinja", "punctuation.definition.string.begin.jinja"],
    "str.single.content":   ["string.quoted.single.jinja"],
    "str.single.end":       ["string.quoted.single.jinja", "punctuation.definition.string.end.jinja"],
    "str.double.begin":     ["string.quoted.double.jinja", "punctuation.definition.string.begin.jinja"],
    "str.double.content":   ["string.quoted.double.jinja"],
    "str.double.end":       ["string.quoted.double.jinja", "punctuation.definition.string.end.jinja"],
    "punctuation":          ["punctuation.other.jinja"],
    "variable":             ["variable.other.jinja"],
    "attr":                 ["variable.other.jinja.attribute"],
    "comment":              ["comment.block.jinja"],
    "scope.variable":       ["variable.meta.scope.jinja"],
    "scope.general":        ["meta.scope.jinja.tag"],
};

type SimpleToken = vsctm.IToken;
export const match = {
    "delim.open": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["delim"])
            && curr.text.startsWith("{%"),
    "delim.close": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["delim"])
            && curr.text.endsWith("%}"),
    "comment.open": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["delim.comment"])
            && curr.text.startsWith("{#"),
    "comment.close": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["delim.comment"])
            && curr.text.endsWith("#}"),
    "render.open": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["delim.variable"])
            && curr.text.startsWith("{{"),
    "render.close": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["delim.variable"])
            && curr.text.endsWith("}}"),
    "comment": (curr: SimpleToken) =>
            curr.scopes[curr.scopes.length - 1] === _scopesTester["comment"][0],
    "keyword": (curr: SimpleToken) =>
            _testScopes(curr.scopes, _scopesTester["keyword"]),
    "keyword.import": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["keyword"])
            && curr.text === "import",
    "keywod.macro": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["keyword"])
            && curr.text === "macro",
    "string": (curr: SimpleToken) =>
            _testScopes(curr.scopes, _scopesTester["str.single.content"])
            || _testScopes(curr.scopes, _scopesTester["str.double.content"]),
    "string.full": (curr: SimpleToken, tokens: SimpleToken[], currIdx: number) =>
            tokens.length >= currIdx + 2
            && ((
                _testScopes(curr.scopes, _scopesTester["str.single.begin"])
                && _testScopes(tokens[currIdx + 1].scopes, _scopesTester["str.single.content"])
                && _testScopes(tokens[currIdx + 2].scopes, _scopesTester["str.single.end"])
            ) || (
                _testScopes(curr.scopes, _scopesTester["str.double.begin"])
                && _testScopes(tokens[currIdx + 1].scopes, _scopesTester["str.double.content"])
                && _testScopes(tokens[currIdx + 2].scopes, _scopesTester["str.double.end"])
            )),
    "keyword.as": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["variable"])
            && curr.text === "as",
    "keyword.with-context": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["keyword"])
            && curr.text === "with context",
    "keyword.without-context": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["keyword"])
            && curr.text === "without context",
    "variable": (curr: SimpleToken) =>
            _testScopes(curr.scopes, _scopesTester["variable"]),
    "attr": (curr: SimpleToken) =>
            _testScopes(curr.scopes, _scopesTester["attr"]),
    "parenthesis.open": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["punctuation"])
            && curr.text === "(",
    "parenthesis.close": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["punctuation"])
            && curr.text === ")",
    "dot": (curr: Token) =>
            _testScopes(curr.scopes, _scopesTester["punctuation"])
            && curr.text === ".",
    "njk.scope": (curr: Token) =>
            (
                _testScopes(curr.scopes, _scopesTester["scope.general"])
                || _testScopes(curr.scopes, _scopesTester["scope.general"])
            )
            && !match['delim.close'](curr)
            && !match['render.close'](curr)
            && !match['comment.close'](curr),
};

function _testScopes(scopes: string[], test: string[]) {
    const idx = scopes.indexOf(test[0]);
    if (idx === -1 || (scopes.length - idx < test.length)) return false;
    for (let i = 1; i < test.length; ++i) {
        if (scopes[idx + i] !== test[i]) return false;
    }
    return true;
}
