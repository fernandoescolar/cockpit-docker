import cockpit from 'cockpit';

const COMPOSE_FILE_NAMES = [
    "compose.yaml",
    "compose.yml",
    "docker-compose.yaml",
    "docker-compose.yml",
];
const HISTORY_DIR_NAME = ".cockpit-compose-history";

let composeCommandPromise;

const run = (argv, options = {}) => {
    const extraEnv = options.extraEnv || {};
    const extraEnvList = Object.entries(extraEnv)
            .filter(([key]) => !!key)
            .map(([key, value]) => `${key}=${value ?? ""}`);
    const spawnOptions = {
        superuser: "require",
        err: "message",
        environ: ["LC_ALL=C", ...extraEnvList],
        ...options,
    };
    delete spawnOptions.extraEnv;

    return cockpit.spawn(argv, spawnOptions);
};

async function getComposeCommand() {
    if (!composeCommandPromise) {
        composeCommandPromise = (async () => {
            try {
                await run(["docker", "compose", "version"], { err: "ignore" });
                return ["docker", "compose"];
            } catch {
                await run(["podman", "compose", "version"], { err: "ignore" });
                return ["podman", "compose"];
            }
        })();
    }

    return composeCommandPromise;
}

function normalizeLines(output) {
    if (!output)
        return [];

    return output.split("\n").map(s => s.trim()).filter(Boolean);
}

function toPosixPath(path) {
    return (path || "").replace(/\/+$/, "") || "/";
}

function shellSingleQuote(s) {
    return `'${String(s).replace(/'/g, `'"'"'`)}'`;
}

function isPathInside(rootPath, candidatePath) {
    const root = toPosixPath(rootPath);
    const candidate = toPosixPath(candidatePath);

    return candidate === root || candidate.startsWith(root + "/");
}

function composeFilePriority(path) {
    const fileName = path.split("/").pop();
    const index = COMPOSE_FILE_NAMES.indexOf(fileName);
    return index === -1 ? COMPOSE_FILE_NAMES.length : index;
}

function composeArgs(composeFiles) {
    const files = Array.isArray(composeFiles) ? composeFiles : [composeFiles];
    return files.flatMap(file => ["-f", file]);
}

function historyDirFor(projectDirectory) {
    return `${projectDirectory}/${HISTORY_DIR_NAME}`;
}

async function listComposeFilesInDirectory(directory) {
    const output = await run(["find", directory, "-maxdepth", "1", "-type", "f"], { err: "ignore" }).catch(() => "");
    return normalizeLines(output)
            .filter(path => COMPOSE_FILE_NAMES.includes(path.split("/").pop()))
            .sort((a, b) => composeFilePriority(a) - composeFilePriority(b));
}

function guessProjectName(directory) {
    const parts = directory.split("/").filter(Boolean);
    return parts[parts.length - 1] || directory;
}

async function getComposeStatus(composeFile) {
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];

    const [servicesOut, runningOut] = await Promise.all([
        run([...compose, ...composeArgs(files), "config", "--services"], { err: "ignore" }).catch(() => ""),
        run([...compose, ...composeArgs(files), "ps", "--status", "running", "--services"], { err: "ignore" }).catch(() => ""),
    ]);

    const services = normalizeLines(servicesOut);
    const runningServices = normalizeLines(runningOut);

    if (services.length === 0) {
        return {
            status: "unknown",
            running: 0,
            total: 0,
        };
    }

    if (runningServices.length === 0) {
        return {
            status: "stopped",
            running: 0,
            total: services.length,
        };
    }

    if (runningServices.length === services.length) {
        return {
            status: "running",
            running: runningServices.length,
            total: services.length,
        };
    }

    return {
        status: "degraded",
        running: runningServices.length,
        total: services.length,
    };
}

async function listComposeFiles(rootPath) {
    const argv = ["find", rootPath, "-type", "f"];

    const output = await run(argv, { err: "ignore" }).catch(() => "");
    return normalizeLines(output).filter(path => {
        const fileName = path.split("/").pop();
        return COMPOSE_FILE_NAMES.includes(fileName);
    });
}

