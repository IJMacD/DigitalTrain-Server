const net = require('net');
const port = process.env.PORT || 4472;
const http = require('http');
const http_port = 8080;
const fs = require('fs');
const querystring = require('querystring');
const path = require('path');

/** @typedef {import('net').Socket} Socket */

/**
 * How often to send speed update packets
 */
const COM_INTERVAL = 1000;

let DEBUG = 1;

/**
 * @typedef Client
 * @prop {Socket} socket
 * @prop {number} id
 * @prop {string} [name]
 * @prop {Date} [start]
 * @prop {boolean} [light]
 * @prop {number} [speed]
 */

/** @type {Map<Socket, Client>} */
const pool = new Map();
let id = 0;

/**
 * 
 * @param {Client} client 
 * @param {string} message 
 */
function logClient (client, message) {
    if (DEBUG >= 1) {
        const pre = process.stdout.isTTY ? `\u001b[2K\u001b[1G` : "";
        process.stdout.write(`${pre}${new Date().toISOString().substr(11,8)} (${client.id}) ${client.name || client.socket.remoteAddress} ${message}\n`);
    }
}

/**
 *  
 * @param {string} name 
 */
function findClientByName (name) {
    return [...pool.values()].find(client => client.name === name);
}

const server = net.createServer(socket => {
    // socket.setTimeout(200); // Does this stop the server blocking on one client?
    const client = { socket, name: null, id: id++, start: new Date(), light: false, speed: 0 };
    pool.set(socket, client);

    logClient(client, "New Connection");
    
    // Send init packet
    client.socket.write("speed,0,light,0\n");

    socket.on("data", buffer => {
        const t = buffer.toString();

        const parts = t.split(",");

        for (let i = 0; i + 1 < parts.length; i += 2) {
            const field = parts[i];
            /** @type {string|boolean} */
            let value = parts[i + 1];

            if (DEBUG >= 2) {
                logClient(client, `${field} ${value}`);
            }

            if (value === "on") value = true;
            if (value === "off") value = false;

            if (field === "id") {
                logClient(client, `identified as ${value}`)
                client.name = value;
            } else {
                client[field] = value;
            }
        }
    });

    socket.on("close", () => {
        logClient(client, "disconnected");
        pool.delete(socket);
    });

    socket.on("end", () => {
        logClient(client, "end");
    });

    socket.on("error", e => {
        logClient(client, e.toString());
    });
});

function setDeviceProp(client, prop, value) {
    if (typeof value === "boolean") {
        client.socket.write(`${prop},${value ? "1" : "0"}\n`);
        logClient(client, `${ucfirst(prop)} ${value?"on":"off"}`);
    } else {
        client.socket.write(`${prop},${value}\n`);
        logClient(client, `${ucfirst(prop)} ${value}`);
    }
}

function allStop () {
    for (const device of pool.values()) {
        stopDevice(device);
    }
}

function stopDevice (client) {
    client.socket.write(`stop\n`);
    client.speed = 0;
    logClient(client, `STOP`);
}

/**
 * Send keep alive speed packets
 */
function comLoop () {
    for (const client of pool.values()) {
        client.socket.write(`?\n`);
        if (DEBUG >= 2) {
            process.stdout.write(`\u001b[2K\u001b[1G${new Date().toISOString()} ${client.name} ping\n`);
        }
    }
    if (DEBUG >= 1 && process.stdout.isTTY) {
        process.stdout.write(`\u001b[1G${new Date().toISOString().substr(11,8)} ${pool.size} client(s) (${[...pool.values()].map(c => c.name).join(", ")})`);
    }
}

setInterval(comLoop, COM_INTERVAL);

server.listen(port);
console.log("Listening on port " + port);

const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === "/update") {
        if (req.method === "POST") {
            const body = await streamToString(req);
            const { name, ...props } = querystring.parse(body);
            if (name) {
                for (const prop in props) {
                    const p = props[prop];
                    /** @type {string|boolean} */
                    let value = Array.isArray(p) ? p[0] : p;
                    if (value === "on") {
                        value = true;
                    }
                    else if (value === "off") {
                        value = false;
                    }
                    
                    if (name === "all") {
                        if (prop === "stop") allStop();
                        else [...pool.values()].forEach(c => setDeviceProp(c, prop, value));
                        res.write("ok");
                    } else {
                        const client = findClientByName(name.toString());
                        if (client) {
                            if (prop === "stop") stopDevice(client);
                            else setDeviceProp(client, prop, value);
                            res.write("ok");
                        }
                    }
                }
            }
        }
    } else if (req.url === "/status") {
        res.setHeader("Content-Type", "application/json");
        const map = {};
        for (const client of pool.values()) {
            const { socket, id, ...obj } = client;
            map[client.name] = obj;
        }
        res.write(JSON.stringify(Object.values(map)));
    } else {
        let filename = path.join(__dirname, "public", req.url);
        if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
            filename = "public/index.html";
        }
        res.write(fs.readFileSync(filename));
    }
    res.end();
});

httpServer.listen(http_port);
console.log("Listening for HTTP on port " + http_port);

/**
 * 
 * @param {import('stream').Stream} stream 
 * @returns {Promise<string>}
 */
function streamToString (stream) {
    return new Promise((resolve, reject) => {
        let data = "";
    
        stream.on("data", buff => data += buff.toString());

        stream.on("end", () => resolve(data));

        stream.on("error", reject);
    });
}

/**
 * 
 * @param {string} str 
 */
function ucfirst (str) {
    return str.substr(0,1).toUpperCase() + str.substr(1);
}