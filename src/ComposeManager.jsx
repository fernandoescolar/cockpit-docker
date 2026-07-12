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
import ComposeOverviewCards from './compose/ComposeOverviewCards.jsx';
import ComposeProjectList from './compose/ComposeProjectList.jsx';
import ComposeSecretsPanel from './compose/ComposeSecretsPanel.jsx';
import ComposeServicesTab from './compose/ComposeServicesTab.jsx';
import ComposeStackAdminPanel from './compose/ComposeStackAdminPanel.jsx';
import { useComposeManager } from './compose/useComposeManager.js';

const _ = cockpit.gettext;

const ComposeManager = ({ onAddNotification }) => {
    const [composeView, setComposeView] = React.useState("overview");
    const [isEditorSecretsExpanded, setIsEditorSecretsExpanded] = React.useState(false);
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
        runActionForProject,
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

    const onComposeViewSelect = (_event, key) => {
        setComposeView(key);
        if (key === "detail" && !["services", "history", "diff"].includes(activeTab))
            setActiveTab("services");
    };

    const onShowDiffFromEditor = async () => {
        await showDiff();
        setComposeView("detail");
    };

    const openProjectDetail = (project) => {
        setSelectedProjectId(project.id);
        setActiveTab("services");
        setComposeView("detail");
    };

    const openProjectEditor = (project) => {
        setSelectedProjectId(project.id);
        setComposeView("editor");
    };

    const runProjectAction = (project, actionName, fn) => {
        setSelectedProjectId(project.id);
        runActionForProject(project, actionName, fn);
    };

    const renderOverview = () => (
        <>
            <ComposeOverviewCards
                projects={projects}
                selectedProject={selectedProject}
                isRunningAction={isRunningAction}
                onSelectProject={setSelectedProjectId}
                onStart={project => runProjectAction(project, _("up"), composeUp)}
                onStop={project => runProjectAction(project, _("stop"), composeStop)}
                onRestart={project => runProjectAction(project, _("restart"), composeRestart)}
                onPull={project => runProjectAction(project, _("pull"), composePull)}
                onUpdate={project => runProjectAction(project, _("update"), composePullAndUp)}
                onOpenDetail={openProjectDetail}
                onOpenEditor={openProjectEditor}
            />

            <Toolbar className="ct-compose-actions-toolbar">
                <ToolbarContent>
                    <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("down"), composeDown, composeFiles)}>{_("Down selected")}</Button></ToolbarItem>
                    <ToolbarItem><Button isDisabled={isRunningAction} variant="secondary" onClick={() => runAction(_("recreate"), composeRecreate, composeFiles)}>{_("Recreate selected")}</Button></ToolbarItem>
                    <ToolbarItem><Button isDisabled={isDeleting} variant="danger" onClick={removeProject}>{isDeleting ? _("Deleting") : _("Delete selected")}</Button></ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            <ExpandableSection toggleText={_("Create, import, duplicate, or rename stacks")}
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
        </>
    );

    const renderDetail = () => (
        <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)} className="ct-compose-tabs">
            <Tab eventKey="services" title={<TabTitleText>{_("State, containers and logs")}</TabTitleText>}>
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

            <Tab eventKey="history" title={<TabTitleText>{_("History")}</TabTitleText>}>
                <ComposeHistoryTab
                    historyFiles={historyFiles}
                    onRefreshHistory={refreshHistory}
                    onRestoreHistory={restoreHistory}
                />
            </Tab>

            <Tab eventKey="diff" title={<TabTitleText>{_("Diff")}</TabTitleText>}>
                <CodeBlock>
                    <CodeBlockCode>{diffText || _("No diff yet")}</CodeBlockCode>
                </CodeBlock>
            </Tab>
        </Tabs>
    );

    const renderEditor = () => (
        <>
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
                onShowDiff={onShowDiffFromEditor}
                envContent={envContent}
                onEnvContentChange={setEnvContent}
                isSavingEnv={isSavingEnv}
                onSaveEnv={saveEnv}
            />

            <ExpandableSection toggleText={_("Secrets")}
                               isExpanded={isEditorSecretsExpanded}
                               onToggle={(_event, expanded) => setIsEditorSecretsExpanded(expanded)}
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
        </>
    );

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
                                        <div className="ct-grey-text">
                                            {cockpit.format(_("$0 compose files"), composeFiles.length)}
                                        </div>
                                    </CardBody>
                                </Card>

                                <Tabs activeKey={composeView} onSelect={onComposeViewSelect} className="ct-compose-view-tabs">
                                    <Tab eventKey="overview" title={<TabTitleText>{_("Overview")}</TabTitleText>}>
                                        {renderOverview()}
                                    </Tab>
                                    <Tab eventKey="detail" title={<TabTitleText>{_("Detail")}</TabTitleText>}>
                                        {renderDetail()}
                                    </Tab>
                                    <Tab eventKey="editor" title={<TabTitleText>{_("Editor")}</TabTitleText>}>
                                        {renderEditor()}
                                    </Tab>
                                </Tabs>
                            </>
                        )}
                    </GridItem>
                </Grid>
                <EmptyStateFooter>
                    <small>{_("Use Overview for quick operations, Detail for runtime visibility, and Editor for file changes.")}</small>
                </EmptyStateFooter>
            </CardBody>
        </Card>
    );
};

export default ComposeManager;
