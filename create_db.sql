BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "sensors" (
	"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"block_id"	INTEGER,
	"block_index"	INTEGER,
	"device_id"	TEXT,
	"device_index"	INTEGER
);
CREATE TABLE IF NOT EXISTS "points" (
	"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"pair_point"	INTEGER,
	"device_id"	TEXT,
	"device_index"	INTEGER
);
CREATE TABLE IF NOT EXISTS "locomotives" (
	"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"name"	TEXT,
	"device_id"	TEXT UNIQUE,
	"wheelbase"	REAL,
	"buffer_length"	REAL,
	"coupler_length"	REAL,
	"image"	BLOB
);
CREATE TABLE IF NOT EXISTS "links" (
	"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"in_id"	INTEGER,
	"in_index"	INTEGER,
	"out_id"	INTEGER,
	"out_index"	INTEGER,
	"point_id"	INTEGER,
	"point_index"	INTEGER,
	"path"	TEXT
);
CREATE TABLE IF NOT EXISTS "blocks" (
	"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"name"	TEXT,
	"dummy"	INTEGER DEFAULT 0,
	"diagram_x0"	INTEGER,
	"diagram_y0"	INTEGER,
	"diagram_x1"	INTEGER,
	"diagram_y1"	INTEGER,
	"path"	TEXT
);
COMMIT;
