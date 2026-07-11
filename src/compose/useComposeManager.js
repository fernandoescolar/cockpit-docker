import { useEffect, useMemo, useState } from 'react';
import cockpit from 'cockpit';

import {
    composeDiff,
    composeDown,
    composePull,
    composePullAndUp,
    composeRecreate,
    composeRestart,
    composeServiceInspect,
    composeServiceLogs,
    composeServiceRestart,
    composeServiceScale,
    composeStop,
    composeUp,
    createComposeProject,
    deleteComposeProject,
    deployComposeFromGit,
    duplicateComposeProject,
    importComposeFromContent,
    importComposeFromFile,
    isValidComposeProjectName,
    listComposeHistory,
    listComposeProjects,
    listComposeServices,
    listServiceContainers,
    parseEnvFile,
    readComposeFile,
    readProjectEnvFile,
    renameComposeProject,
    restoreComposeFromHistory,
    saveComposeSnapshot,
    stringifyEnvFile,
    writeComposeFile,
    writeProjectEnvFile,
} from './client-compose.js';
import {
    deleteEncryptedSecrets,
    hasEncryptedSecrets,
    loadEncryptedSecrets,
    saveEncryptedSecrets,
} from './secret-store.js';

const _ = cockpit.gettext;

const TEMPLATES = {
    minimal: `services:\n  app:\n    image: alpine:latest\n    command: ["sh", "-c", "while true; do sleep 3600; done"]\n`,
    web_db: `services:\n  web:\n    image: nginx:alpine\n    ports:\n      - "8080:80"\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_PASSWORD: example\n`,
};

function parseSecretEnv(text) {
    return (text || "")
            .split("\n")
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#") && line.includes("="))
            .reduce((acc, line) => {
                const idx = line.indexOf("=");
                acc[line.substring(0, idx)] = line.substring(idx + 1);
                return acc;
            }, {});
}

