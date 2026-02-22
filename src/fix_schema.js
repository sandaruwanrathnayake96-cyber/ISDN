const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Attempting to add delivery_address column...');

db.serialize(() => {
    db.run("ALTER TABLE orders ADD COLUMN delivery_address TEXT", (err) => {
        if (err) {
            console.error("Error (column might already exist):", err.message);
        } else {
            console.log("Success: delivery_address column added.");
        }
    });
});

db.close();
