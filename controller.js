const sqlite3 = require('sqlite3');

const db = new sqlite3.Database("master.db");

class Controller {
    constructor () {
        /** @type {Function[]} */
        this.listeners = [];

        this.unidentifiedDevices = [];

        db.parallelize(() => {
            db.all("SELECT * FROM blocks", (err, rows) => {
                if (!err) {
                    this.blocks = rows.map(r => {
                        const { id, name, dummy, diagram_x0, diagram_y0, diagram_x1, diagram_y1, path } = r;

                        const position = dummy ? [ diagram_x0, diagram_y0 ] : [ diagram_x0, diagram_y0, diagram_x1, diagram_y1 ];

                        return {
                            id,
                            name,
                            position,
                            occupied: null,
                            reserved: null,
                            path,
                        };
                    });
                }
            });

            db.all("SELECT * FROM links", (err, rows) => {
                if (!err) {
                    this.links = rows.map(r => {
                        const { in_id, in_index, out_id, out_index, point_id, point_index } = r;

                        const out = {
                            in: [ in_id, in_index ],
                            out: [ out_id, out_index ],
                        };

                        if (point_id) {
                            out.point = [ point_id, point_index ];
                        }

                        return out;
                    });
                }
            });

            db.all("SELECT * FROM points", (err, rows) => {
                if (!err) {
                    this.points = rows.map(r => {
                        const { id } = r;

                        return { id, active_index: 0};
                    });
                }
            });

            db.all("SELECT * FROM locomotives", (err, rows) => {
                if (!err) {
                    this.locomotives = rows.map(r => {
                        return {
                            ...r,
                            active: false,
                            block: null,
                            light: false,
                            speed: 0,
                        }
                    });
                }
            });
        });
    }

    addListener (callback) {
        this.listeners.push(callback);
    }

    removeListener (callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    emit (id, prop, value=null) {
        for (const listener of this.listeners) {
            listener(id, prop, value);
        }
    }

    activateDevice (id) {
        const loco = this.locomotives.find(l => l.device_id === id);
        if (loco) {
            loco.active = true;
            loco.block = this.blocks[0].id;
            this.blocks[0].occupied = loco.id;
        } else {
            this.unidentifiedDevices.push({ id, start: new Date });
        }
    }

    deactivateDevice (id) {
        const loco = this.locomotives.find(l => l.device_id === id);
        if (loco) {
            loco.active = true;
            if (loco.block) {
                const block = this.blocks.find(b => b.id === loco.block);
                block.occupied = null;
            }
        } else {
            this.unidentifiedDevices = this.unidentifiedDevices.filter(d => d.id !== id);
        }
    }

    allStop () {
        for (const loco of this.locomotives) {
            loco.speed = 0;
            this.emit(loco.device_id, "stop");
        }
    }

    stopDevice (device_id) {
        const loco = this.locomotives.find(l => l.device_id === device_id);
        if (loco) {
            loco.speed = 0;
            this.emit(device_id, "stop");
        }
    }

    setDeviceProp (device_id, prop, value) {
        const loco = this.locomotives.find(l => l.device_id === device_id);
        if (loco) {
            loco[prop] = value;
            this.emit(device_id, prop, value);
        }
    }

    reportDevice (device_id, prop, value) {
        const loco = this.locomotives.find(l => l.device_id === device_id);
        if (loco) {
            loco[prop] = value;
        }
    }
}

module.exports = Controller;