import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea";

const MONACO_BASE_URL = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min";

let monacoLoadPromise;

function ensureMonacoStyles() {
    if (document.querySelector("link[data-monaco-editor-css='1']"))
        return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${MONACO_BASE_URL}/vs/editor/editor.main.css`;
    link.setAttribute("data-monaco-editor-css", "1");
    document.head.appendChild(link);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src='${src}']`);
        if (existing) {
            if (existing.getAttribute("data-loaded") === "1") {
                resolve();
                return;
            }

            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.addEventListener("load", () => {
            script.setAttribute("data-loaded", "1");
            resolve();
        }, { once: true });
        script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        document.head.appendChild(script);
    });
}

function ensureMonaco() {
    if (window.monaco?.editor)
        return Promise.resolve(window.monaco);

    if (!monacoLoadPromise) {
        monacoLoadPromise = loadScript(`${MONACO_BASE_URL}/vs/loader.js`).then(() => {
            ensureMonacoStyles();

            return new Promise((resolve, reject) => {
                if (!window.require) {
                    reject(new Error("Monaco loader unavailable"));
                    return;
                }

                window.require.config({
                    paths: {
                        vs: `${MONACO_BASE_URL}/vs`,
                    },
                });

                window.require(["vs/editor/editor.main"], () => resolve(window.monaco), reject);
            });
        });
    }

    return monacoLoadPromise;
}

const MonacoScriptEditor = ({
    value,
    onChange,
    language,
    height,
    readOnly,
    rows,
    isDisabled,
}) => {
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const containerRef = useRef(null);
    const editorRef = useRef(null);
    const monacoRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        ensureMonaco()
                .then(monaco => {
                    if (cancelled || !containerRef.current)
                        return;

                    monacoRef.current = monaco;
                    editorRef.current = monaco.editor.create(containerRef.current, {
                        value: value ?? "",
                        language: language || "plaintext",
                        automaticLayout: true,
                        minimap: { enabled: false },
                        readOnly: !!readOnly || !!isDisabled,
                        theme: "vs-dark",
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                    });

                    editorRef.current.onDidChangeModelContent(() => {
                        if (onChange)
                            onChange(editorRef.current.getValue());
                    });

                    setReady(true);
                })
                .catch(() => {
                    if (!cancelled)
                        setFailed(true);
                });

        return () => {
            cancelled = true;
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!editorRef.current)
            return;

        if (editorRef.current.getValue() !== (value ?? ""))
            editorRef.current.setValue(value ?? "");
    }, [value]);

    useEffect(() => {
        if (!editorRef.current || !monacoRef.current)
            return;

        const model = editorRef.current.getModel();
        if (model)
            monacoRef.current.editor.setModelLanguage(model, language || "plaintext");
    }, [language]);

    useEffect(() => {
        if (!editorRef.current)
            return;
        editorRef.current.updateOptions({ readOnly: !!readOnly || !!isDisabled });
    }, [readOnly, isDisabled]);

    if (failed) {
        return (
            <TextArea value={value}
                      rows={rows || 12}
                      resizeOrientation="vertical"
                      readOnly={readOnly}
                      isDisabled={isDisabled}
                      onChange={(_, nextValue) => onChange?.(nextValue ?? "")} />
        );
    }

    return (
        <div className="ct-monaco-editor-wrap" style={{ height: height || "40vh" }}>
            {!ready && <div className="ct-monaco-editor-loading"><Spinner size="md" /></div>}
            <div className="ct-monaco-editor" ref={containerRef} />
        </div>
    );
};

export default MonacoScriptEditor;
