const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?', [username, username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (!row) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // In a real app, generate a JWT or set a session here.
        // For this demo, we return the role so the frontend can redirect.
        res.json({ success: true, role: row.role, user: { id: row.id, username: row.username, email: row.email, full_name: row.full_name } });
    });
});

router.post('/register', (req, res) => {
    const { full_name, email, password, role } = req.body;

    // Validate role
    const allowedRoles = ['Customer', 'Driver'];
    const assignedRole = allowedRoles.includes(role) ? role : 'Customer';

    if (!email || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Use email as username
    const username = email;

    // Check if user exists
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (row) return res.status(400).json({ success: false, message: 'Email already registered' });

        // Insert new user
        db.run('INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
            [username, password, assignedRole, full_name, email], function (err) {
                if (err) return res.status(500).json({ success: false, message: 'Failed to create user' });

                res.json({ success: true, message: 'Registration successful' });
            });
    });
});

module.exports = router;
