document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadInventory();
    loadDispatch();
    loadPayments();
    loadTransfers();
    loadScheduledDeliveries();
    loadReconciliationHistory();
});

let manualCart = [];
let allProducts = [];
let activeReconcileOrderId = null;

function showSection(sectionId) {
    ['order-entry', 'inventory', 'transfers', 'dispatch', 'payments'].forEach(id => {
        const section = document.getElementById(`${id}-section`);
        const nav = document.getElementById(`nav-${id}`);
        if (section) section.style.display = 'none';
        if (nav) nav.classList.remove('active');
    });
    const targetSection = document.getElementById(`${sectionId}-section`);
    const targetNav = document.getElementById(`nav-${sectionId}`);
    if (targetSection) targetSection.style.display = 'block';
    if (targetNav) targetNav.classList.add('active');

    // Refresh data when switching sections
    if (sectionId === 'transfers') loadTransfers();
    if (sectionId === 'dispatch') {
        loadDispatch();
        loadScheduledDeliveries();
    }
    if (sectionId === 'payments') {
        loadPayments();
        loadReconciliationHistory();
    }
    if (sectionId === 'inventory') {
        loadInventory();
    }
}

// --- 1. Order Entry ---
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();

        const select = document.getElementById('product-select');
        if (select) {
            select.innerHTML = '<option value="">Select Product...</option>' +
                allProducts.map(p => `<option value="${p.id}">${p.name} (Rs. ${p.price})</option>`).join('');
        }

        // Populate Transfer product select too
        const transferProdSelect = document.getElementById('transfer-product');
        if (transferProdSelect) {
            transferProdSelect.innerHTML = allProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }

        // Populate inv-product-select dropdown
        const invProductSelect = document.getElementById('inv-product-select');
        if (invProductSelect) {
            invProductSelect.innerHTML = allProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }

        // Mini Inventory View
        loadInventory();
    } catch (err) { console.error(err); }
}

function addToManualCart() {
    const productId = document.getElementById('product-select').value;
    const qty = parseInt(document.getElementById('product-qty').value);

    if (!productId || qty < 1) return alert('Select product and quantity');

    const product = allProducts.find(p => p.id == productId);

    const existing = manualCart.find(i => i.product_id == productId);
    if (existing) existing.quantity += qty;
    else manualCart.push({ product_id: product.id, name: product.name, price: product.price, quantity: qty });

    renderManualCart();
}

function renderManualCart() {
    const tbody = document.getElementById('manual-cart-body');
    let total = 0;

    tbody.innerHTML = manualCart.map((item, idx) => {
        total += item.price * item.quantity;
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${(item.price * item.quantity).toFixed(2)}</td>
                <td><button onclick="manualCart.splice(${idx},1); renderManualCart();" class="btn-sm"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    }).join('');

    document.getElementById('manual-cart-total').textContent = `Rs. ${total.toFixed(2)}`;
}

async function submitManualOrder() {
    if (manualCart.length === 0) return alert('Cart is empty');

    const email = document.getElementById('cust-email').value;
    const name = document.getElementById('cust-name').value || 'Walk-in Customer';
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value || 'Counter Pickup';

    if (!email || !phone) return alert('Customer Email and Phone are required');

    const total = manualCart.reduce((s, i) => s + (i.price * i.quantity), 0);

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_email: email,
                customer_name: name,
                items: manualCart,
                total_amount: total,
                payment_method: 'Cash',
                payment_status: 'Pending',
                delivery_address: address,
                contact_number: phone
            })
        });

        if (response.ok) {
            alert('Order Created Successfully');
            manualCart = [];
            renderManualCart();
            // Clear inputs
            document.getElementById('cust-email').value = '';
            document.getElementById('cust-name').value = '';
            document.getElementById('cust-phone').value = '';
            document.getElementById('cust-address').value = '';
            loadDispatch();
        } else {
            alert('Error creating order');
        }
    } catch (err) { console.error(err); }
}