export function useComposeManager(onAddNotification) {
    const [activeTab, setActiveTab] = useState("editor");

    const [rootPath, setRootPath] = useState('/etc/docker/compose');
    const [projects, setProjects] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const [selectedComposeFile, setSelectedComposeFile] = useState("");
    const [editorContent, setEditorContent] = useState('');
    const [envContent, setEnvContent] = useState('');
    const [loadingEditor, setLoadingEditor] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingEnv, setIsSavingEnv] = useState(false);

    const [isRunningAction, setIsRunningAction] = useState(false);
    const [actionSecretsText, setActionSecretsText] = useState("");
    const [secretPassphrase, setSecretPassphrase] = useState("");
    const [hasSecretsOnDisk, setHasSecretsOnDisk] = useState(false);
    const [secretStorageBusy, setSecretStorageBusy] = useState(false);

    const [newProjectName, setNewProjectName] = useState('');
    const [templateName, setTemplateName] = useState("minimal");
    const [duplicateName, setDuplicateName] = useState("");
    const [renameName, setRenameName] = useState("");
    const [importProjectName, setImportProjectName] = useState("");
    const [importFilePath, setImportFilePath] = useState("");
    const [importContent, setImportContent] = useState("");
    const [gitRepo, setGitRepo] = useState("");
    const [gitBranch, setGitBranch] = useState("main");
    const [gitComposePath, setGitComposePath] = useState("compose.yaml");
    const [newComposeFileName, setNewComposeFileName] = useState("compose.override.yaml");

    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState("");
    const [serviceContainers, setServiceContainers] = useState([]);
    const [serviceLogs, setServiceLogs] = useState("");
    const [serviceInspect, setServiceInspect] = useState("");
    const [serviceScale, setServiceScale] = useState("1");

    const [diffText, setDiffText] = useState("");
    const [historyFiles, setHistoryFiles] = useState([]);

    const selectedProject = useMemo(
        () => (projects || []).find(project => project.id === selectedProjectId) || null,
        [projects, selectedProjectId]
    );

    const composeFiles = selectedProject?.composeFiles?.length ? selectedProject.composeFiles : (selectedProject ? [selectedProject.composeFile] : []);

    const loadProjects = async (keepSelection = true) => {
        setProjects(null);
        try {
            const list = await listComposeProjects(rootPath);
            setProjects(list);

            if (list.length === 0) {
                setSelectedProjectId(null);
                setSelectedComposeFile("");
                setEditorContent('');
                setEnvContent('');
                return;
            }

            const hasCurrentSelection = keepSelection && list.some(project => project.id === selectedProjectId);
            if (!hasCurrentSelection)
                setSelectedProjectId(list[0].id);
        } catch (ex) {
            setProjects([]);
            onAddNotification({ type: 'danger', error: _("Failed to load compose projects"), errorDetail: ex.message });
        }
    };

    const loadSelectedComposeFile = async (composeFile) => {
        if (!composeFile)
            return;

        setLoadingEditor(true);
        try {
            const content = await readComposeFile(composeFile);
            setEditorContent(content);
            setSelectedComposeFile(composeFile);
        } catch (ex) {
            onAddNotification({
                type: 'danger',
                error: cockpit.format(_("Failed to read compose file $0"), composeFile),
                errorDetail: ex.message,
            });
        } finally {
            setLoadingEditor(false);
        }
    };

    const loadEnv = async () => {
        if (!selectedProject)
            return;

        const content = await readProjectEnvFile(selectedProject.directory);
        setEnvContent(content);
    };

    const refreshServices = async () => {
        if (!selectedProject)
            return;

        const list = await listComposeServices(composeFiles);
        setServices(list);
        if (list.length > 0 && !list.some(entry => entry.name === selectedService))
            setSelectedService(list[0].name);
    };

    const refreshServiceDetails = async () => {
        if (!selectedProject || !selectedService)
            return;

        const [containers, logs, inspect] = await Promise.all([
            listServiceContainers(composeFiles, selectedService),
            composeServiceLogs(composeFiles, selectedService, 150),
            composeServiceInspect(composeFiles, selectedService),
        ]);

        setServiceContainers(containers);
        setServiceLogs(logs);
        setServiceInspect(inspect);
    };

    const refreshHistory = async () => {
        if (!selectedProject)
            return;
        const files = await listComposeHistory(selectedProject.directory);
        setHistoryFiles(files);
    };

    const refreshSecretStorageState = async () => {
        if (!selectedProject) {
            setHasSecretsOnDisk(false);
            return;
        }

        const hasSecrets = await hasEncryptedSecrets(selectedProject.directory);
        setHasSecretsOnDisk(hasSecrets);
    };

    useEffect(() => {
        loadProjects(false);
    }, []);

    useEffect(() => {
        if (!selectedProject)
            return;

        const composeFile = selectedProject.composeFiles?.[0] || selectedProject.composeFile;
        loadSelectedComposeFile(composeFile);
        loadEnv();
        refreshServices();
        refreshHistory();
        refreshSecretStorageState();
    }, [selectedProjectId]);

    useEffect(() => {
        if (!selectedProject || !selectedComposeFile)
            return;
        loadSelectedComposeFile(selectedComposeFile);
    }, [selectedComposeFile]);

    useEffect(() => {
        if (activeTab !== "services" || !selectedProject || !selectedService)
            return;

        refreshServiceDetails();
        const interval = window.setInterval(() => {
            refreshServiceDetails();
        }, 3000);

        return () => window.clearInterval(interval);
    }, [activeTab, selectedProjectId, selectedService]);

    const runAction = async (actionName, fn, ...args) => {
        if (!selectedProject)
            return;

        setIsRunningAction(true);
        const secretEnv = parseSecretEnv(actionSecretsText);

        try {
            await fn(...args, secretEnv);
            onAddNotification({
                type: 'success',
                error: cockpit.format(_("Compose $0 completed for $1"), actionName, selectedProject.name),
            });
            await loadProjects();
            await refreshServices();
        } catch (ex) {
            onAddNotification({
                type: 'danger',
                error: cockpit.format(_("Compose $0 failed for $1"), actionName, selectedProject.name),
                errorDetail: ex.message,
            });
        } finally {
            setIsRunningAction(false);
        }
    };

    const saveCompose = async () => {
        if (!selectedProject || !selectedComposeFile)
            return;

        setIsSaving(true);
        try {
            const oldContent = await readComposeFile(selectedComposeFile);
            await saveComposeSnapshot(selectedProject.directory, selectedComposeFile, oldContent);
            await writeComposeFile(selectedComposeFile, editorContent);
            await refreshHistory();
            onAddNotification({ type: 'success', error: cockpit.format(_("Saved compose file for $0"), selectedProject.name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to save compose file for $0"), selectedProject.name), errorDetail: ex.message });
        } finally {
            setIsSaving(false);
        }
    };

    const saveEnv = async () => {
        if (!selectedProject)
            return;

        setIsSavingEnv(true);
        try {
            await writeProjectEnvFile(selectedProject.directory, envContent);
            const parsed = parseEnvFile(envContent);
            const normalized = stringifyEnvFile(parsed);
            setEnvContent(normalized);
            onAddNotification({ type: 'success', error: cockpit.format(_("Saved .env for $0"), selectedProject.name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to save .env for $0"), selectedProject.name), errorDetail: ex.message });
        } finally {
            setIsSavingEnv(false);
        }
    };

    const showDiff = async () => {
        if (!selectedComposeFile)
            return;
        const { diff } = await composeDiff(selectedComposeFile, editorContent);
        setDiffText(diff);
        setActiveTab("diff");
    };

    const createProject = async () => {
        const name = newProjectName.trim();
        if (!isValidComposeProjectName(name)) {
            onAddNotification({ type: 'danger', error: _("Invalid project name"), errorDetail: _("Use letters, numbers, dot, underscore, or hyphen.") });
            return;
        }

        setIsCreating(true);
        try {
            const created = await createComposeProject(rootPath, name, "compose.yaml");
            await writeComposeFile(created.composeFile, TEMPLATES[templateName] || TEMPLATES.minimal);
            setNewProjectName('');
            await loadProjects(false);
            setSelectedProjectId(created.composeFile);
            onAddNotification({ type: 'success', error: cockpit.format(_("Created compose stack $0"), name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to create compose stack $0"), name), errorDetail: ex.message });
        } finally {
            setIsCreating(false);
        }
    };

    const duplicateProject = async () => {
        if (!selectedProject)
            return;

        const name = duplicateName.trim();
        if (!isValidComposeProjectName(name)) {
            onAddNotification({ type: 'danger', error: _("Invalid duplicate name") });
            return;
        }

        try {
            const created = await duplicateComposeProject(rootPath, selectedProject.directory, name);
            setDuplicateName("");
            await loadProjects(false);
            setSelectedProjectId(created.composeFile);
            onAddNotification({ type: 'success', error: cockpit.format(_("Duplicated stack as $0"), name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to duplicate stack as $0"), name), errorDetail: ex.message });
        }
    };

    const renameProject = async () => {
        if (!selectedProject)
            return;

        const name = renameName.trim();
        if (!isValidComposeProjectName(name)) {
            onAddNotification({ type: 'danger', error: _("Invalid new name") });
            return;
        }

        try {
            const renamed = await renameComposeProject(rootPath, selectedProject.directory, name);
            setRenameName("");
            await loadProjects(false);
            setSelectedProjectId(renamed.composeFile);
            onAddNotification({ type: 'success', error: cockpit.format(_("Renamed stack to $0"), name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to rename stack to $0"), name), errorDetail: ex.message });
        }
    };

    const removeProject = async () => {
        if (!selectedProject)
            return;

        const confirmed = window.confirm(cockpit.format(_("Delete compose stack $0?"), selectedProject.name));
        if (!confirmed)
            return;

        setIsDeleting(true);
        try {
            await deleteComposeProject(rootPath, selectedProject.directory);
            onAddNotification({ type: 'success', error: cockpit.format(_("Deleted compose stack $0"), selectedProject.name) });
            await loadProjects(false);
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to delete compose stack $0"), selectedProject.name), errorDetail: ex.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const importFromFile = async () => {
        const name = importProjectName.trim();
        if (!isValidComposeProjectName(name) || !importFilePath.trim()) {
            onAddNotification({ type: 'danger', error: _("Provide a valid project name and source file path") });
            return;
        }

        try {
            const created = await importComposeFromFile(rootPath, name, importFilePath.trim());
            await loadProjects(false);
            setSelectedProjectId(created.composeFile);
            onAddNotification({ type: 'success', error: cockpit.format(_("Imported compose stack $0"), name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to import compose stack $0"), name), errorDetail: ex.message });
        }
    };

    const importFromContent = async () => {
        const name = importProjectName.trim();
        if (!isValidComposeProjectName(name) || !importContent.trim()) {
            onAddNotification({ type: 'danger', error: _("Provide a valid project name and compose content") });
            return;
        }

        try {
            const created = await importComposeFromContent(rootPath, name, importContent);
            await loadProjects(false);
            setSelectedProjectId(created.composeFile);
            onAddNotification({ type: 'success', error: cockpit.format(_("Imported compose content as stack $0"), name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to import compose content as stack $0"), name), errorDetail: ex.message });
        }
    };

    const importFromGit = async () => {
        const name = importProjectName.trim();
        if (!isValidComposeProjectName(name) || !gitRepo.trim()) {
            onAddNotification({ type: 'danger', error: _("Provide a valid project name and git repository URL") });
            return;
        }

        try {
            const created = await deployComposeFromGit(rootPath, name, gitRepo.trim(), gitBranch.trim() || "main", gitComposePath.trim() || "compose.yaml");
            await loadProjects(false);
            setSelectedProjectId(created.composeFile);
            onAddNotification({ type: 'success', error: cockpit.format(_("Deployed stack $0 from git"), name) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to deploy stack $0 from git"), name), errorDetail: ex.message });
        }
    };

    const createComposeVariantFile = async () => {
        if (!selectedProject || !newComposeFileName.trim())
            return;

        const path = `${selectedProject.directory}/${newComposeFileName.trim()}`;
        try {
            await writeComposeFile(path, "services:\n");
            await loadProjects();
            setSelectedComposeFile(path);
            onAddNotification({ type: 'success', error: cockpit.format(_("Created compose file $0"), path) });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: cockpit.format(_("Failed to create compose file $0"), path), errorDetail: ex.message });
        }
    };

    const runServiceRestart = () => runAction(_("service restart"), composeServiceRestart, composeFiles, selectedService);
    const runServiceScale = () => runAction(_("service scale"), composeServiceScale, composeFiles, selectedService, Number(serviceScale || 1));

    const saveSecretsToDisk = async () => {
        if (!selectedProject || !secretPassphrase)
            return;

        setSecretStorageBusy(true);
        try {
            await saveEncryptedSecrets(selectedProject.directory, actionSecretsText, secretPassphrase);
            await refreshSecretStorageState();
            onAddNotification({ type: 'success', error: _("Encrypted secrets saved to disk") });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: _("Failed to save encrypted secrets"), errorDetail: ex.message });
        } finally {
            setSecretStorageBusy(false);
        }
    };

    const loadSecretsFromDisk = async () => {
        if (!selectedProject || !secretPassphrase)
            return;

        setSecretStorageBusy(true);
        try {
            const plaintext = await loadEncryptedSecrets(selectedProject.directory, secretPassphrase);
            setActionSecretsText(plaintext || "");
            onAddNotification({ type: 'success', error: _("Encrypted secrets loaded from disk") });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: _("Failed to decrypt secrets from disk"), errorDetail: ex.message });
        } finally {
            setSecretStorageBusy(false);
        }
    };

    const removeSecretsFromDisk = async () => {
        if (!selectedProject)
            return;

        setSecretStorageBusy(true);
        try {
            await deleteEncryptedSecrets(selectedProject.directory);
            setActionSecretsText("");
            await refreshSecretStorageState();
            onAddNotification({ type: 'success', error: _("Encrypted secrets deleted from disk") });
        } catch (ex) {
            onAddNotification({ type: 'danger', error: _("Failed to delete encrypted secrets"), errorDetail: ex.message });
        } finally {
            setSecretStorageBusy(false);
        }
    };

    const restoreHistory = async (historyFile) => {
        if (!selectedComposeFile)
            return;
        await restoreComposeFromHistory(historyFile, selectedComposeFile);
        await loadSelectedComposeFile(selectedComposeFile);
        onAddNotification({ type: 'success', error: _("Restored compose file from history") });
    };

    return {
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
    };
}
