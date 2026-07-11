import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect";
import { CodeEditor } from "@patternfly/react-code-editor";
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const ComposeEditorTab = ({
    composeFiles,
    selectedComposeFile,
    onSelectComposeFile,
    newComposeFileName,
    onNewComposeFileNameChange,
    onCreateComposeVariantFile,
    loadingEditor,
    editorContent,
    onEditorContentChange,
    isSaving,
    onSaveCompose,
    onShowDiff,
    envContent,
    onEnvContentChange,
    isSavingEnv,
    onSaveEnv,
}) => {
    return (
        <>
            <FormGroup fieldId="compose-file-select" label={_("Compose files")}
                       helperText={_("Multiple files are passed in order to compose commands")}>
                <FormSelect value={selectedComposeFile} onChange={(_, value) => onSelectComposeFile(value)}>
                    {composeFiles.map(path => <FormSelectOption key={path} value={path} label={path} />)}
                </FormSelect>
                <Split hasGutter>
                    <SplitItem isFilled>
                        <TextInput value={newComposeFileName} onChange={(_, value) => onNewComposeFileNameChange(value)} />
                    </SplitItem>
                    <SplitItem>
                        <Button variant="secondary" onClick={onCreateComposeVariantFile}>{_("Add compose file")}</Button>
                    </SplitItem>
                </Split>
            </FormGroup>

            <FormGroup fieldId="compose-file-editor" label={cockpit.format(_("Editing: $0"), selectedComposeFile)}>
                <CodeEditor isLanguageLabelVisible isLineNumbersVisible isReadOnly={loadingEditor}
                            language="yaml" code={editorContent} height="45vh"
                            onChange={value => onEditorContentChange(value ?? "")} />
            </FormGroup>
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem><Button variant="primary" isDisabled={isSaving || loadingEditor} onClick={onSaveCompose}>{isSaving ? _("Saving") : _("Save")}</Button></ToolbarItem>
                    <ToolbarItem><Button variant="secondary" onClick={onShowDiff}>{_("Show diff")}</Button></ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            <FormGroup fieldId="compose-env-editor" label={_(".env editor")}
                       helperText={_("Variables and templates per stack can be managed here")}>
                <CodeEditor isLanguageLabelVisible isLineNumbersVisible language="shell"
                            code={envContent} height="20vh"
                            onChange={value => onEnvContentChange(value ?? "")} />
                <Button variant="secondary" isDisabled={isSavingEnv} onClick={onSaveEnv}>{isSavingEnv ? _("Saving") : _("Save .env")}</Button>
            </FormGroup>
        </>
    );
};

export default ComposeEditorTab;