// --- 2. Inventory & Transfers ---
async function loadInventory() {
    try {
        const response = await fetch('/api/inventory');
        let inventory = await response.json();

        const filterLoc = document.getElementById('inventory-filter-location').value;
        if (filterLoc) {
            inventory = inventory.filter(i => i.rdc_location === filterLoc);
        }

        // Main Table
        const tbody = document.getElementById('inventory-table-body');
        if (tbody) {
            tbody.innerHTML = inventory.map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.rdc_location}</td>
                    <td><input type="number" value="${item.quantity}" onchange="updateInventory(${item.id}, this.value)" style="width: 80px;" class="form-control"></td>
                </tr>
            `).join('');
        }
        // Mini View
        const mini = document.getElementById('mini-inventory');
        if (mini) {
            mini.innerHTML = inventory.map(i => `
                <div style="font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                    <span>${i.product_name} (${i.rdc_location})</span> <span>${i.quantity}</span>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function updateInventory(id, quantity) {
    try {
        await fetch(`/api/inventory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });
        loadInventory();
    } catch (err) { console.error(err); }
}

async function submitStockUpdate() {
    const productId = document.getElementById('inv-product-select').value;
    const location = document.getElementById('inv-location-select').value;
    const qty = parseInt(document.getElementById('inv-qty-input').value);

    if (!productId || !location || isNaN(qty) || qty < 0) {
        return alert('Please select a product and enter a valid quantity');
    }

    try {
        const res = await fetch('/api/inventory/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, rdc_location: location, quantity: qty })
        });

        if (res.ok) {
            alert('Stock Level Updated Successfully');
            loadInventory();
        } else {
            alert('Error updating stock level');
        }
    } catch (err) { console.error(err); }
}

async function requestTransfer() {
    const productId = document.getElementById('transfer-product').value;
    const qty = parseInt(document.getElementById('transfer-qty').value);
    const source = document.getElementById('transfer-source').value;
    const target = document.getElementById('transfer-target').value;

    if (!productId || isNaN(qty) || qty < 1 || !source || !target) {
        return alert('Invalid details. Quantity must be at least 1.');
    }
    if (source === target) {
        return alert('Source and Target RDCs must be different.');
    }

    try {
        const res = await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                quantity: qty,
                from_rdc: source,
                to_rdc: target
            })
        });
        if (res.ok) {
            alert('Transfer Requested Successfully');
            document.getElementById('transfer-modal').classList.remove('active');
            loadTransfers();
        } else {
            alert('Failed to request transfer');
        }
    } catch (err) { console.error(err); }
}

async function loadTransfers() {
    try {
        const response = await fetch('/api/transfers');
        const transfers = await response.json();

        const tbody = document.getElementById('transfers-table-body');
        if (!tbody) return;

        tbody.innerHTML = transfers.map(t => {
            const dateStr = new Date(t.requested_date).toLocaleDateString();
            let actions = '-';
            if (t.status === 'Pending') {
                actions = `
                    <button onclick="updateTransferStatus(${t.id}, 'Approved')" class="btn-sm" style="background: var(--success-color); color: white;">Approve</button>
                    <button onclick="updateTransferStatus(${t.id}, 'Rejected')" class="btn-sm" style="background: var(--danger-color); color: white; margin-left: 4px;">Reject</button>
                `;
            }
            
            let statusClass = 'badge-warning';
            if (t.status === 'Approved') statusClass = 'badge-success';
            if (t.status === 'Rejected') statusClass = 'badge-danger';

            return `
                <tr>
                    <td>#${t.id}</td>
                    <td>${t.product_name}</td>
                    <td>${t.quantity}</td>
                    <td>${t.from_rdc}</td>
                    <td>${t.to_rdc}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge ${statusClass}">${t.status}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');

        if (transfers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No transfers requested.</td></tr>';
        }
    } catch (err) { console.error(err); }
}

async function updateTransferStatus(transferId, status) {
    if (!confirm(`Are you sure you want to set this transfer to ${status}?`)) return;

    try {
        const response = await fetch(`/api/transfers/${transferId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            alert(`Transfer has been ${status}`);
            loadTransfers();
            loadInventory();
        } else {
            const errData = await response.json();
            alert(errData.error || `Error setting transfer to ${status}`);
        }
    } catch (err) { console.error(err); }
}

// --- 3. Dispatch ---
async function loadDispatch() {
    try {
        const [ordersRes, driversRes] = await Promise.all([
            fetch('/api/orders'),
            fetch('/api/users?role=Driver')
        ]);
        const orders = await ordersRes.json();
        const drivers = await driversRes.json();

        let driverOptions = '<option value="">Select Driver...</option>' +
            drivers.map(d => `<option value="${d.id}">${d.full_name || d.username}</option>`).join('');

        const tbody = document.getElementById('dispatch-table-body');
        if (!tbody) return;

        tbody.innerHTML = orders.filter(o => o.status === 'Pending').map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer_name}</td>
                <td>${order.delivery_address || '-'}</td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px; max-width: 150px;">
                        <input type="date" id="date-for-${order.id}" class="form-control" style="font-size: 0.85rem; padding: 4px;" value="${new Date().toISOString().split('T')[0]}">
                        <select id="slot-for-${order.id}" class="form-control" style="font-size: 0.85rem; padding: 4px;">
                            <option value="Morning">Morning (8 AM - 12 PM)</option>
                            <option value="Afternoon">Afternoon (12 PM - 4 PM)</option>
                            <option value="Evening">Evening (4 PM - 8 PM)</option>
                        </select>
                        <input type="text" id="route-for-${order.id}" class="form-control" placeholder="Route details..." style="font-size: 0.85rem; padding: 4px;">
                    </div>
                </td>
                <td>
                    <select id="driver-for-${order.id}" class="form-control" style="font-size: 0.9rem;">
                        ${driverOptions}
                    </select>
                </td>
                <td>
                    <button onclick="scheduleAndAssign(${order.id})" class="btn-sm" style="background: var(--primary-color); color: white; width: 100%;">Schedule & Dispatch</button>
                </td>
            </tr>
        `).join('');

        if (tbody.innerHTML === '') tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending orders to dispatch.</td></tr>';

    } catch (err) { console.error(err); }
}

async function scheduleAndAssign(orderId) {
    const driverId = document.getElementById(`driver-for-${orderId}`).value;
    const date = document.getElementById(`date-for-${orderId}`).value;
    const slot = document.getElementById(`slot-for-${orderId}`).value;
    const route = document.getElementById(`route-for-${orderId}`).value || 'Default Route';

    if (!driverId) return alert('Select a driver');
    if (!date) return alert('Select a delivery date');

    try {
        const res = await fetch('/api/deliveries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                driver_id: driverId,
                delivery_date: date,
                time_slot: slot,
                route_details: route
            })
        });
        if (res.ok) {
            alert('Delivery Scheduled & Dispatched Successfully');
            loadDispatch();
            loadScheduledDeliveries();
        } else {
            alert('Error scheduling delivery');
        }
    } catch (err) { console.error(err); }
}

