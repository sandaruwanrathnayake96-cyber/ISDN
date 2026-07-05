const db = require('../db');

/**
 * Controller to handle stock transfers.
 * Encapsulates the transactional inventory adjustments for transfer approvals.
 */

// Get all transfers
exports.getAllTransfers = (req, res) => {
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
};

// Create a transfer request
exports.createTransfer = (req, res) => {
    const { product_id, quantity, from_rdc, to_rdc } = req.body;
    db.run('INSERT INTO transfers (product_id, quantity, from_rdc, to_rdc) VALUES (?, ?, ?, ?)',
        [product_id, quantity, from_rdc, to_rdc], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Transfer requested' });
        });
};

// Approve or Reject a transfer request
exports.updateTransferStatus = (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    const approved_date = status === 'Approved' ? new Date().toISOString() : null;

    if (status !== 'Approved') {
        db.run('UPDATE transfers SET status = ?, approved_date = ? WHERE id = ?', [status, approved_date, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ success: true, message: `Transfer ${status}` });
        });
        return;
    }

    db.get('SELECT * FROM transfers WHERE id = ?', [id], (err, transfer) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
        if (transfer.status !== 'Pending') {
            return res.status(400).json({ error: 'Transfer has already been processed' });
        }

        const { product_id, quantity, from_rdc, to_rdc } = transfer;

        db.get('SELECT * FROM inventory WHERE product_id = ? AND rdc_location = ?', [product_id, from_rdc], (err, srcInv) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!srcInv || srcInv.quantity < quantity) {
                return res.status(400).json({ error: `Insufficient stock at source RDC (${from_rdc}). Current stock: ${srcInv ? srcInv.quantity : 0}` });
            }

            db.run('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [quantity, srcInv.id], function (err) {
                if (err) return res.status(500).json({ error: err.message });

                db.get('SELECT * FROM inventory WHERE product_id = ? AND rdc_location = ?', [product_id, to_rdc], (err, destInv) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const finalizeTransfer = () => {
                        db.run('UPDATE transfers SET status = ?, approved_date = ? WHERE id = ?', [status, approved_date, id], function (err) {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ success: true, message: 'Transfer approved and stock updated successfully' });
                        });
                    };

                    if (destInv) {
                        db.run('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [quantity, destInv.id], function (err) {
                            if (err) return res.status(500).json({ error: err.message });
                            finalizeTransfer();
                        });
                    } else {
                        db.run('INSERT INTO inventory (product_id, rdc_location, quantity) VALUES (?, ?, ?)', [product_id, to_rdc, quantity], function (err) {
                            if (err) return res.status(500).json({ error: err.message });
                            finalizeTransfer();
                        });
                    }
                });
            });
        });
    });
};
