import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@patternfly/react-core/dist/esm/components/Card";
import { CodeBlock, CodeBlockCode } from "@patternfly/react-core/dist/esm/components/CodeBlock";
import { EmptyState, EmptyStateFooter, EmptyStateHeader, EmptyStateVariant } from "@patternfly/react-core/dist/esm/components/EmptyState";
import { ExpandableSection } from "@patternfly/react-core/dist/esm/components/ExpandableSection";
import { Grid, GridItem } from "@patternfly/react-core/dist/esm/layouts/Grid";
import { Tab, TabTitleText, Tabs } from "@patternfly/react-core/dist/esm/components/Tabs";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar";

import cockpit from 'cockpit';
import ComposeEditorTab from './compose/ComposeEditorTab.jsx';
import ComposeHistoryTab from './compose/ComposeHistoryTab.jsx';
import ComposeProjectList from './compose/ComposeProjectList.jsx';
import ComposeSecretsPanel from './compose/ComposeSecretsPanel.jsx';
import ComposeServicesTab from './compose/ComposeServicesTab.jsx';
import ComposeStackAdminPanel from './compose/ComposeStackAdminPanel.jsx';
import { useComposeManager } from './compose/useComposeManager.js';

const _ = cockpit.gettext;

const ComposeManager = ({ onAddNotification }) => {
    const [isActionPanelExpanded, setIsActionPanelExpanded] = React.useState(true);
    const [isSecretsPanelExpanded, setIsSecretsPanelExpanded] = React.useState(false);
    const [isAdminPanelExpanded, setIsAdminPanelExpanded] = React.useState(false);

    const {
        activeTab,
        setActiveTab,
        rootPath,
        setRootPath,
        projects,
        selectedProject,
        setSelectedProjectId,
        isRunningAction,
        isDeleting,
        composeFiles,
        loadProjects,
        runAction,
        composeUp,
        composeStop,
        composeDown,
        composeRestart,
        composePull,
        composePullAndUp,
        composeRecreate,
        removeProject,
        actionSecretsText,
        setActionSecretsText,
        secretPassphrase,
        setSecretPassphrase,
        secretStorageBusy,
        hasSecretsOnDisk,
        saveSecretsToDisk,
        loadSecretsFromDisk,
        removeSecretsFromDisk,
        newProjectName,
        setNewProjectName,
        templateName,
        setTemplateName,
        isCreating,
        createProject,
        duplicateName,
        setDuplicateName,
        duplicateProject,
        renameName,
        setRenameName,
        renameProject,
        importProjectName,
        setImportProjectName,
        importFilePath,
        setImportFilePath,
        importFromFile,
        importContent,
        setImportContent,
        importFromContent,
        gitRepo,
        setGitRepo,
        gitBranch,
        setGitBranch,
        gitComposePath,
        setGitComposePath,
        importFromGit,
        selectedComposeFile,
        setSelectedComposeFile,
        newComposeFileName,
        setNewComposeFileName,
        createComposeVariantFile,
        loadingEditor,
        editorContent,
        setEditorContent,
        isSaving,
        saveCompose,
        showDiff,
        envContent,
        setEnvContent,
        isSavingEnv,
        saveEnv,
        selectedService,
        setSelectedService,
        services,
        runServiceRestart,
        serviceScale,
        setServiceScale,
        runServiceScale,
        serviceContainers,
        serviceLogs,
        serviceInspect,
        diffText,
        historyFiles,
        refreshHistory,
        restoreHistory,
    } = useComposeManager(onAddNotification);

    return (
        <Card id="containers-compose" className="containers-compose">
            <CardHeader>
                <CardTitle>{_("Compose stacks")}</CardTitle>
            </CardHeader>
            <CardBody>
                <Toolbar className="ct-compose-root-toolbar">
                    <ToolbarContent>
                        <ToolbarItem>
                            <TextInput id="compose-root-path" value={rootPath} onChange={(_, value) => setRootPath(value)} aria-label={_("Compose root path")} />
                        </ToolbarItem>
                        <ToolbarItem>
                            <Button variant="secondary" onClick={() => loadProjects(false)}>{_("Reload")}</Button>
                        </ToolbarItem>
                    </ToolbarContent>
                </Toolbar>

                <Grid hasGutter className="ct-compose-main-grid">
                    <GridItem md={4} lg={3}>
                        <ComposeProjectList
                            projects={projects}
                            selectedProject={selectedProject}
                            onSelectProject={setSelectedProjectId}
                        />
                    </GridItem>
                    <GridItem md={8} lg={9}>
                        {!selectedProject && (
                            <EmptyState variant={EmptyStateVariant.sm}>
                                <EmptyStateHeader titleText={_("Select a compose stack")} headingLevel="h3" />
                            </EmptyState>
                        )}

                        {selectedProject && (
                            <>
                                <Card isFlat className="ct-compose-selected-summary">
                                    <CardBody>
                                        <strong>{selectedProject.name}</strong>
                                        <div className="ct-grey-text">
                                            {cockpit.format(_("$0/$1 services running"), selectedProject.running || 0, selectedProject.total || 0)}
                                        </div>
                                    </CardBody>
                                </Card>

                                <ExpandableSection toggleText={_("Quick actions")}
                                                   isExpanded={isActionPanelExpanded}
                                                   onToggle={(_event, expanded) => setIsActionPanelExpanded(expanded)}
                                                   className="ct-compose-expandable">
                                    <Toolbar>
                                        <ToolbarContent>
                                            <ToolbarItem><Button isDisabled={isRunningAction} onClick={() => runAction(_("up"), composeUp, composeFiles)}>{_("Up")}</Button></ToolbarItem>
                                            <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("stop"), composeStop, composeFiles)}>{_("Stop")}</Button></ToolbarItem>
                                            <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("down"), composeDown, composeFiles)}>{_("Down")}</Button></ToolbarItem>
                                            <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("restart"), composeRestart, composeFiles)}>{_("Restart")}</Button></ToolbarItem>
                                            <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("pull"), composePull, composeFiles)}>{_("Pull")}</Button></ToolbarItem>
                                            <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("update"), composePullAndUp, composeFiles)}>{_("Update")}</Button></ToolbarItem>
                                            <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("recreate"), composeRecreate, composeFiles)}>{_("Recreate")}</Button></ToolbarItem>
                                            <ToolbarItem><Button isDisabled={isDeleting} variant="danger" onClick={removeProject}>{isDeleting ? _("Deleting") : _("Delete stack")}</Button></ToolbarItem>
                                        </ToolbarContent>
                                    </Toolbar>
                                </ExpandableSection>

                                <ExpandableSection toggleText={_("Secrets")}
                                                   isExpanded={isSecretsPanelExpanded}
                                                   onToggle={(_event, expanded) => setIsSecretsPanelExpanded(expanded)}
                                                   className="ct-compose-expandable">
                                    <ComposeSecretsPanel
                                        actionSecretsText={actionSecretsText}
                                        onActionSecretsTextChange={setActionSecretsText}
                                        secretPassphrase={secretPassphrase}
                                        onSecretPassphraseChange={setSecretPassphrase}
                                        secretStorageBusy={secretStorageBusy}
                                        hasSecretsOnDisk={hasSecretsOnDisk}
                                        onSaveSecrets={saveSecretsToDisk}
                                        onUnlockSecrets={loadSecretsFromDisk}
                                        onDeleteSecrets={removeSecretsFromDisk}
                                    />
                                </ExpandableSection>

                                <ExpandableSection toggleText={_("Stack setup and import")}
                                                   isExpanded={isAdminPanelExpanded}
                                                   onToggle={(_event, expanded) => setIsAdminPanelExpanded(expanded)}
                                                   className="ct-compose-expandable">
                                    <ComposeStackAdminPanel
                                        newProjectName={newProjectName}
                                        onNewProjectNameChange={setNewProjectName}
                                        templateName={templateName}
                                        onTemplateNameChange={setTemplateName}
                                        isCreating={isCreating}
                                        onCreateProject={createProject}
                                        duplicateName={duplicateName}
                                        onDuplicateNameChange={setDuplicateName}
                                        onDuplicateProject={duplicateProject}
                                        renameName={renameName}
                                        onRenameNameChange={setRenameName}
                                        onRenameProject={renameProject}
                                        importProjectName={importProjectName}
                                        onImportProjectNameChange={setImportProjectName}
                                        importFilePath={importFilePath}
                                        onImportFilePathChange={setImportFilePath}
                                        onImportFromFile={importFromFile}
                                        importContent={importContent}
                                        onImportContentChange={setImportContent}
                                        onImportFromContent={importFromContent}
                                        gitRepo={gitRepo}
                                        onGitRepoChange={setGitRepo}
                                        gitBranch={gitBranch}
                                        onGitBranchChange={setGitBranch}
                                        gitComposePath={gitComposePath}
                                        onGitComposePathChange={setGitComposePath}
                                        onImportFromGit={importFromGit}
                                    />
                                </ExpandableSection>

                                <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)} className="ct-compose-tabs">
                                    <Tab eventKey="editor" title={<TabTitleText>{_("Editor")}</TabTitleText>}>
                                        <ComposeEditorTab
                                            composeFiles={composeFiles}
                                            selectedComposeFile={selectedComposeFile}
                                            onSelectComposeFile={setSelectedComposeFile}
                                            newComposeFileName={newComposeFileName}
                                            onNewComposeFileNameChange={setNewComposeFileName}
                                            onCreateComposeVariantFile={createComposeVariantFile}
                                            loadingEditor={loadingEditor}
                                            editorContent={editorContent}
                                            onEditorContentChange={setEditorContent}
                                            isSaving={isSaving}
                                            onSaveCompose={saveCompose}
                                            onShowDiff={showDiff}
                                            envContent={envContent}
                                            onEnvContentChange={setEnvContent}
                                            isSavingEnv={isSavingEnv}
                                            onSaveEnv={saveEnv}
                                        />
                                    </Tab>

                                    <Tab eventKey="services" title={<TabTitleText>{_("Services")}</TabTitleText>}>
                                        <ComposeServicesTab
                                            selectedService={selectedService}
                                            onSelectedServiceChange={setSelectedService}
                                            services={services}
                                            isRunningAction={isRunningAction}
                                            onRunServiceRestart={runServiceRestart}
                                            serviceScale={serviceScale}
                                            onServiceScaleChange={setServiceScale}
                                            onRunServiceScale={runServiceScale}
                                            serviceContainers={serviceContainers}
                                            serviceLogs={serviceLogs}
                                            serviceInspect={serviceInspect}
                                        />
                                    </Tab>

                                    <Tab eventKey="diff" title={<TabTitleText>{_("Diff")}</TabTitleText>}>
                                        <CodeBlock>
                                            <CodeBlockCode>{diffText || _("No diff yet")}</CodeBlockCode>
                                        </CodeBlock>
                                    </Tab>

                                    <Tab eventKey="history" title={<TabTitleText>{_("History")}</TabTitleText>}>
                                        <ComposeHistoryTab
                                            historyFiles={historyFiles}
                                            onRefreshHistory={refreshHistory}
                                            onRestoreHistory={restoreHistory}
                                        />
                                    </Tab>
                                </Tabs>
                            </>
                        )}
                    </GridItem>
                </Grid>
                <EmptyStateFooter>
                    <small>{_("Use the collapsible sections to work step-by-step and keep the view focused.")}</small>
                </EmptyStateFooter>
            </CardBody>
        </Card>
    );
};

export default ComposeManager;