async function loadScheduledDeliveries() {
    try {
        const response = await fetch('/api/deliveries/scheduled');
        const deliveries = await response.json();

        const tbody = document.getElementById('scheduled-deliveries-table-body');
        if (!tbody) return;

        tbody.innerHTML = deliveries.map(d => {
            let statusClass = 'badge-warning';
            if (d.status === 'In Transit') statusClass = 'badge-primary';
            if (d.status === 'Delivered') statusClass = 'badge-success';

            return `
                <tr>
                    <td>#${d.id}</td>
                    <td>#${d.order_id}</td>
                    <td>${d.customer_name}</td>
                    <td>${d.delivery_address || '-'}</td>
                    <td>${d.driver_name}</td>
                    <td>${d.delivery_date}</td>
                    <td>${d.time_slot}</td>
                    <td>${d.route_details || '-'}</td>
                    <td><span class="badge ${statusClass}">${d.status}</span></td>
                </tr>
            `;
        }).join('');

        if (deliveries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No scheduled deliveries.</td></tr>';
        }
    } catch (err) { console.error(err); }
}

// --- 4. Payments ---
async function loadPayments() {
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();

        const tbody = document.getElementById('payments-table-body');
        if (!tbody) return;

        const unpaid = orders.filter(o => o.payment_status === 'Pending' && (o.status === 'Delivered' || o.status === 'Completed'));

        tbody.innerHTML = unpaid.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer_name}</td>
                <td>Rs. ${order.total_amount.toFixed(2)}</td>
                <td>${order.payment_method}</td>
                <td><span class="badge badge-warning">Pending</span></td>
                <td>
                    <button onclick="openReconcileModal(${order.id}, '${order.customer_name}', ${order.total_amount}, '${order.payment_method}')" class="btn-sm" style="background: var(--success-color); color: white;">Reconcile Invoice</button>
                </td>
            </tr>
        `).join('');

        if (tbody.innerHTML === '') tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending payments.</td></tr>';

    } catch (err) { console.error(err); }
}

async function openReconcileModal(orderId, customerName, totalAmount, paymentMethod) {
    activeReconcileOrderId = orderId;
    
    // Populate basic info
    const detailsDiv = document.getElementById('invoice-details');
    if (detailsDiv) {
        detailsDiv.innerHTML = `
            <strong>Order ID:</strong> #${orderId}<br>
            <strong>Customer:</strong> ${customerName}<br>
            <strong>Total Amount:</strong> Rs. ${totalAmount.toFixed(2)}<br>
            <strong>Payment Method:</strong> ${paymentMethod}
        `;
    }
    
    // Clear reference and date inputs
    const refInput = document.getElementById('reconcile-ref');
    const dateInput = document.getElementById('reconcile-date');
    if (refInput) refInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    // Fetch items
    try {
        const res = await fetch(`/api/orders/${orderId}/items`);
        const items = await res.json();
        
        const tbody = document.getElementById('invoice-items-body');
        if (tbody) {
            tbody.innerHTML = items.map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td>Rs. ${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>Rs. ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `).join('');
        }
        
    } catch (err) {
        console.error(err);
        alert('Failed to load invoice items.');
    }
    
    // Show modal
    const modal = document.getElementById('reconcile-modal');
    if (modal) modal.classList.add('active');
}

