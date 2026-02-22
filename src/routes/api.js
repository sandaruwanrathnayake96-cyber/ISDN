const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendOrderConfirmation } = require('../utils/mailer');

// --- Products ---
router.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- Orders ---
// Place Order
router.post('/orders', (req, res) => {
    const { customer_id, items, total_amount, payment_method, payment_status, delivery_address, contact_number } = req.body;

    if (!customer_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid order data' });
    }

    const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Start transaction (simplified as serialized calls)
    db.run('INSERT INTO orders (customer_id, total_amount, payment_method, payment_status, delivery_code, delivery_address, contact_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer_id, total_amount, payment_method || 'Cash', payment_status || 'Pending', deliveryCode, delivery_address || '', contact_number || ''], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: 'Failed to create order' });
            }

            const orderId = this.lastID;
            const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');

            items.forEach(item => {
                stmt.run([orderId, item.product_id, item.quantity, item.price]);
            });
            stmt.finalize();

            // Send Confirmation Email
            db.get('SELECT email, username FROM users WHERE id = ?', [customer_id], (err, user) => {
                if (!err && user && user.email) {
                    sendOrderConfirmation(user.email, {
                        id: orderId,
                        delivery_code: deliveryCode,
                        total_amount: total_amount,
                        items: items,
                        delivery_address: delivery_address,
                        contact_number: contact_number
                    });
                }
            });

            res.json({ success: true, orderId: orderId, message: 'Order placed successfully' });
        });
});

// Get Orders (All or by Customer)
router.get('/orders', (req, res) => {
    const { customer_id, role } = req.query;

    let query = `
        SELECT o.id, o.status, o.total_amount, o.created_at, o.delivery_code, o.delivery_address, o.contact_number, u.username as customer_name 
        FROM orders o 
        JOIN users u ON o.customer_id = u.id
    `;
    let params = [];

    if (role === 'Customer' && customer_id) {
        query += ' WHERE o.customer_id = ?';
        params.push(customer_id);
    }

    query += ' ORDER BY o.created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update Order Status (RDC/Driver)
router.put('/orders/:id/status', (req, res) => {
    const { status, code } = req.body;
    const { id } = req.params;

    if (status === 'Delivered') {
        db.get('SELECT delivery_code FROM orders WHERE id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Order not found' });

            if (row.delivery_code !== code) {
                return res.status(400).json({ success: false, error: 'Invalid Delivery Code' });
            }

            updateStatus(id, status, res);
        });
    } else {
        updateStatus(id, status, res);
    }
});

function updateStatus(id, status, res) {
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Order status updated' });
    });
}

// --- Inventory (RDC) ---
router.get('/inventory', (req, res) => {
    const query = `
        SELECT i.id, p.name as product_name, i.quantity, i.rdc_location 
        FROM inventory i 
        JOIN products p ON i.product_id = p.id
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.put('/inventory/:id', (req, res) => {
    const { quantity } = req.body;
    const { id } = req.params;

    db.run('UPDATE inventory SET quantity = ? WHERE id = ?', [quantity, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Inventory updated' });
    });
});

// --- Deliveries (Driver) ---
// Assign Driver to Order (Manager/RDC) - distinct from 'deliveries' table management for simplicity in this demo
// We will just use the orders table status for tracking mostly, but let's have a route to simulate driver tasks
// --- Deliveries (Driver View) ---
router.get('/deliveries', (req, res) => {
    const { driver_id, type } = req.query;

    let statusFilter = "('Pending', 'In Transit')";
    if (type === 'history') {
        statusFilter = "('Delivered', 'Completed')";
    }

    let query = `
        SELECT o.*, u.full_name, u.username 
        FROM orders o
        JOIN users u ON o.customer_id = u.id
    `;

    const params = [];

    if (driver_id) {
        query += ` JOIN deliveries d ON o.id = d.order_id WHERE d.driver_id = ? AND o.status IN ${statusFilter}`;
        params.push(driver_id);
    } else {
        // Fallback or Admin view
        query += ` WHERE o.status IN ${statusFilter}`;
    }

    query += ` ORDER BY o.created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- Reports (Manager) ---
router.get('/reports/stats', (req, res) => {
    const stats = {};

    db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
        if (err) return;
        stats.totalOrders = row.count;

        db.get('SELECT SUM(total_amount) as total FROM orders', (err, row) => {
            if (err) return;
            stats.totalRevenue = row.total || 0;

            db.get('SELECT COUNT(*) as count FROM users WHERE role="Customer"', (err, row) => {
                if (err) return;
                stats.totalCustomers = row.count;
                res.json(stats);
            });
        });
    });
});