export async function listComposeProjects(rootPath) {
    const files = await listComposeFiles(rootPath);

    const filesByDirectory = new Map();
    files.forEach(path => {
        const directory = path.substring(0, path.lastIndexOf("/"));
        const current = filesByDirectory.get(directory);

        if (!current || composeFilePriority(path) < composeFilePriority(current))
            filesByDirectory.set(directory, path);
    });

    const preferredFiles = Array.from(filesByDirectory.values());

    const projects = await Promise.all(preferredFiles.map(async composeFile => {
        const directory = composeFile.substring(0, composeFile.lastIndexOf("/"));
        const composeFiles = await listComposeFilesInDirectory(directory);
        const status = await getComposeStatus(composeFiles.length > 0 ? composeFiles : composeFile);

        return {
            id: composeFile,
            name: guessProjectName(directory),
            directory,
            composeFile,
            composeFiles,
            ...status,
        };
    }));

    return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export function readComposeFile(path) {
    const file = cockpit.file(path, { superuser: "require" });
    return file.read().then(content => content ?? "");
}

export function writeComposeFile(path, content) {
    const file = cockpit.file(path, { superuser: "require" });
    return file.replace(content);
}

export function parseEnvFile(content) {
    return normalizeLines(content)
            .filter(line => !line.startsWith("#"))
            .map(line => {
                const idx = line.indexOf("=");
                if (idx === -1)
                    return { key: line, value: "" };

                return { key: line.substring(0, idx), value: line.substring(idx + 1) };
            });
}

export function stringifyEnvFile(entries) {
    return entries
            .filter(entry => entry.key)
            .map(entry => `${entry.key}=${entry.value ?? ""}`)
            .join("\n") + "\n";
}

export function readProjectEnvFile(projectDirectory) {
    return readComposeFile(`${projectDirectory}/.env`).catch(() => "");
}

export function writeProjectEnvFile(projectDirectory, content) {
    return writeComposeFile(`${projectDirectory}/.env`, content);
}

export function isValidComposeProjectName(name) {
    return /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name || "");
}

export async function createComposeProject(rootPath, projectName, fileName = "compose.yaml") {
    if (!isValidComposeProjectName(projectName))
        throw new Error("Invalid project name");

    if (!COMPOSE_FILE_NAMES.includes(fileName))
        throw new Error("Invalid compose file name");

    const directory = toPosixPath(rootPath) + "/" + projectName;
    const composeFile = directory + "/" + fileName;

    await run(["mkdir", "-p", directory]);
    await writeComposeFile(composeFile, `services:\n  app:\n    image: alpine:latest\n    command: [\"sh\", \"-c\", \"while true; do sleep 3600; done\"]\n`);

    return { directory, composeFile };
}

export async function duplicateComposeProject(rootPath, sourceDirectory, targetProjectName) {
    if (!isValidComposeProjectName(targetProjectName))
        throw new Error("Invalid project name");

    if (!isPathInside(rootPath, sourceDirectory))
        throw new Error("Source path is outside of compose root");

    const targetDirectory = toPosixPath(rootPath) + "/" + targetProjectName;
    await run(["cp", "-a", sourceDirectory, targetDirectory]);
    const files = await listComposeFilesInDirectory(targetDirectory);

    return {
        directory: targetDirectory,
        composeFile: files[0] || `${targetDirectory}/compose.yaml`,
    };
}

export async function renameComposeProject(rootPath, sourceDirectory, targetProjectName) {
    if (!isValidComposeProjectName(targetProjectName))
        throw new Error("Invalid project name");

    if (!isPathInside(rootPath, sourceDirectory))
        throw new Error("Source path is outside of compose root");

    const targetDirectory = toPosixPath(rootPath) + "/" + targetProjectName;
    await run(["mv", sourceDirectory, targetDirectory]);
    const files = await listComposeFilesInDirectory(targetDirectory);

    return {
        directory: targetDirectory,
        composeFile: files[0] || `${targetDirectory}/compose.yaml`,
    };
}

export async function importComposeFromFile(rootPath, projectName, sourceFilePath) {
    const created = await createComposeProject(rootPath, projectName, "compose.yaml");
    await run(["cp", sourceFilePath, created.composeFile]);
    return created;
}

export async function importComposeFromContent(rootPath, projectName, content, fileName = "compose.yaml") {
    const created = await createComposeProject(rootPath, projectName, fileName);
    await writeComposeFile(created.composeFile, content);
    return created;
}

export async function deployComposeFromGit(rootPath, projectName, gitUrl, gitBranch = "main", composeRelativePath = "compose.yaml") {
    if (!isValidComposeProjectName(projectName))
        throw new Error("Invalid project name");

    const created = await createComposeProject(rootPath, projectName, "compose.yaml");
    const tmpDir = `/tmp/cockpit-compose-${projectName}-${Date.now()}`;

    try {
        await run(["git", "clone", "--depth", "1", "--branch", gitBranch, gitUrl, tmpDir]);
        const sourcePath = `${tmpDir}/${composeRelativePath}`;
        await run(["cp", sourcePath, created.composeFile]);
    } finally {
        await run(["rm", "-rf", tmpDir], { err: "ignore" }).catch(() => undefined);
    }

    return created;
}

export async function deleteComposeProject(rootPath, projectDirectory) {
    if (!isPathInside(rootPath, projectDirectory))
        throw new Error("Project path is outside of compose root");

    await run(["rm", "-rf", projectDirectory]);
}

export async function composeUp(composeFile) {
    const extraEnv = arguments[1] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "up", "-d"], { extraEnv });
}

