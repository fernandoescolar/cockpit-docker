import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { ExpandableSection } from "@patternfly/react-core/dist/esm/components/ExpandableSection";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect";
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar";
import cockpit from 'cockpit';
import ScriptEditor from './ScriptEditor.jsx';

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
    const [isEnvExpanded, setIsEnvExpanded] = React.useState(false);

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
                <ScriptEditor value={editorContent}
                              onChange={onEditorContentChange}
                              language="yaml"
                              height="45vh"
                              rows={24}
                              isDisabled={loadingEditor} />
            </FormGroup>
            <Toolbar>
                <ToolbarContent>
                    <ToolbarItem><Button variant="primary" isDisabled={isSaving || loadingEditor} onClick={onSaveCompose}>{isSaving ? _("Saving") : _("Save")}</Button></ToolbarItem>
                    <ToolbarItem><Button variant="secondary" onClick={onShowDiff}>{_("Show diff")}</Button></ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            <ExpandableSection toggleText={_("Environment file (.env)")}
                               isExpanded={isEnvExpanded}
                               onToggle={(_event, expanded) => setIsEnvExpanded(expanded)}>
                <FormGroup fieldId="compose-env-editor"
                           helperText={_("Variables and templates per stack can be managed here")}>
                    <ScriptEditor value={envContent}
                                  onChange={onEnvContentChange}
                                  language="shell"
                                  height="20vh"
                                  rows={10} />
                    <Button variant="secondary" isDisabled={isSavingEnv} onClick={onSaveEnv}>{isSavingEnv ? _("Saving") : _("Save .env")}</Button>
                </FormGroup>
            </ExpandableSection>
        </>
    );
};

export default ComposeEditorTab;
