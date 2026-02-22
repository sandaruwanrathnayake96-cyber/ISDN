const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Serve HTML files for specific roles/pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/customer', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/customer.html'));
});

app.get('/rdc', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/rdc.html'));
});

app.get('/driver', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/driver.html'));
});

app.get('/manager', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/manager.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
