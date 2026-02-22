document.addEventListener('DOMContentLoaded', () => {
    loadRoute();
});

function showSection(sectionId) {
    if (sectionId === 'route') {
        document.getElementById('route-section').style.display = 'block';
        document.getElementById('history-section').style.display = 'none';
        document.getElementById('nav-route').classList.add('active');
        document.getElementById('nav-history').classList.remove('active');
        loadRoute();
    } else {
        document.getElementById('route-section').style.display = 'none';
        document.getElementById('history-section').style.display = 'block';
        document.getElementById('nav-route').classList.remove('active');
        document.getElementById('nav-history').classList.add('active');
        loadHistory();
    }
}

async function loadHistory() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const driverId = user ? user.id : '';
        const response = await fetch(`/api/deliveries?type=history&driver_id=${driverId}`);
        const orders = await response.json();
        const container = document.getElementById('history-container');

        if (orders.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #777;">No valid delivery history found.</div>';
            return;
        }

        container.innerHTML = `
            <table class="table" style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th style="padding: 1rem; border-bottom: 2px solid #eee;">Order #</th>
                        <th style="padding: 1rem; border-bottom: 2px solid #eee;">Date</th>
                        <th style="padding: 1rem; border-bottom: 2px solid #eee;">Customer</th>
                        <th style="padding: 1rem; border-bottom: 2px solid #eee;">Amount</th>
                        <th style="padding: 1rem; border-bottom: 2px solid #eee;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                        <tr>
                            <td style="padding: 1rem; border-bottom: 1px solid #eee;">#${o.id}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #eee;">${new Date().toLocaleDateString()}</td> 
                            <td style="padding: 1rem; border-bottom: 1px solid #eee;">${o.full_name || o.customer_name}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #eee;">Rs. ${o.total_amount.toFixed(2)}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #eee;"><span class="badge status-delivered">Delivered</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) { console.error(err); }
}

const mockPhones = [
    "077-1234567", "071-9876543", "070-1122334", "077-5566778", "011-2345678"
];

async function loadRoute() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const driverId = user ? user.id : '';
        const response = await fetch(`/api/deliveries?driver_id=${driverId}`);
        const orders = await response.json();

        const container = document.getElementById('deliveries-container');

        // --- Dynamic Route Header Calculation ---
        const totalStops = orders.length;
        const routeIdEl = document.getElementById('route-id');
        const routeStatsEl = document.getElementById('route-stats');

        if (totalStops > 0) {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
            routeIdEl.textContent = `Route #RT-${dateStr}`;

    
            const totalMinutes = (totalStops * 25) + 30;
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            routeStatsEl.textContent = `Estimated Time: ${hours}h ${mins}m • ${totalStops} Stops`;

            document.getElementById('route-info').style.display = 'flex';
        } else {
            document.getElementById('route-info').style.display = 'none';
            container.innerHTML = '<p class="text-center text-secondary">No active deliveries assigned.</p>';
            return;
        }

        orders.sort((a, b) => a.id - b.id);

        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))';
        container.style.gap = '1.5rem';

        container.innerHTML = orders.map((order, index) => {
            const phone = order.contact_number || 'No Contact Provided';
            const address = order.delivery_address || 'No Address Provided';

            const isCompleted = order.status === 'Delivered';
            const orderTotal = `Rs ${order.total_amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
            const paymentText = order.payment_method === 'Cash' ? '(Cash on Delivery)' : '(Paid (Card))';

            return `
            <div class="product-card" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; border-left: 5px solid ${getStatusColor(order.status)}; opacity: ${isCompleted ? 0.6 : 1}">
                
                <div style="margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
                    <div style="font-size: 0.85rem; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Stop #${index + 1}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.2rem;">
                        <div style="font-size: 1.2rem; font-weight: 700; color: #333;">Order #${order.id}</div>
                        <span class="badge ${getStatusClass(order.status)}">${order.status}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; flex-grow: 1;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div style="background: #f3e5f5; padding: 6px; border-radius: 50%; color: #7b1fa2;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div style="overflow: hidden;">
                            <div style="font-size: 0.75rem; color: #666;">Customer</div>
                            <div style="font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.full_name || order.customer_name || 'Customer'}</div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div style="background: #e3f2fd; padding: 6px; border-radius: 50%; color: #1976d2;">
                            <i class="fa-solid fa-phone"></i>
                        </div>
                        <div style="overflow: hidden;">
                            <div style="font-size: 0.75rem; color: #666;">Contact</div>
                            <div style="font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${phone}</div>
                        </div>
                    </div>

                    <div style="grid-column: span 2; display: flex; align-items: center; gap: 0.8rem;">
                        <div style="background: #fce4ec; padding: 6px; border-radius: 50%; color: #c2185b;">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: #666;">Drop-off</div>
                            <div style="font-weight: 500; color: #333; font-size: 0.9rem; line-height: 1.2;">${address}</div>
                        </div>
                    </div>

                    <div style="grid-column: span 2; display: flex; align-items: center; gap: 0.8rem;">
                        <div style="background: #fff3e0; padding: 6px; border-radius: 50%; color: #f57c00;">
                            <i class="fa-solid fa-sack-dollar"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: #666;">Amount</div>
                            <div style="font-weight: 600; color: #333;">${orderTotal} <span style="font-weight: 400; color: #777; font-size: 0.85rem;">${paymentText}</span></div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: auto;">
                    <button onclick="openMap('${address.replace(/'/g, "\\'")}')" class="login-btn" style="background: white; color: #007bff; border: 1px solid #007bff; padding: 0.6rem; font-size: 0.95rem;">
                        <i class="fa-solid fa-map-location-dot"></i> Map
                    </button>
                    ${order.status !== 'Delivered' ? `
                    <button onclick="promptVerify(${order.id})" class="login-btn" style="background: #007bff; color: white; border: none; padding: 0.6rem; font-size: 0.95rem;">
                        Confirm
                    </button>
                    ` : `
                    <button disabled class="login-btn" style="background: #e9ecef; color: #28a745; border: 1px solid #28a745; padding: 0.6rem; font-size: 0.95rem;">
                        <i class="fa-solid fa-check"></i> Done
                    </button>
                    `}
                </div>
            </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
    }
}

function openMap(address) {
    if (!address || address === 'No Address Provided') return alert('Address not found');
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
}

function startRoute() {
    alert('Route started! Navigation initialized.');
}

// Verification Modal Logic
const verifyModal = document.getElementById('verify-modal');

function promptVerify(id) {
    document.getElementById('verify-order-id').value = id;
    document.getElementById('verify-code').value = '';
    verifyModal.classList.add('active');
}

function closeVerifyModal() {
    verifyModal.classList.remove('active');
}

async function confirmDelivery() {
    const id = document.getElementById('verify-order-id').value;
    const code = document.getElementById('verify-code').value;

    if (!code || code.length !== 4) return alert('Please enter a valid 4-digit code.');

    try {
        const response = await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Delivered', code })
        });

        const result = await response.json();
        if (result.success) {
            alert('Delivery Confirmed!');
            closeVerifyModal();
            loadRoute();
        } else {
            alert('Verification Failed: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Error updating status');
    }
}

async function updateStatus(id, status) {
    try {
        const response = await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (response.ok) loadRoute();
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

function getStatusColor(status) {
    switch (status) {
        case 'Pending': return '#ffca28';
        case 'In Transit': return '#42a5f5';
        case 'Delivered': return '#66bb6a';
        default: return '#bdbdbd';
    }
}
