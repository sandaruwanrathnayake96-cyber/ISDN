const db = require('../db');

/**
 * Controller to handle product retrieval logic.
 * Demonstrates separation of route definition from business logic.
 */
exports.getAllProducts = (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};
