const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // 1. Check Table Info
    db.all("PRAGMA table_info(orders)", (err, rows) => {
        if (err) {
            console.error("Error getting table info:", err);
            return;
        }
        console.log("Columns in 'orders' table:");
        rows.forEach(row => console.log(`- ${row.name} (${row.type})`));

        // 2. Check Data
        console.log("\nRecent Orders:");
        db.all("SELECT id, contact_number, delivery_address FROM orders ORDER BY id DESC LIMIT 5", (err, rows) => {
            if (err) {
                console.error("Error getting orders:", err);
                return;
            }
            console.table(rows);
        });
    });
});