async function submitReconciliation() {
    const ref = document.getElementById('reconcile-ref').value;
    const date = document.getElementById('reconcile-date').value;

    if (!ref || !date) {
        return alert('Please enter a payment reference and date.');
    }

    try {
        const response = await fetch(`/api/orders/${activeReconcileOrderId}/payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payment_status: 'Paid',
                payment_reference: ref,
                reconciled_at: date
            })
        });

        if (response.ok) {
            alert('Invoice Reconciled Successfully');
            const modal = document.getElementById('reconcile-modal');
            if (modal) modal.classList.remove('active');
            loadPayments();
            loadReconciliationHistory();
        } else {
            alert('Error reconciling invoice');
        }
    } catch (err) { console.error(err); }
}

async function loadReconciliationHistory() {
    try {
        const res = await fetch('/api/orders/reconciled');
        const orders = await res.json();
        
        const tbody = document.getElementById('reconciled-payments-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.customer_name}</td>
                <td>Rs. ${o.total_amount.toFixed(2)}</td>
                <td>${o.payment_method}</td>
                <td><code>${o.payment_reference || '-'}</code></td>
                <td>${new Date(o.reconciled_at).toLocaleDateString()}</td>
                <td><span class="badge badge-success">Reconciled</span></td>
            </tr>
        `).join('');
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No reconciled payments.</td></tr>';
        }
    } catch (err) { console.error(err); }
}
