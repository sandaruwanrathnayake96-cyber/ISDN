const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Applying Constraints Migration...");

    // --- Users (Add UNIQUE email) ---
    db.run(`CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT CHECK(role IN ('Customer', 'RDC', 'Driver', 'Manager')),
        full_name TEXT,
        email TEXT UNIQUE
    )`);
    // Copy data (ignoring specific duplicates if any somehow remain, but we cleaned them)
    db.run(`INSERT OR IGNORE INTO users_new SELECT * FROM users`);
    db.run(`DROP TABLE users`);
    db.run(`ALTER TABLE users_new RENAME TO users`);
    console.log("Users table updated.");

    // --- Orders (Add UNIQUE delivery_code) ---
    db.run(`CREATE TABLE IF NOT EXISTS orders_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        status TEXT DEFAULT 'Pending',
        total_amount REAL,
        payment_method TEXT DEFAULT 'Cash',
        payment_status TEXT DEFAULT 'Pending',
        delivery_code TEXT UNIQUE,
        delivery_address TEXT,
        contact_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES users(id)
    )`);
    db.run(`INSERT OR IGNORE INTO orders_new SELECT * FROM orders`);
    db.run(`DROP TABLE orders`);
    db.run(`ALTER TABLE orders_new RENAME TO orders`);
    console.log("Orders table updated.");

    // --- Order Items (Add UNIQUE(order_id, product_id)) ---
    db.run(`CREATE TABLE IF NOT EXISTS order_items_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price REAL,
        UNIQUE(order_id, product_id),
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);
    db.run(`INSERT OR IGNORE INTO order_items_new SELECT * FROM order_items`);
    db.run(`DROP TABLE order_items`);
    db.run(`ALTER TABLE order_items_new RENAME TO order_items`);
    console.log("Order Items table updated.");

    console.log("Migration Complete.");
});
