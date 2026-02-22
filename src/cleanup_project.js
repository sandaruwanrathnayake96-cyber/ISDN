const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Starting Global Cleanup...");

    // 1. Inventory Deduplication (Consolidate quantity)
    // We already added UNIQUE constraint, but let's double check if any slipped in (unlikely due to constraint, but good for completeness logic)
    // Actually, if UNIQUE exists, INSERT OR IGNORE works or it fails. 
    // We'll check for any pre-existing duplicates if the constraint wasn't retroactively applied to old data (SQLite doesn't always check old data on ALTER TABLE unless rebuilt).
    // The previous cleanup script handled this, but let's re-run logic.
    db.run(`CREATE TABLE IF NOT EXISTS inventory_temp AS SELECT * FROM inventory GROUP BY product_id, rdc_location`);
    // Ideally we sum distincts first.

    const duplicateInventoryQuery = `
        SELECT product_id, rdc_location, COUNT(*) as count, SUM(quantity) as total_qty 
        FROM inventory 
        GROUP BY product_id, rdc_location 
        HAVING count > 1
    `;

    db.all(duplicateInventoryQuery, [], (err, rows) => {
        if (err) console.error("Inventory Check Error:", err);
        else if (rows.length > 0) {
            console.log(`Found ${rows.length} inventory duplicates. Cleaning...`);
            rows.forEach(row => {
                // Keep one, update quantity, delete rest
                db.get(`SELECT id FROM inventory WHERE product_id = ? AND rdc_location = ? LIMIT 1`, [row.product_id, row.rdc_location], (err, keep) => {
                    if (keep) {
                        db.run(`UPDATE inventory SET quantity = ? WHERE id = ?`, [row.total_qty, keep.id]);
                        db.run(`DELETE FROM inventory WHERE product_id = ? AND rdc_location = ? AND id != ?`, [row.product_id, row.rdc_location, keep.id]);
                    }
                });
            });
        } else {
            console.log("No inventory duplicates found.");
        }
    });

    // 2. Order Items Deduplication (Merge quantities if same product in same order)
    const duplicateOrderItemsQuery = `
        SELECT order_id, product_id, COUNT(*) as count, SUM(quantity) as total_qty 
        FROM order_items 
        GROUP BY order_id, product_id 
        HAVING count > 1
    `;

    db.all(duplicateOrderItemsQuery, [], (err, rows) => {
        if (err) console.error("Order Items Check Error:", err);
        else if (rows.length > 0) {
            console.log(`Found ${rows.length} order item duplicates. Merging...`);
            rows.forEach(row => {
                db.get(`SELECT id FROM order_items WHERE order_id = ? AND product_id = ? LIMIT 1`, [row.order_id, row.product_id], (err, keep) => {
                    if (keep) {
                        db.run(`UPDATE order_items SET quantity = ? WHERE id = ?`, [row.total_qty, keep.id]);
                        db.run(`DELETE FROM order_items WHERE order_id = ? AND product_id = ? AND id != ?`, [row.order_id, row.product_id, keep.id]);
                    }
                });
            });
        } else {
            console.log("No order item duplicates found.");
        }
    });

    // 3. User Deduplication (Safe check, strictly enforced by UNIQUE username)
    // Check if any username has > 1 entry (case insensitive)
    const duplicateUserQuery = `
        SELECT LOWER(username) as uname, COUNT(*) as count 
        FROM users 
        GROUP BY uname 
        HAVING count > 1
    `;

    db.all(duplicateUserQuery, [], (err, rows) => {
        if (err) console.error("User Check Error:", err);
        else if (rows.length > 0) {
            console.log(`Found ${rows.length} user duplicates (case-insensitive). Cleaning...`);
            rows.forEach(row => {
                // Keep the first one, delete others
                db.all(`SELECT id FROM users WHERE LOWER(username) = ? ORDER BY id ASC`, [row.uname], (err, users) => {
                    const [keep, ...remove] = users;
                    if (remove.length > 0) {
                        const removeIds = remove.map(u => u.id).join(',');
                        db.run(`DELETE FROM users WHERE id IN (${removeIds})`);
                        console.log(`Removed duplicate users for '${row.uname}': IDs ${removeIds}`);
                    }
                });
            });
        } else {
            console.log("No user duplicates found.");
        }
    });
});
