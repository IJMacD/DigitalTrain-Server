const Controller = require('./controller');
const DeviceServer = require('./device_server');
const WebServer = require('./web_server');

const controller = new Controller();

new DeviceServer(controller);

new WebServer(controller);
