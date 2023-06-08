import rest from './rest.js';

const DOCKER_SYSTEM_ADDRESS = "/var/run/docker.sock";
export const VERSION = "/v1.43";

export function getAddress(system) {
    return DOCKER_SYSTEM_ADDRESS;
}

function dockerCall(name, method, args, system, body) {
    const options = {
        method,
        path: VERSION + name,
        body: body || "",
        params: args,
    };

    if (method === "POST" && body)
        options.headers = { "Content-Type": "application/json" };

    // console.log("dockerCall", options);

    return rest.call(getAddress(system), system, options);
}

function dockerMonitor(name, method, args, callback, system) {
    const options = {
        method,
        path: VERSION + name,
        body: "",
        params: args,
    };

    // console.log("dockerMonitor", options);

    const connection = rest.connect(getAddress(system), system);
    return connection.monitor(options, callback, system);
}

export function streamEvents(system, callback) {
    return new Promise((resolve, reject) => {
        dockerMonitor("/events", "GET", {}, callback, system)
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export function getInfo(system) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
        dockerCall("/info", "GET", {}, system)
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject)
                .finally(() => clearTimeout(timeout));
    });
}

export function getContainers(system, id) {
    return new Promise((resolve, reject) => {
        const options = { all: true };
        if (id)
            options.filters = JSON.stringify({ id: [id] });

        dockerCall("/containers/json", "GET", options, system)
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export const getContainerStats = (system, id, callback) => dockerMonitor("/containers/" + id + "/stats", "GET", { stream: true }, callback, system);

export function inspectContainer(system, id) {
    return new Promise((resolve, reject) => {
        const options = {
            size: false // set true to display filesystem usage
        };
        dockerCall("/containers/" + id + "/json", "GET", options, system)
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export const delContainer = (system, id, force) => dockerCall("/containers/" + id, "DELETE", { force }, system);

export const renameContainer = (system, id, config) => dockerCall("/containers/" + id + "/rename", "POST", config, system);

export function createContainer(system, config) {
    return new Promise((resolve, reject) => {
        dockerCall("/containers/create", "POST", {}, system, JSON.stringify(config))
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export const commitContainer = (system, commitData) => dockerCall("/commit", "POST", commitData, system);

export const postContainer = (system, action, id, args) => dockerCall("/containers/" + id + "/" + action, "POST", args, system);

export const runHealthcheck = (system, id) => dockerCall("/containers/" + id + "/healthcheck", "GET", {}, system);

// export const postPod = (system, action, id, args) => dockerCall("/pods/" + id + "/" + action, "POST", args, system);
export const postPod = (system, action, id, args) => new Promise((resolve, reject) => reject(new Error("not implemented")));

// export const delPod = (system, id, force) => dockerCall("/pods/" + id, "DELETE", { force }, system);
export const delPod = (system, id, force) => new Promise((resolve, reject) => reject(new Error("not implemented")));

// export const createPod = (system, config) => dockerCall("/pods/create", "POST", {}, system, JSON.stringify(config));
export const createPod = (system, config) => new Promise((resolve, reject) => reject(new Error("not implemented")));

export function execContainer(system, id) {
    const args = {
        AttachStderr: true,
        AttachStdout: true,
        AttachStdin: true,
        Tty: true,
        Cmd: ["/bin/sh"],
    };

    return new Promise((resolve, reject) => {
        dockerCall("/containers/" + id + "/exec", "POST", {}, system, JSON.stringify(args))
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export function resizeContainersTTY(system, id, exec, width, height) {
    const args = {
        h: height,
        w: width,
    };

    let point = "containers/";
    if (!exec)
        point = "exec/";

    console.log("resizeContainersTTY", point + id + "/resize", args);
    return dockerCall("/" + point + id + "/resize", "POST", args, system);
}

function parseImageInfo(info) {
    const image = {};

    if (info.Config) {
        image.Entrypoint = info.Config.Entrypoint;
        image.Command = info.Config.Cmd;
        image.Ports = Object.keys(info.Config.ExposedPorts || {});
        image.Env = info.Config.Env;
    }
    image.Author = info.Author;

    return image;
}

export function getImages(system, id) {
    return new Promise((resolve, reject) => {
        const options = {};
        if (id)
            options.filters = JSON.stringify({ id: [id] });
        dockerCall("/images/json", "GET", options, system)
                .then(reply => {
                    const immages = JSON.parse(reply);
                    const images = {};
                    const promises = [];

                    for (const image of immages || []) {
                        images[image.Id] = image;
                        promises.push(dockerCall("/images/" + image.Id + "/json", "GET", {}, system));
                    }

                    Promise.all(promises)
                            .then(replies => {
                                for (const reply of replies) {
                                    const info = JSON.parse(reply);
                                    images[info.Id] = Object.assign(images[info.Id], parseImageInfo(info));
                                    images[info.Id].isSystem = system;
                                }
                                resolve(images);
                            })
                            .catch(reject);
                })
                .catch(reject);
    });
}

export function getPods(system, id) {
    // return new Promise((resolve, reject) => {
    //     const options = {};
    //     if (id)
    //         options.filters = JSON.stringify({ id: [id] });
    //     dockerCall("/pods/json", "GET", options, system)
    //             .then(reply => resolve(JSON.parse(reply)))
    //             .catch(reject);
    // });
    return new Promise((resolve, reject) => reject(new Error("not implemented")));
}

export function delImage(system, id, force) {
    return new Promise((resolve, reject) => {
        const options = {
            force,
        };
        dockerCall("/images/" + id, "DELETE", options, system)
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export const untagImage = (system, id, repo, tag) => dockerCall("/images/" + id + "/untag", "POST", { repo, tag }, system);

export function pullImage(system, reference) {
    return new Promise((resolve, reject) => {
        const options = {
            fromImage: reference,
        };
        dockerCall("/images/create", "POST", options, system)
                .then(r => {
                    // Need to check the last response if it contains error
                    const responses = r.trim().split("\n");
                    const response = JSON.parse(responses[responses.length - 1]);
                    if (response.error) {
                        response.message = response.error;
                        reject(response);
                    } else if (response.cause) // present for 400 and 500 errors
                        reject(response);
                    else
                        resolve();
                })
                .catch(reject);
    });
}

export function pruneUnusedImages(system) {
    return new Promise((resolve, reject) => {
        const options = {
            filters: JSON.stringify({ dangling: ["false"] }),
        };
        dockerCall("/images/prune", "POST", options, system).then(resolve)
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export function imageHistory(system, id) {
    return new Promise((resolve, reject) => {
        dockerCall(`/images/${id}/history`, "GET", {}, system)
                .then(reply => resolve(JSON.parse(reply)))
                .catch(reject);
    });
}

export const imageExists = (system, id) => dockerCall("/images/" + id + "/json", "GET", {}, system);
