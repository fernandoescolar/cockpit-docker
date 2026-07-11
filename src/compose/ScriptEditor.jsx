import React, { useMemo, useRef } from 'react';
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea";

function escapeHtml(value) {
    return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
}

function highlightYaml(input) {
    let text = escapeHtml(input || "");

    text = text.replace(/(^|\n)(\s*#.*$)/gm, "$1<span class=\"ct-editor-token-comment\">$2</span>");
    text = text.replace(/(^|\n)(\s*)([A-Za-z0-9_.-]+)(\s*:)/gm, "$1$2<span class=\"ct-editor-token-key\">$3</span>$4");
    text = text.replace(/(["'])(.*?)(\1)/g, "<span class=\"ct-editor-token-string\">$1$2$3</span>");
    text = text.replace(/\b(true|false|yes|no|null)\b/gi, "<span class=\"ct-editor-token-bool\">$1</span>");
    text = text.replace(/\b(-?\d+(?:\.\d+)?)\b/g, "<span class=\"ct-editor-token-number\">$1</span>");
    text = text.replace(/(^|\n)(\s*-\s)/g, "$1$2<span class=\"ct-editor-token-list\">- </span>");

    return text;
}

function highlightShell(input) {
    let text = escapeHtml(input || "");

    text = text.replace(/(^|\n)(\s*#.*$)/gm, "$1<span class=\"ct-editor-token-comment\">$2</span>");
    text = text.replace(/\$(\{?[A-Za-z_][A-Za-z0-9_]*\}?)/g, "<span class=\"ct-editor-token-var\">$$$1</span>");
    text = text.replace(/\b(export|if|then|else|fi|for|in|do|done|while|case|esac|function)\b/g, "<span class=\"ct-editor-token-keyword\">$1</span>");
    text = text.replace(/(["'])(.*?)(\1)/g, "<span class=\"ct-editor-token-string\">$1$2$3</span>");

    return text;
}

function highlightContent(input, language) {
    if (language === "yaml")
        return highlightYaml(input);
    if (language === "shell" || language === "sh")
        return highlightShell(input);
    return escapeHtml(input || "");
}

const ScriptEditor = ({
    value,
    onChange,
    language,
    height,
    readOnly,
    rows,
    isDisabled,
}) => {
    const inputRef = useRef(null);
    const highlightRef = useRef(null);

    const highlightedHtml = useMemo(() => {
        return highlightContent(value || "", language);
    }, [value, language]);

    const syncScroll = () => {
        if (!inputRef.current || !highlightRef.current)
            return;

        highlightRef.current.scrollTop = inputRef.current.scrollTop;
        highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    };

    if (isDisabled) {
        return (
            <TextArea value={value}
                      rows={rows || 12}
                      resizeOrientation="vertical"
                      readOnly={readOnly}
                      isDisabled={isDisabled}
                      onChange={(_, nextValue) => onChange?.(nextValue ?? "")} />
        );
    }

    if (readOnly) {
        return (
            <div className="ct-monaco-editor-wrap ct-inline-editor-wrap" style={{ height: height || "40vh" }}>
                <pre className="ct-inline-editor-readonly" dangerouslySetInnerHTML={{ __html: highlightedHtml || "\n" }} />
            </div>
        );
    }

    return (
        <div className="ct-monaco-editor-wrap ct-inline-editor-wrap" style={{ height: height || "40vh" }}>
            <pre className="ct-inline-editor-highlight"
                 ref={highlightRef}
                 aria-hidden="true"
                 dangerouslySetInnerHTML={{ __html: highlightedHtml || "\n" }} />
            <textarea className="ct-inline-editor-input"
                      ref={inputRef}
                      value={value ?? ""}
                      rows={rows || 12}
                      spellCheck={false}
                      onScroll={syncScroll}
                      onChange={event => onChange?.(event.target.value ?? "")}
                      aria-label="Code editor" />
        </div>
    );
};

export default ScriptEditor;
