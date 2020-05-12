const { streamToString } = require('./util');

const http = require('http');
const http_port = 8080;
const fs = require('fs');
const querystring = require('querystring');
const path = require('path');

class WebServer {
    /**
     * 
     * @param {import('./controller')} controller 
     */
    constructor (controller) {
        const httpServer = http.createServer(async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            if (req.url === "/update") {
                if (req.method === "POST") {
                    const body = await streamToString(req);
                    const { id, ...props } = querystring.parse(body);
                    
                    if (id) {
                        for (const prop in props) {
                            const p = props[prop];

                            /** @type {string|number|boolean} */
                            let value = Array.isArray(p) ? p[0] : p;
                            if (value === "on") {
                                value = true;
                            }
                            else if (value === "off") {
                                value = false;
                            }

                            if (!isNaN(+value)) {
                                value = +value;
                            }
                        
                            if (prop === "stop") {
                                if (id === "all") controller.allStop();
                                else controller.stopDevice(id);
                            }
                            else controller.setDeviceProp(id, prop, value);
                            
                            res.write("ok");
                        }
                    }
                }
                res.end();
            } else if (req.url === "/status") {
                res.setHeader("Content-Type", "application/json");

                const { blocks, links, points, locomotives, devices } = controller;

                res.write(JSON.stringify({
                    devices,
                    blocks,
                    links,
                    points,
                    locomotives,
                }));
                res.end();
            } else {
                let fileid = path.join(__dirname, "public", req.url);
                if (!fs.existsSync(fileid) || !fs.statSync(fileid).isFile()) {
                    fileid = "public/index.html";
                }
                res.write(fs.readFileSync(fileid));
                res.end();
            }
        });

        httpServer.listen(http_port);
        console.log("Listening for HTTP on port " + http_port);
    }
}

module.exports = WebServer;