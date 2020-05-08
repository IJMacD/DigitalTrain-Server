const { ucfirst } = require('./util');

const net = require('net');
const port = process.env.PORT || 4472;

/** @typedef {import('net').Socket} Socket */

/**
 * How often to send speed update packets
 */
const COM_INTERVAL = 1000;

let DEBUG = 1;

/**
 * @typedef Client
 * @prop {Socket} socket
 * @prop {number} n
 * @prop {string} id
 * @prop {Date} start
 */

/** @type {Map<Socket, Client>} */
const pool = new Map();
let client_count = 0;

/**
 * 
 * @param {Client} client 
 * @param {string} message 
 */
function logClient (client, message) {
    if (DEBUG >= 1) {
        const pre = process.stdout.isTTY ? `\u001b[2K\u001b[1G` : "";
        process.stdout.write(`${pre}${new Date().toISOString().substr(11,8)} (${client.n}) ${client.id || client.socket.remoteAddress} ${message}\n`);
    }
}

/**
 *  
 * @param {string} id 
 */
function findClientById (id) {
    return [...pool.values()].find(client => client.id === id);
}

class DeviceServer {
    /**
     * 
     * @param {import('./controller')} controller 
     */
    constructor (controller) {
        const server = net.createServer(socket => {
            // socket.setTimeout(200); // Does this stop the server blocking on one client?
            const client = { socket, id: null, n: client_count++, start: new Date() };
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
                        logClient(client, `identified as ${value}`);
                        controller.activateDevice(value);
                    }
                    else 
                        controller.reportDevice(client.id, field, value);
                }
            });

            socket.on("close", () => {
                logClient(client, "disconnected");
                pool.delete(socket);
                controller.deactivateDevice(client.id);
            });

            socket.on("end", () => {
                logClient(client, "end");
            });

            socket.on("error", e => {
                logClient(client, e.toString());
            });
        });

        controller.addListener((device_id, prop, value) => {
            const client = findClientById(device_id);
            if (client) {
                if (prop === "stop") stopDevice(client);
                else setDeviceProp(client, prop, value);
            }
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
                    process.stdout.write(`\u001b[2K\u001b[1G${new Date().toISOString()} ${client.id} ping\n`);
                }
            }
            if (DEBUG >= 1 && process.stdout.isTTY) {
                process.stdout.write(`\u001b[1G${new Date().toISOString().substr(11,8)} ${pool.size} client(s) (${[...pool.values()].map(c => c.id).join(", ")})`);
            }
        }

        setInterval(comLoop, COM_INTERVAL);

        server.listen(port);
        console.log("Listening on port " + port);
    }
}

module.exports = DeviceServer;