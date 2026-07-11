import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect";
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const ComposeStackAdminPanel = ({
    newProjectName,
    onNewProjectNameChange,
    templateName,
    onTemplateNameChange,
    isCreating,
    onCreateProject,
    duplicateName,
    onDuplicateNameChange,
    onDuplicateProject,
    renameName,
    onRenameNameChange,
    onRenameProject,
    importProjectName,
    onImportProjectNameChange,
    importFilePath,
    onImportFilePathChange,
    onImportFromFile,
    importContent,
    onImportContentChange,
    onImportFromContent,
    gitRepo,
    onGitRepoChange,
    gitBranch,
    onGitBranchChange,
    gitComposePath,
    onGitComposePathChange,
    onImportFromGit,
}) => {
    return (
        <>
            <Split hasGutter>
                <SplitItem isFilled>
                    <FormGroup fieldId="compose-create-stack" label={_("Create stack")}
                               helperText={_("Template variables can be adjusted in compose and .env editors.")}>
                        <TextInput value={newProjectName} placeholder={_("new-stack")} onChange={(_, value) => onNewProjectNameChange(value)} />
                        <FormSelect value={templateName} onChange={(_, value) => onTemplateNameChange(value)}>
                            <FormSelectOption value="minimal" label={_("Template: minimal")} />
                            <FormSelectOption value="web_db" label={_("Template: web + db")} />
                        </FormSelect>
                        <Button isDisabled={isCreating || !newProjectName.trim()} onClick={onCreateProject}>{isCreating ? _("Creating") : _("Create")}</Button>
                    </FormGroup>
                </SplitItem>
                <SplitItem isFilled>
                    <FormGroup fieldId="compose-duplicate-stack" label={_("Duplicate or rename stack")}
                               helperText={_("Advanced stack management operations")}>
                        <TextInput value={duplicateName} placeholder={_("duplicate-name")} onChange={(_, value) => onDuplicateNameChange(value)} />
                        <Button variant="secondary" isDisabled={!duplicateName.trim()} onClick={onDuplicateProject}>{_("Duplicate")}</Button>
                        <TextInput value={renameName} placeholder={_("new-name")} onChange={(_, value) => onRenameNameChange(value)} />
                        <Button variant="secondary" isDisabled={!renameName.trim()} onClick={onRenameProject}>{_("Rename")}</Button>
                    </FormGroup>
                </SplitItem>
            </Split>

            <FormGroup fieldId="compose-import-stack" label={_("Import stack")}
                       helperText={_("Import from existing compose file path or pasted compose content")}>
                <TextInput value={importProjectName} placeholder={_("imported-stack-name")} onChange={(_, value) => onImportProjectNameChange(value)} />
                <TextInput value={importFilePath} placeholder={_("/path/to/compose.yaml")} onChange={(_, value) => onImportFilePathChange(value)} />
                <Button variant="secondary" isDisabled={!importProjectName.trim() || !importFilePath.trim()} onClick={onImportFromFile}>{_("Import from file")}</Button>
                <TextArea rows={5} value={importContent} placeholder={_("Paste compose YAML here")}
                          onChange={(_, value) => onImportContentChange(value)} />
                <Button variant="secondary" isDisabled={!importProjectName.trim() || !importContent.trim()} onClick={onImportFromContent}>{_("Import from content")}</Button>
                <TextInput value={gitRepo} placeholder={_("https://example.com/repo.git")}
                           onChange={(_, value) => onGitRepoChange(value)} />
                <Split hasGutter>
                    <SplitItem isFilled>
                        <TextInput value={gitBranch} placeholder={_("main")}
                                   onChange={(_, value) => onGitBranchChange(value)} />
                    </SplitItem>
                    <SplitItem isFilled>
                        <TextInput value={gitComposePath} placeholder={_("compose.yaml")}
                                   onChange={(_, value) => onGitComposePathChange(value)} />
                    </SplitItem>
                    <SplitItem>
                        <Button variant="secondary" isDisabled={!importProjectName.trim() || !gitRepo.trim()} onClick={onImportFromGit}>{_("Deploy from git")}</Button>
                    </SplitItem>
                </Split>
            </FormGroup>
        </>
    );
};

export default ComposeStackAdminPanel;
