import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea";

const MONACO_CDN_BASE_URL = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min";
const LANGUAGE_CONTRIBUTIONS = {
    yaml: "vs/basic-languages/yaml/yaml.contribution",
    shell: "vs/basic-languages/shell/shell.contribution",
    sh: "vs/basic-languages/shell/shell.contribution",
};

let monacoLoadPromise;
let monacoBaseUrl;

function getMonacoBaseCandidates() {
    const currentDir = new URL(".", window.location.href).href.replace(/\/$/, "");
    const configured = window.__ctMonacoBaseUrl;

    return [
        configured,
        `${currentDir}/monaco/min`,
        MONACO_CDN_BASE_URL,
    ].filter(Boolean);
}

function ensureMonacoStyles(baseUrl) {
    if (document.querySelector("link[data-monaco-editor-css='1']"))
        return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${baseUrl}/vs/editor/editor.main.css`;
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

            if (existing.getAttribute("data-failed") === "1") {
                reject(new Error(`Failed to load ${src}`));
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
        script.addEventListener("error", () => {
            script.setAttribute("data-failed", "1");
            reject(new Error(`Failed to load ${src}`));
        }, { once: true });
        document.head.appendChild(script);
    });
}

function requireModules(modules) {
    return new Promise((resolve, reject) => {
        window.require(modules, resolve, reject);
    });
}

async function loadLanguageContribution(language) {
    const contribution = LANGUAGE_CONTRIBUTIONS[language];
    if (!contribution || !window.require)
        return;

    try {
        await requireModules([contribution]);
    } catch {
        // Keep the editor usable even when a language contribution fails.
    }
}

async function tryLoadMonaco(baseUrl) {
    await loadScript(`${baseUrl}/vs/loader.js`);
    ensureMonacoStyles(baseUrl);

    if (!window.require)
        throw new Error("Monaco loader unavailable");

    window.require.config({
        paths: {
            vs: `${baseUrl}/vs`,
        },
    });

    await requireModules(["vs/editor/editor.main"]);
    monacoBaseUrl = baseUrl;

    return window.monaco;
}

function ensureMonaco() {
    if (window.monaco?.editor)
        return Promise.resolve(window.monaco);

    if (!monacoLoadPromise) {
        monacoLoadPromise = (async () => {
            const candidates = getMonacoBaseCandidates();

            for (const candidate of candidates) {
                try {
                    return await tryLoadMonaco(candidate);
                } catch {
                    // Try next candidate origin.
                }
            }

            throw new Error("Unable to load Monaco from configured sources");
        })();
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
                .then(async monaco => {
                    if (cancelled || !containerRef.current)
                        return;

                    await loadLanguageContribution(language || "plaintext");
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

        let alive = true;
        loadLanguageContribution(language || "plaintext").then(() => {
            if (!alive || !editorRef.current || !monacoRef.current)
                return;

            const model = editorRef.current.getModel();
            if (model)
                monacoRef.current.editor.setModelLanguage(model, language || "plaintext");
        });

        return () => {
            alive = false;
        };
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
        <div className="ct-monaco-editor-wrap" style={{ height: height || "40vh" }} data-monaco-base-url={monacoBaseUrl || ""}>
            {!ready && <div className="ct-monaco-editor-loading"><Spinner size="md" /></div>}
            <div className="ct-monaco-editor" ref={containerRef} />
        </div>
    );
};

export default MonacoScriptEditor;
