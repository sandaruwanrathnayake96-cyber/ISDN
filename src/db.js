const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT CHECK(role IN ('Customer', 'RDC', 'Driver', 'Manager')),
        full_name TEXT,
        email TEXT UNIQUE
    )`);

    // Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        price REAL,
        original_price REAL,
        category TEXT,
        image_url TEXT
    )`);

    // Inventory Table
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        rdc_location TEXT,
        quantity INTEGER,
        UNIQUE(product_id, rdc_location),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Orders Table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        status TEXT DEFAULT 'Pending', -- Pending, In Transit, Delivered, Completed
        total_amount REAL,
        payment_method TEXT DEFAULT 'Cash', -- Cash, Card
        payment_status TEXT DEFAULT 'Pending', -- Pending, Paid
        delivery_code TEXT UNIQUE,
        delivery_address TEXT,
        contact_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES users(id)
    )`);

    // Order Items Table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price REAL,
        UNIQUE(order_id, product_id),
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Deliveries Table
    db.run(`CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        driver_id INTEGER,
        route_details TEXT,
        status TEXT DEFAULT 'Assigned', -- Assigned, In Transit, Delivered
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(driver_id) REFERENCES users(id)
    )`);

    // Transfers Table
    db.run(`CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        quantity INTEGER,
        from_rdc TEXT,
        to_rdc TEXT,
        status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
        requested_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_date DATETIME,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Seed Data - Users
    // Passwords are plain text for this demo as per requirements implied simplicity, 
    // but in real app should be hashed.
    const users = [
        ['customer1', '123', 'Customer', 'customer1@example.com'],
        ['rdc1', '123', 'RDC', 'rdc1@example.com'],
        ['driver1', '123', 'Driver', 'driver1@example.com'],
        ['manager1', '123', 'Manager', 'manager1@example.com']
    ];

    const stmt = db.prepare("INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, ?, ?)");
    users.forEach(user => stmt.run(user));
    stmt.finalize();

    // Seed Data - Products
    // Existing 5 + New 8
    const products = [
        // Existing
        ['Tikiri Marie (80g)', 'Crispy and delicious Tikiri Marie biscuits.', 100.00, null, 'Snacks', '/images/product-1.jpg'],
        ['Coca Cola (1.5L)', 'Classic refreshing Coca Cola soft drink.', 350.00, null, 'Beverages', '/images/product-2.jpg'],
        ['Cadbury Dairy Milk Silk', 'Rich and creamy chocolate bar.', 450.00, null, 'Snacks', '/images/product-3.jpg'],
        ['Tropicana Tropical Fruit (1L)', '100% Mixed Fruit Juice.', 650.00, null, 'Beverages', 'https://via.placeholder.com/300?text=Tropicana+Juice'],
        ['Magic Vanilla Ice Cream', 'Creamy Vanilla Ice Cream tub (1L).', 800.00, null, 'Frozen', 'https://via.placeholder.com/300?text=Magic+Ice+Cream'],
        ['Mangoes (1kg)', 'Fresh juicy mangoes.', 117.00, 130.00, 'Fresh', 'https://via.placeholder.com/300?text=Mangoes'],
        ['Yellow Fin Tuna Can', 'Premium canned tuna.', 238.00, 280.00, 'Canned', 'https://via.placeholder.com/300?text=Tuna+Can'],
        ['Tomatoes (200g)', 'Fresh red tomatoes.', 119.00, 170.00, 'Fresh', 'https://via.placeholder.com/300?text=Tomatoes'],
        ['Mayonnaise', 'Rich and creamy mayonnaise.', 520.00, 650.00, 'Condiments', 'https://via.placeholder.com/300?text=Mayonnaise'],
        ['Dandex Shampoo', 'Anti-dandruff shampoo.', 235.00, 250.00, 'Personal Care', 'https://via.placeholder.com/300?text=Shampoo'],
        ['Dairy Milk Chocolate', 'Cadbury Dairy Milk Chocolate.', 225.00, 450.00, 'Snacks', 'https://via.placeholder.com/300?text=Dairy+Milk'],
        ['Maari Biscuits', 'Standard Maari Biscuits.', 95.00, 100.00, 'Snacks', 'https://via.placeholder.com/300?text=Maari+Biscuits'],
        ['Mixture Bites', 'Spicy mixture bites.', 230.00, 250.00, 'Snacks', 'https://via.placeholder.com/300?text=Mixture']
    ];

    const prodStmt = db.prepare("INSERT OR IGNORE INTO products (name, description, price, original_price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)");
    products.forEach(prod => prodStmt.run(prod));
    prodStmt.finalize();

    // Seed Data - Inventory (For product IDs 1-13)
    const inventory = [];
    for (let i = 1; i <= 13; i++) {
        inventory.push([i, 'Central RDC', Math.floor(Math.random() * 100) + 10]);
    }

    const invStmt = db.prepare("INSERT OR IGNORE INTO inventory (product_id, rdc_location, quantity) VALUES (?, ?, ?)");
    inventory.forEach(inv => invStmt.run(inv));
    invStmt.finalize();

    console.log("Database initialized and seeded.");
});

module.exports = db;
