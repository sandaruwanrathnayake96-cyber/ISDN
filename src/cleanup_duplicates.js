const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // 1. Check for Duplicate Products
    db.all("SELECT name, COUNT(*) as count FROM products GROUP BY name HAVING count > 1", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log("Duplicate Products:");
            console.table(rows);

            if (rows.length > 0) {
                console.log("Found duplicates. Cleaning up...");
                // Keep the one with the lowest ID (original)
                db.run(`
                    DELETE FROM products 
                    WHERE id NOT IN (
                        SELECT MIN(id) 
                        FROM products 
                        GROUP BY name
                    )
                `, function (err) {
                    if (err) console.error(err);
                    else console.log(`Deleted ${this.changes} duplicate products.`);
                });
            } else {
                console.log("No duplicate products found.");
            }
        }
    });

    // 2. Check for Duplicate Users (should be unique by username)
    db.all("SELECT username, COUNT(*) as count FROM users GROUP BY username HAVING count > 1", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log("Duplicate Users:");
            console.table(rows);
        }
    });

    // 3. Check for Duplicate Inventory Checks (Multiple entries for same product in same location)
    // Inventory table: product_id, rdc_location, quantity
    // We should probably group by product_id and rdc_location
    db.all("SELECT product_id, rdc_location, COUNT(*) as count FROM inventory GROUP BY product_id, rdc_location HAVING count > 1", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log("Duplicate Inventory Entries:");
            console.table(rows);

            if (rows.length > 0) {
                console.log("Found duplicate inventory. Consolidating...");
                // This is complex, better to just delete duplicates for now or sum them?
                // Let's just delete the extra rows
                db.run(`
                    DELETE FROM inventory
                    WHERE id NOT IN (
                        SELECT MIN(id)
                        FROM inventory
                        GROUP BY product_id, rdc_location
                    )
                 `, function (err) {
                    if (err) console.error(err);
                    else console.log(`Deleted ${this.changes} duplicate inventory entries.`);
                });
            }
        }
    });
});
