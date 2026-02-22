document.addEventListener('DOMContentLoaded', () => {
    const userUser = JSON.parse(localStorage.getItem('user'));
    if (!userUser) window.location.href = '/';

    document.getElementById('username-display').textContent = userUser.username;

    loadProducts();
    loadOrders();
    updateCartDisplay();
    loadProfile(); // Load profile data
});

let cart = [];

// Navigation Logic
function showSection(sectionId) {
    // Hide all sections
    document.getElementById('shop-view').style.display = 'none';
    document.getElementById('orders-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'none';

    // Reset Nav Active State
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    if (sectionId === 'shop') {
        document.getElementById('shop-view').style.display = 'block';
        document.getElementById('nav-shop').classList.add('active');
    } else if (sectionId === 'orders') {
        document.getElementById('orders-view').style.display = 'block';
        document.getElementById('nav-orders').classList.add('active');
    } else if (sectionId === 'profile') {
        document.getElementById('profile-view').style.display = 'block';
        document.getElementById('nav-profile').classList.add('active');
    }
}

async function loadProfile() {
    const userCache = JSON.parse(localStorage.getItem('user'));
    if (!userCache) return;

    try {
        const response = await fetch(`/api/users/${userCache.id}`);
        const user = await response.json();

        if (user) {
            document.getElementById('profile-name').value = user.full_name || user.username;
            document.getElementById('profile-email').value = user.email || '';
        }
    } catch (err) {
        console.error('Error loading profile', err);
    }
}

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        const container = document.getElementById('products-container');
        container.innerHTML = products.map(product => {
            let discountBadge = '';
            let priceDisplay = `<div class="product-price">Rs. ${product.price.toFixed(2)}</div>`;

            if (product.original_price && product.original_price > product.price) {
                const discount = Math.round(((product.original_price - product.price) / product.original_price) * 100);
                discountBadge = `<div class="discount-badge">SAVE ${discount}%</div>`;
                priceDisplay = `
                    <div style="display: flex; gap: 10px; align-items: baseline;">
                        <div class="product-original-price">Rs. ${product.original_price.toFixed(2)}</div>
                        <div class="product-price">Rs. ${product.price.toFixed(2)}</div>
                    </div>
                `;
            }

            return `
            <div class="product-card" style="position: relative;">
                ${discountBadge}
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    ${priceDisplay}
                </div>
                <button class="product-add-btn" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">
                    Add <i class="fa-solid fa-plus"></i>
                </button>
            </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
    }
}

function addToCart(id, name, price) {
    const existing = cart.find(item => item.product_id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ product_id: id, name, price, quantity: 1 });
    }
    updateCartDisplay();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.product_id !== id);
    updateCartDisplay();
}

function updateCartDisplay() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-secondary text-center">Your cart is empty.</p>';
        totalEl.textContent = 'Total: Rs. 0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #eee;">
                <div>
                    <div>${item.name}</div>
                    <div style="font-size: 0.85rem; color: #666;">x ${item.quantity}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div>Rs. ${(item.price * item.quantity).toFixed(2)}</div>
                    <i class="fa-solid fa-trash text-danger" style="cursor: pointer;" onclick="removeFromCart(${item.product_id})"></i>
                </div>
            </div>
        `;
    }).join('');

    totalEl.textContent = `Total: Rs. ${total.toFixed(2)}`;
}



async function loadOrders() {
    const userUser = JSON.parse(localStorage.getItem('user'));
    try {
        const response = await fetch(`/api/orders?role=Customer&customer_id=${userUser.id}`);
        const orders = await response.json();

        const tbody = document.getElementById('orders-table-body');
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No orders found.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>Rs. ${order.total_amount.toFixed(2)}</td>
                <td><span class="badge ${getStatusClass(order.status)}">${order.status}</span></td>
                <td>
                    ${order.delivery_code ?
                `<span style="font-family: 'Courier New', monospace; font-size: 1.1rem; font-weight: 700; color: #d63384; background: #fce4ec; padding: 4px 8px; border-radius: 4px; border: 1px dashed #d63384;">${order.delivery_code}</span>`
                : '<span style="color: #999;">-</span>'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'Pending': return 'status-pending';
        case 'In Transit': return 'status-in-transit';
        case 'Delivered': return 'status-delivered';
        default: return 'badge-info';
    }
}

// Payment Modal Logic
const paymentModal = document.getElementById('payment-modal');

function openPaymentModal() {
    if (cart.length === 0) return alert('Cart is empty!');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('payment-total').textContent = `Rs. ${total.toFixed(2)}`;

    paymentModal.classList.add('active');
}

function closePaymentModal() {
    paymentModal.classList.remove('active');
}

function togglePaymentFields() {
    const method = document.querySelector('input[name="payment-method"]:checked').value;
    const cardDetails = document.getElementById('card-details');
    if (method === 'Card') {
        cardDetails.style.display = 'block';
    } else {
        cardDetails.style.display = 'none';
    }
}

function confirmPayment() {
    const method = document.querySelector('input[name="payment-method"]:checked').value;

    if (method === 'Card') {
        const num = document.getElementById('card-number').value;
        const exp = document.getElementById('card-expiry').value;
        const cvv = document.getElementById('card-cvv').value;
        const address = document.getElementById('delivery-address').value;
        const contact = document.getElementById('contact-number').value;

        if (!num || !exp || !cvv || !address || !contact) {
            return alert('Please fill in all details (including address and contact number).');
        }
        // Simulate processing delay
        const btn = document.querySelector('#payment-modal button');
        const originalText = btn.textContent;
        btn.textContent = 'Processing...';
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            placeOrder(method, 'Paid');
        }, 1500);
    } else {
        placeOrder(method, 'Pending');
    }
}

async function placeOrder(paymentMethod = 'Cash', paymentStatus = 'Pending') {
    if (cart.length === 0) return alert('Cart is empty!');

    const deliveryAddress = document.getElementById('delivery-address').value;
    const contactNumber = document.getElementById('contact-number').value;

    if (!deliveryAddress) return alert('Please enter a delivery address.');
    if (!contactNumber) return alert('Please enter a contact number.');

    const userUser = JSON.parse(localStorage.getItem('user'));
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: userUser.id,
                items: cart,
                total_amount: total,
                payment_method: paymentMethod,
                payment_status: paymentStatus,
                delivery_address: deliveryAddress,
                contact_number: contactNumber
            })
        });

        const result = await response.json();
        if (result.success) {
            if (paymentMethod === 'Card') {
                alert('Payment Successful! Order placed.');
            } else {
                alert('Order placed successfully! Please pay on delivery.');
            }
            closePaymentModal();
            cart = [];
            updateCartDisplay();
            loadOrders();
        } else {
            alert('Failed to place order: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Error placing order');
    }
}
