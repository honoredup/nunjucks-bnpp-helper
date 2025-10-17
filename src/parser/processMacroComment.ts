import { mathParingParentheses } from "../utils/regex";


export function processMacroComment(macroName: string, str: string) {
    return str
        .replace(
            new RegExp("^(\\s*Param:\\n)?\\s*("+macroName+mathParingParentheses+")(?:([^*@]*)(\\n[*@]))?"),
            (m, p1, p2, p3, p4) => "```ts\nfunction "+p2+": string"+(p1 && p3 ? ` ${p3}/**${p4}` : [p1 ? null : "\n``` ", p3, p4].join(""))
        );
}
