const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Check for duplicate product names (fuzzy)
    const query = `
        SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) as count 
        FROM products 
        GROUP BY normalized_name 
        HAVING count > 1
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error checking duplicates:", err);
            return;
        }

        if (rows.length === 0) {
            console.log("No fuzzy duplicate product names found.");
        } else {
            console.log("Fuzzy duplicate products found:");
            console.table(rows);

            // For each duplicate group, list the IDs
            rows.forEach(row => {
                db.all("SELECT id, name FROM products WHERE LOWER(TRIM(name)) = ?", [row.normalized_name], (err, items) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    console.log(`IDs for '${row.normalized_name}':`, items.map(i => i.id).join(', '));
                });
            });
        }
    });

    // 2. Check schema for strict UNIQUE constraint
    db.all("PRAGMA index_list(products)", [], (err, rows) => {
        console.log("\nIndexes on 'products':");
        console.table(rows);
    });
});
