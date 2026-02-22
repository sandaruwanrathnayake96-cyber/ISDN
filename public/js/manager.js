document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    // Pre-load other data
    loadUsers();
    loadReports();
    loadTransfers();
});

function showSection(sectionId) {
    // Hide all
    ['overview', 'users', 'reports', 'transfers'].forEach(id => {
        document.getElementById(`${id}-section`).style.display = 'none';
        document.getElementById(`nav-${id}`).classList.remove('active');
    });

    // Show selected
    document.getElementById(`${sectionId}-section`).style.display = 'block';
    document.getElementById(`nav-${sectionId}`).classList.add('active');
}

async function loadStats() {
    try {
        const response = await fetch('/api/reports/stats');
        const stats = await response.json();

        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('total-revenue').textContent = `Rs. ${stats.totalRevenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
        document.getElementById('total-customers').textContent = stats.totalCustomers;

        // Load Sales Chart Data
        const salesRes = await fetch('/api/reports/sales');
        const salesData = await salesRes.json();
        renderSalesChart(salesData);

    } catch (err) {
        console.error(err);
    }
}

function renderSalesChart(data) {
    const container = document.getElementById('sales-chart-placeholder');
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-secondary">No sales data available.</p>';
        return;
    }

    // Find max value for scaling
    const maxVal = Math.max(...data.map(d => d.total));

    container.innerHTML = data.slice(0, 10).map(d => {
        const height = (d.total / maxVal) * 100;
        return `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                <div style="width: 80%; background: var(--primary-color); height: ${height}%; border-radius: 4px 4px 0 0; min-height: 4px;" title="Rs. ${d.total}"></div>
                <div style="font-size: 0.7rem; color: #666; margin-top: 5px;">${new Date(d.date).getDate()}/${new Date(d.date).getMonth() + 1}</div>
            </div>
        `;
    }).join('');
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        const tbody = document.getElementById('users-table-body');

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td><span style="font-weight: 600;">${user.username}</span></td>
                <td>${user.full_name || '-'}</td>
                <td>
                    <select onchange="updateRole(${user.id}, this.value)" class="form-control" style="padding: 0.2rem; font-size: 0.9rem;">
                        <option value="Customer" ${user.role === 'Customer' ? 'selected' : ''}>Customer</option>
                        <option value="Driver" ${user.role === 'Driver' ? 'selected' : ''}>Driver</option>
                        <option value="RDC" ${user.role === 'RDC' ? 'selected' : ''}>RDC Staff</option>
                        <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>Manager</option>
                    </select>
                </td>
                <td>
                    <button class="btn-sm" style="background: #e9ecef; color: #333;" onclick="alert('Password reset link sent!')">Reset Pw</button>
                    <button class="btn-sm" style="background: #dc3545; color: white; margin-left: 5px;" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            loadUsers();
        } else {
            alert('Failed to delete user');
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting user');
    }
}

function exportSales() {
    window.location.href = '/api/reports/sales/export';
}

function exportInventory() {
    window.location.href = '/api/reports/inventory/export';
}

async function updateRole(userId, newRole) {
    if (!confirm(`Change user role to ${newRole}?`)) return loadUsers(); // Reset if cancelled

    try {
        await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        });
        // alert('Role updated');
    } catch (err) {
        console.error(err);
        alert('Failed to update role');
    }
}

async function loadReports() {
    try {
        // Low Stock
        const invRes = await fetch('/api/reports/inventory');
        const invData = await invRes.json();
        document.getElementById('low-stock-list').innerHTML = invData.map(i => `
            <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                <span>${i.name}</span>
                <span class="badge badge-danger">${i.quantity} left</span>
            </li>
        `).join('');

        // KPIs
        const kpiRes = await fetch('/api/reports/kpi');
        const kpiData = await kpiRes.json();
        document.getElementById('kpi-list').innerHTML = kpiData.drivers.map(d => `
            <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                <span>${d.name}</span>
                <span>
                    <i class="fa-solid fa-check text-success"></i> ${d.deliveries} 
                    <i class="fa-solid fa-star text-warning" style="margin-left: 8px;"></i> ${d.rating}
                </span>
            </li>
        `).join('');
    } catch (err) { console.error(err); }
}

async function loadTransfers() {
    try {
        const response = await fetch('/api/transfers');
        const transfers = await response.json();
        const tbody = document.getElementById('transfers-table-body');

        if (transfers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No pending transfers.</td></tr>';
            return;
        }

        tbody.innerHTML = transfers.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td>${t.product_name}</td>
                <td>${t.quantity}</td>
                <td>${t.from_rdc} <i class="fa-solid fa-arrow-right" style="font-size: 0.8rem; color: #999;"></i> ${t.to_rdc}</td>
                <td>${new Date(t.requested_date).toLocaleDateString()}</td>
                <td><span class="badge ${t.status === 'Approved' ? 'badge-success' : t.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">${t.status}</span></td>
                <td>
                    ${t.status === 'Pending' ? `
                    <button onclick="updateTransfer(${t.id}, 'Approved')" class="btn-sm" style="background: #28a745; color: white;">Approve</button>
                    <button onclick="updateTransfer(${t.id}, 'Rejected')" class="btn-sm" style="background: #dc3545; color: white; margin-left: 5px;">Reject</button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

async function updateTransfer(id, status) {
    if (!confirm(`${status} this transfer request?`)) return;

    try {
        await fetch(`/api/transfers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadTransfers();
    } catch (err) {
        console.error(err);
    }
}
