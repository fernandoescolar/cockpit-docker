import cockpit from "cockpit";

function manage_error(reject, error, content) {
    let content_o = {};
    if (content) {
        try {
            content_o = JSON.parse(content);
        } catch {
            content_o.message = content;
        }
    }
    const c = { ...error, ...content_o };
    reject(c);
}

function connect(address, system) {
    /* This doesn't create a channel until a request */
    const http = cockpit.http(address, { superuser: system ? "require" : null });
    const connection = {};

    connection.monitor = function(options, callback, system, return_raw) {
        return new Promise((resolve, reject) => {
            let buffer = "";

            http.request(options)
                    .stream(data => {
                        if (return_raw)
                            callback(data);
                        else {
                            buffer += data;
                            const chunks = buffer.split("\n");
                            buffer = chunks.pop();

                            chunks.forEach(chunk => callback(JSON.parse(chunk)));
                        }
                    })
                    .catch((error, content) => {
                        manage_error(reject, error, content);
                    })
                    .then(resolve);
        });
    };

    connection.call = function (options) {
        // console.log("connection.call", options);
        return new Promise((resolve, reject) => {
            options = options || {};
            http.request(options)
                    .then(resolve)
                    .catch((error, content) => {
                        manage_error(reject, error, content);
                    });
        });
    };

    connection.close = function () {
        http.close();
    };

    return connection;
}

/*
 * Connects to the docker service, performs a single call, and closes the
 * connection.
 */
async function call (address, system, parameters) {
    const connection = connect(address, system);
    const result = await connection.call(parameters);
    connection.close();
    // if (parameters.method === "GET")
    //     return result;

    // let p = {};
    // try {
    //     p = JSON.parse(result);
    // } catch {
    //     p = result;
    // }
    // console.log("call", { method: parameters.method, path: parameters.path, system, parameters, result: p });

    return result;
}

export default {
    connect,
    call
};
