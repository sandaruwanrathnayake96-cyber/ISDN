document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadInventory();
    loadDispatch();
    loadPayments();
});

let manualCart = [];
let allProducts = [];

function showSection(sectionId) {
    ['order-entry', 'inventory', 'dispatch', 'payments'].forEach(id => {
        document.getElementById(`${id}-section`).style.display = 'none';
        document.getElementById(`nav-${id}`).classList.remove('active');
    });
    document.getElementById(`${sectionId}-section`).style.display = 'block';
    document.getElementById(`nav-${sectionId}`).classList.add('active');
}

// --- 1. Order Entry ---
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();

        const select = document.getElementById('product-select');
        select.innerHTML = '<option value="">Select Product...</option>' +
            allProducts.map(p => `<option value="${p.id}">${p.name} (Rs. ${p.price})</option>`).join('');

        // Populate Transfer product select too
        document.getElementById('transfer-product').innerHTML =
            allProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

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

    const phone = document.getElementById('cust-phone').value;
    const name = document.getElementById('cust-name').value || 'Walk-in Customer';
    const address = document.getElementById('cust-address').value || 'Counter Pickup';

    if (!phone) return alert('Customer Phone is required');

    
    const customerId = 1;

    const total = manualCart.reduce((s, i) => s + (i.price * i.quantity), 0);

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: customerId,
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
        const inventory = await response.json();

        // Main Table
        const tbody = document.getElementById('inventory-table-body');
        if (tbody) {
            tbody.innerHTML = inventory.map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.rdc_location}</td>
                    <td><input type="number" value="${item.quantity}" onchange="updateInventory(${item.id}, this.value)" style="width: 80px;"></td>
                </tr>
            `).join('');
        }
        // Mini View
        const mini = document.getElementById('mini-inventory');
        if (mini) {
            mini.innerHTML = inventory.map(i => `
                <div style="font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                    <span>${i.product_name}</span> <span>${i.quantity}</span>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function updateInventory(id, quantity) {
    await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
    });
}

async function requestTransfer() {
    const productId = document.getElementById('transfer-product').value;
    const qty = document.getElementById('transfer-qty').value;
    const source = document.getElementById('transfer-source').value;

    if (!productId || !qty) return alert('Invalid details');

    try {
        await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                quantity: qty,
                from_rdc: source,
                to_rdc: 'Main RDC'
            })
        });
        alert('Transfer Requested');
        document.getElementById('transfer-modal').classList.remove('active');
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
        tbody.innerHTML = orders.filter(o => o.status === 'Pending').map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer_name}</td>
                <td>${order.delivery_address || '-'}</td>
                <td>
                    <select id="driver-for-${order.id}" class="form-control" style="font-size: 0.9rem;">
                        ${driverOptions}
                    </select>
                </td>
                <td>
                    <button onclick="assignDriver(${order.id})" class="btn-sm" style="background: var(--primary-color); color: white;">Assign</button>
                </td>
            </tr>
        `).join('');

        if (tbody.innerHTML === '') tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending orders to dispatch.</td></tr>';

    } catch (err) { console.error(err); }
}

async function assignDriver(orderId) {
    const driverId = document.getElementById(`driver-for-${orderId}`).value;
    if (!driverId) return alert('Select a driver');

    try {
        await fetch('/api/deliveries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, driver_id: driverId })
        });
        alert('Driver Assigned & Order marked In Transit');
        loadDispatch(); // Refresh
    } catch (err) { console.error(err); }
}

// --- 4. Payments ---
async function loadPayments() {
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();

        const tbody = document.getElementById('payments-table-body');

        const unpaid = orders.filter(o => o.payment_status === 'Pending' && (o.status === 'Delivered' || o.status === 'Completed'));

        tbody.innerHTML = unpaid.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer_name}</td>
                <td>Rs. ${order.total_amount.toFixed(2)}</td>
                <td>${order.payment_method}</td>
                <td><span class="badge badge-warning">Pending</span></td>
                <td>
                    <button onclick="markPaid(${order.id})" class="btn-sm" style="background: var(--success-color); color: white;">Confirm Payment</button>
                </td>
            </tr>
        `).join('');

        if (tbody.innerHTML === '') tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending payments.</td></tr>';

    } catch (err) { console.error(err); }
}

async function markPaid(orderId) {
    if (!confirm('Confirm payment receipt?')) return;

    try {
        await fetch(`/api/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_status: 'Paid' })
        });
        loadPayments();
    } catch (err) { console.error(err); }
}