export async function composeDown(composeFile) {
    const extraEnv = arguments[1] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "down"], { extraEnv });
}

export async function composeRestart(composeFile) {
    const extraEnv = arguments[1] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "restart"], { extraEnv });
}

export async function composePullAndUp(composeFile) {
    const extraEnv = arguments[1] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    await run([...compose, ...composeArgs(files), "pull"], { extraEnv });
    return run([...compose, ...composeArgs(files), "up", "-d"], { extraEnv });
}

export async function composePull(composeFile) {
    const extraEnv = arguments[1] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "pull"], { extraEnv });
}

export async function composeStop(composeFile) {
    const extraEnv = arguments[1] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "stop"], { extraEnv });
}

export async function composeRecreate(composeFile) {
    const extraEnv = arguments[1] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "up", "-d", "--force-recreate"], { extraEnv });
}

export async function listComposeServices(composeFile) {
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    const [allOut, runningOut] = await Promise.all([
        run([...compose, ...composeArgs(files), "config", "--services"], { err: "ignore" }).catch(() => ""),
        run([...compose, ...composeArgs(files), "ps", "--status", "running", "--services"], { err: "ignore" }).catch(() => ""),
    ]);

    const all = normalizeLines(allOut);
    const runningSet = new Set(normalizeLines(runningOut));

    return all.map(name => ({
        name,
        running: runningSet.has(name),
        status: runningSet.has(name) ? "running" : "stopped",
    }));
}

export async function listServiceContainers(composeFile, serviceName) {
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    const idsOut = await run([...compose, ...composeArgs(files), "ps", "-q", serviceName], { err: "ignore" }).catch(() => "");
    const ids = normalizeLines(idsOut);
    if (ids.length === 0)
        return [];

    const format = "{{.Id}}\t{{.Name}}\t{{.State.Status}}\t{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}\t{{.State.Error}}";
    const inspectOut = await run(["docker", "inspect", "--format", format, ...ids], { err: "ignore" }).catch(() => "");
    return normalizeLines(inspectOut).map(line => {
        const [id, name, status, health, error] = line.split("\t");
        return { id, name, status, health, error };
    });
}

export async function composeServiceLogs(composeFile, serviceName, tail = 100) {
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "logs", "--tail", String(tail), serviceName], { err: "ignore" }).catch(() => "");
}

export async function composeServiceInspect(composeFile, serviceName) {
    const containers = await listServiceContainers(composeFile, serviceName);
    if (containers.length === 0)
        return "";

    return run(["docker", "inspect", containers[0].id], { err: "ignore" });
}

export async function composeServiceRestart(composeFile, serviceName) {
    const extraEnv = arguments[2] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "restart", serviceName], { extraEnv });
}

export async function composeServiceScale(composeFile, serviceName, replicas) {
    const extraEnv = arguments[3] || {};
    const compose = await getComposeCommand();
    const files = Array.isArray(composeFile) ? composeFile : [composeFile];
    return run([...compose, ...composeArgs(files), "up", "-d", "--scale", `${serviceName}=${replicas}`], { extraEnv });
}

export async function composeDiff(composeFile, currentContent) {
    const original = await readComposeFile(composeFile);
    const command = [
        "sh",
        "-ec",
        `tmp=$(mktemp); cat > "$tmp" <<'EOF'\n${currentContent}\nEOF\ndiff -u ${shellSingleQuote(composeFile)} "$tmp" || true\nrm -f "$tmp"`,
    ];
    const diff = await run(command, { err: "ignore" }).catch(() => "");

    return {
        original,
        diff: diff || _fallbackDiff(original, currentContent),
    };
}

function _fallbackDiff(oldText, newText) {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const out = ["--- current", "+++ edited"];
    const max = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < max; i++) {
        const a = oldLines[i];
        const b = newLines[i];
        if (a === b)
            continue;
        if (a !== undefined)
            out.push("-" + a);
        if (b !== undefined)
            out.push("+" + b);
    }

    return out.join("\n");
}

export async function saveComposeSnapshot(projectDirectory, composeFile, content) {
    const historyDir = historyDirFor(projectDirectory);
    await run(["mkdir", "-p", historyDir]);

    const baseName = composeFile.split("/").pop();
    const stamp = new Date().toISOString().replace(/[.:]/g, "-");
    const file = `${historyDir}/${stamp}-${baseName}`;
    await writeComposeFile(file, content);
    return file;
}

export async function listComposeHistory(projectDirectory) {
    const historyDir = historyDirFor(projectDirectory);
    const output = await run(["find", historyDir, "-maxdepth", "1", "-type", "f"], { err: "ignore" }).catch(() => "");
    return normalizeLines(output).sort((a, b) => b.localeCompare(a));
}

export function restoreComposeFromHistory(historyFile, composeFile) {
    return run(["cp", historyFile, composeFile]);
}