router.get('/reports/sales', (req, res) => {
    // Aggregated sales by date
    const query = `
        SELECT date(created_at) as date, COUNT(*) as count, SUM(total_amount) as total 
        FROM orders 
        GROUP BY date(created_at) 
        ORDER BY date(created_at) DESC
        LIMIT 30
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/reports/inventory', (req, res) => {
    // Low stock items (< 20)
    const query = `
        SELECT p.name, i.quantity, i.rdc_location 
        FROM inventory i 
        JOIN products p ON i.product_id = p.id 
        WHERE i.quantity < 15
        ORDER BY i.quantity ASC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/reports/kpi', (req, res) => {
    const kpi = { drivers: [], rdc: [] };

    // Driver KPI: Completed deliveries
    // Start serial queries
    /* 
       Note: In a real app, these would be separate or more complex queries. 
       For now, we mock some RDC data or derive what we can.
    */

    // 1. Driver Performance (Orders Delivered) - deriving from orders table for simplicity as we don't have strict driver mapping in orders for historical data in this demo
    // We will list all drivers and their 'assigned' count from users table context
    db.all("SELECT id, username, full_name FROM users WHERE role='Driver'", [], (err, drivers) => {
        if (err) return res.status(500).json({ error: err.message });

        // Mocking 'deliveries completed' for the demo as we just added the system
        kpi.drivers = drivers.map(d => ({
            name: d.full_name || d.username,
            deliveries: Math.floor(Math.random() * 50) + 10, // Simulated history
            rating: (4 + Math.random()).toFixed(1)
        }));

        res.json(kpi);
    });
});

// --- Transfers (Manager/RDC) ---
router.get('/transfers', (req, res) => {
    const query = `
        SELECT t.*, p.name as product_name 
        FROM transfers t 
        JOIN products p ON t.product_id = p.id 
        ORDER BY t.requested_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/transfers', (req, res) => {
    const { product_id, quantity, from_rdc, to_rdc } = req.body;
    db.run('INSERT INTO transfers (product_id, quantity, from_rdc, to_rdc) VALUES (?, ?, ?, ?)',
        [product_id, quantity, from_rdc, to_rdc], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Transfer requested' });
        });
});

router.put('/transfers/:id', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    const approved_date = status === 'Approved' ? new Date().toISOString() : null;

    db.run('UPDATE transfers SET status = ?, approved_date = ? WHERE id = ?', [status, approved_date, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // If approved, strictly we should update inventory, but for this demo we'll just mark the transfer
        res.json({ success: true, message: `Transfer ${status}` });
    });
});

// --- User Management (Manager) ---
router.get('/users', (req, res) => {
    const { role } = req.query;
    let query = "SELECT id, username, full_name, role, email FROM users";
    let params = [];

    if (role) {
        query += " WHERE role = ?";
        params.push(role);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/users/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT id, username, role, full_name, email FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(row);
    });
});

router.put('/orders/:id/payment', (req, res) => {
    const { payment_status } = req.body;
    const { id } = req.params;
    db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Payment status updated' });
    });
});

router.post('/deliveries', (req, res) => {
    const { order_id, driver_id } = req.body;
    // 1. Create delivery record
    db.run('INSERT INTO deliveries (order_id, driver_id, status) VALUES (?, ?, ?)',
        [order_id, driver_id, 'Assigned'], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // 2. Update order status to 'In Transit' (or 'Assigned' if we supported it, but 'In Transit' triggers the driver view)
            // Actually 'Pending' orders are also seen by drivers in current code. 
            // Let's set it to 'In Transit' to indicate it's moving.
            db.run("UPDATE orders SET status = 'In Transit' WHERE id = ?", [order_id], (err) => {
                if (err) console.error(err);
            });

            res.json({ success: true, message: 'Driver assigned' });
        });
});

router.put('/users/:id', (req, res) => {
    const { role } = req.body;
    const { id } = req.params;
    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'User updated' });
    });
});

router.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'User deleted' });
    });
});

// --- Exports ---
router.get('/reports/sales/export', (req, res) => {
    const query = `
        SELECT o.id as OrderID, u.username as Customer, o.total_amount as Amount, 
               o.status as Status, o.payment_method as PaymentMethod, o.created_at as Date
        FROM orders o 
        JOIN users u ON o.customer_id = u.id
        ORDER BY o.created_at DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) return res.send("No data to export");

        const headers = Object.keys(rows[0]).join(',');
        const csv = rows.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
        const content = headers + '\n' + csv;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=MonthlySales.csv');
        res.send(content);
    });
});

router.get('/reports/inventory/export', (req, res) => {
    const query = `
        SELECT p.name as Product, i.quantity as Quantity, i.rdc_location as Location
        FROM inventory i 
        JOIN products p ON i.product_id = p.id
        ORDER BY i.rdc_location, p.name
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) return res.send("No data to export");

        const headers = Object.keys(rows[0]).join(',');
        const csv = rows.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
        const content = headers + '\n' + csv;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=InventoryLog.csv');
        res.send(content);
    });
});

module.exports = router;
