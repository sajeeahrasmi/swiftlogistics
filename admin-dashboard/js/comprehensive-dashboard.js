// SwiftLogistics Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.API_BASE = 'http://localhost:3002/api/admin';
        this.DRIVERS_API_BASE = 'http://localhost:3002';
        this.AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzQ3OTk0MywiZXhwIjoxNzU3NTY2MzQzfQ.CQKSeC3GkvetPnr8SxERd574wZRt5MleWoqVbaMjT_U';
        this.currentPage = 'dashboard';
        this.selectedOrders = new Set();
        this.autoRefreshInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPage('dashboard');
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('[data-page]').dataset.page;
                this.loadPage(page);
            });
        });

        // Modal event listeners
        document.getElementById('confirmAssignment')?.addEventListener('click', () => {
            this.handleBulkAssignment();
        });

        document.getElementById('confirmEmergency')?.addEventListener('click', () => {
            this.handleEmergencyReassignment();
        });
    }

    async apiRequest(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.AUTH_TOKEN}`
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showAlert('Authentication failed. Please check your credentials.', 'danger');
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            this.showAlert(`Request failed: ${error.message}`, 'danger');
            return null;
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show alert-custom" role="alert">
                <i class="bi bi-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHTML);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showLoading() {
        return `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p class="mt-3 text-muted">Loading...</p>
            </div>
        `;
    }

    async loadPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        this.currentPage = page;
        const content = document.getElementById('content');
        content.innerHTML = this.showLoading();

        try {
            switch (page) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'orders':
                    await this.loadOrderManagement();
                    break;
                case 'drivers':
                    await this.loadDriverManagement();
                    break;
                case 'assignments':
                    await this.loadAssignments();
                    break;
                case 'clients':
                    await this.loadClients();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'reports':
                    await this.loadReports();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
            }
        } catch (error) {
            console.error('Error loading page:', error);
            this.showAlert('Failed to load page content', 'danger');
        }
    }

    async loadDashboard() {
        const overview = await this.apiRequest('/dashboard/overview');
        if (!overview) return;

        const content = `
            <div class="page-header">
                <h1 class="page-title">Dashboard Overview</h1>
                <p class="page-subtitle">Real-time logistics operations overview</p>
            </div>

            <!-- Statistics Cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-primary">${overview.totalOrders || 0}</div>
                        <div class="stat-label">Total Orders</div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-success">${overview.pendingOrders || 0}</div>
                        <div class="stat-label">Pending Orders</div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-info">${overview.activeDrivers || 0}</div>
                        <div class="stat-label">Active Drivers</div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-warning">${overview.inTransitOrders || 0}</div>
                        <div class="stat-label">In Transit</div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="stat-card">
                        <h5 class="mb-3">Quick Actions</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary btn-custom" onclick="adminDashboard.loadPage('orders')">
                                <i class="bi bi-box-seam me-2"></i>View Order Queue
                            </button>
                            <button class="btn btn-success btn-custom" onclick="adminDashboard.loadPage('assignments')">
                                <i class="bi bi-clipboard-check me-2"></i>Manage Assignments
                            </button>
                            <button class="btn btn-info btn-custom" onclick="adminDashboard.loadPage('drivers')">
                                <i class="bi bi-truck me-2"></i>Driver Status
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="stat-card">
                        <h5 class="mb-3">System Status</h5>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>Order Service</span>
                            <span class="badge bg-success">Online</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>Available Drivers</span>
                            <span class="badge bg-info">${overview.availableDrivers || 0}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span>Failed Orders</span>
                            <span class="badge bg-danger">${overview.failedOrders || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = content;
    }

    async loadOrderManagement() {
        const orders = await this.apiRequest('/orders/queue?page=1&limit=50');
        if (!orders) return;

        const content = `
            <div class="page-header">
                <h1 class="page-title">Order Management</h1>
                <p class="page-subtitle">Manage and track all orders</p>
            </div>

            <!-- Filters -->
            <div class="filter-section">
                <div class="row">
                    <div class="col-md-3">
                        <select class="form-select" id="statusFilter">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="pickup_scheduled">Pickup Scheduled</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <select class="form-select" id="priorityFilter">
                            <option value="">All Priorities</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <div class="form-check form-switch mt-2">
                            <input class="form-check-input" type="checkbox" id="unassignedOnly">
                            <label class="form-check-label" for="unassignedOnly">Unassigned Only</label>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="adminDashboard.filterOrders()">
                            <i class="bi bi-funnel me-2"></i>Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            <!-- Bulk Actions -->
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <button class="btn btn-assign btn-custom" onclick="adminDashboard.openAssignmentModal()" disabled id="bulkAssignBtn">
                        <i class="bi bi-person-check me-2"></i>Assign Selected (<span id="selectedCount">0</span>)
                    </button>
                </div>
                <div>
                    <button class="btn btn-outline-primary btn-custom" onclick="adminDashboard.refreshOrders()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Refresh
                    </button>
                </div>
            </div>

            <!-- Orders Table -->
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th><input type="checkbox" id="selectAll"></th>
                            <th>Tracking #</th>
                            <th>Client</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Pickup</th>
                            <th>Delivery</th>
                            <th>Value</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="ordersTableBody">
                        ${this.renderOrdersTable(orders.data || [])}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('content').innerHTML = content;
        this.setupOrderManagementEvents();
    }

    renderOrdersTable(orders) {
        return orders.map(order => `
            <tr>
                <td><input type="checkbox" class="order-checkbox" value="${order.id}"></td>
                <td><strong>${order.tracking_number}</strong></td>
                <td>${order.client_name || 'N/A'}</td>
                <td><span class="priority-badge priority-${order.priority}">${order.priority.toUpperCase()}</span></td>
                <td><span class="status-badge status-${order.status}">${this.formatStatus(order.status)}</span></td>
                <td><small>${this.truncateText(order.pickup_address, 30)}</small></td>
                <td><small>${this.truncateText(order.delivery_address, 30)}</small></td>
                <td>LKR ${this.formatNumber(order.total_value)}</td>
                <td><small>${this.formatDate(order.created_at)}</small></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="adminDashboard.viewOrderDetails('${order.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${order.status === 'failed' ? `
                            <button class="btn btn-emergency" onclick="adminDashboard.openEmergencyModal('${order.id}')">
                                <i class="bi bi-exclamation-triangle"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    setupOrderManagementEvents() {
        // Select all checkbox
        document.getElementById('selectAll')?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.order-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) {
                    this.selectedOrders.add(cb.value);
                } else {
                    this.selectedOrders.delete(cb.value);
                }
            });
            this.updateSelectedCount();
        });

        // Individual checkboxes
        document.querySelectorAll('.order-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedOrders.add(e.target.value);
                } else {
                    this.selectedOrders.delete(e.target.value);
                }
                this.updateSelectedCount();
            });
        });
    }

    updateSelectedCount() {
        const count = this.selectedOrders.size;
        document.getElementById('selectedCount').textContent = count;
        document.getElementById('bulkAssignBtn').disabled = count === 0;
    }

    async loadDriverManagement() {
        const drivers = await this.apiRequest('/drivers/available', {}, true);
        if (!drivers) return;

        const content = `
            <div class="page-header">
                <h1 class="page-title">Driver Management</h1>
                <p class="page-subtitle">Monitor and manage driver status</p>
            </div>

            <div class="row">
                ${drivers.map(driver => `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="stat-card">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="mb-1">${driver.first_name} ${driver.last_name}</h6>
                                    <small class="text-muted">${driver.phone}</small>
                                </div>
                                <span class="badge bg-${this.getDriverStatusColor(driver.status)}">${driver.status}</span>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Vehicle:</small>
                                <div>${driver.vehicle_type} - ${driver.vehicle_plate}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Current Orders:</small>
                                <div>${driver.current_orders || 0}</div>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted">Rating:</small>
                                <div>${'★'.repeat(Math.floor(driver.rating || 5))} ${driver.rating || 5.0}/5</div>
                            </div>
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.viewDriverDetails('${driver.id}')">
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('content').innerHTML = content;
    }

    async openAssignmentModal() {
        if (this.selectedOrders.size === 0) {
            this.showAlert('Please select orders to assign', 'warning');
            return;
        }

        const drivers = await this.apiRequest('/drivers/available');
        if (!drivers) return;

        // Populate driver select
        const driverSelect = document.getElementById('driverSelect');
        driverSelect.innerHTML = '<option value="">Choose a driver...</option>' +
            drivers.map(driver => `
                <option value="${driver.id}">
                    ${driver.first_name} ${driver.last_name} - ${driver.vehicle_type} (${driver.vehicle_plate})
                </option>
            `).join('');

        // Show selected orders
        const selectedOrdersList = document.getElementById('selectedOrdersList');
        selectedOrdersList.innerHTML = `
            <p><strong>${this.selectedOrders.size} orders selected for assignment:</strong></p>
            <ul class="list-unstyled">
                ${Array.from(this.selectedOrders).map(orderId => `
                    <li class="mb-1">Order #${orderId}</li>
                `).join('')}
            </ul>
        `;

        const modal = new bootstrap.Modal(document.getElementById('assignmentModal'));
        modal.show();
    }

    async handleBulkAssignment() {
        const driverId = document.getElementById('driverSelect').value;
        const notes = document.getElementById('assignmentNotes').value;

        if (!driverId) {
            this.showAlert('Please select a driver', 'warning');
            return;
        }

        const assignmentData = {
            orderIds: Array.from(this.selectedOrders),
            driverId: parseInt(driverId),
            notes: notes
        };

        const result = await this.apiRequest('/orders/bulk-assign', {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });

        if (result) {
            this.showAlert(`Successfully assigned ${this.selectedOrders.size} orders to driver`, 'success');
            this.selectedOrders.clear();
            this.updateSelectedCount();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('assignmentModal'));
            modal.hide();
            
            this.refreshOrders();
        }
    }

    async openEmergencyModal(orderId) {
        const drivers = await this.apiRequest('/drivers/available', {}, true);
        if (!drivers) return;

        // Populate driver select
        const emergencyDriverSelect = document.getElementById('emergencyDriverSelect');
        emergencyDriverSelect.innerHTML = '<option value="">Choose a driver...</option>' +
            drivers.map(driver => `
                <option value="${driver.id}">
                    ${driver.first_name} ${driver.last_name} - ${driver.vehicle_type}
                </option>
            `).join('');

        // Store order ID for later use
        document.getElementById('emergencyModal').dataset.orderId = orderId;

        const modal = new bootstrap.Modal(document.getElementById('emergencyModal'));
        modal.show();
    }

    async handleEmergencyReassignment() {
        const modal = document.getElementById('emergencyModal');
        const orderId = modal.dataset.orderId;
        const driverId = document.getElementById('emergencyDriverSelect').value;
        const reason = document.getElementById('emergencyReason').value;

        if (!driverId || !reason) {
            this.showAlert('Please select a driver and provide a reason', 'warning');
            return;
        }

        const reassignmentData = {
            orderId: parseInt(orderId),
            newDriverId: parseInt(driverId),
            reason: reason
        };

        const result = await this.apiRequest('/orders/emergency-reassign', {
            method: 'POST',
            body: JSON.stringify(reassignmentData)
        }, true);

        if (result) {
            this.showAlert('Emergency reassignment completed successfully', 'success');
            
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
            
            this.refreshOrders();
        }
    }

    async filterOrders() {
        const status = document.getElementById('statusFilter').value;
        const priority = document.getElementById('priorityFilter').value;
        const unassignedOnly = document.getElementById('unassignedOnly').checked;

        const params = new URLSearchParams({
            page: '1',
            limit: '50',
            ...(status && { status }),
            ...(priority && { priority }),
            ...(unassignedOnly && { unassigned_only: 'true' })
        });

        const orders = await this.apiRequest(`/orders/queue?${params}`);
        if (orders) {
            document.getElementById('ordersTableBody').innerHTML = this.renderOrdersTable(orders.data || []);
            this.setupOrderManagementEvents();
        }
    }

    async refreshOrders() {
        if (this.currentPage === 'orders') {
            await this.loadOrderManagement();
        }
    }

    // Placeholder methods for other pages
    async loadAssignments() {
        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Assignment Management</h1>
                <p class="page-subtitle">Track order assignments and driver allocations</p>
            </div>
            <div class="alert alert-info">Assignment management features coming soon...</div>
        `;
    }

    async loadClients() {
        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Client Management</h1>
                <p class="page-subtitle">Manage client accounts and relationships</p>
            </div>
            <div class="alert alert-info">Client management features coming soon...</div>
        `;
    }

    async loadAnalytics() {
        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Analytics & Reports</h1>
                <p class="page-subtitle">Business intelligence and performance metrics</p>
            </div>
            <div class="alert alert-info">Analytics features coming soon...</div>
        `;
    }

    async loadReports() {
        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Reports</h1>
                <p class="page-subtitle">Generate and download system reports</p>
            </div>
            <div class="alert alert-info">Reports features coming soon...</div>
        `;
    }

    async loadSettings() {
        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h1 class="page-title">System Settings</h1>
                <p class="page-subtitle">Configure system parameters and preferences</p>
            </div>
            <div class="alert alert-info">Settings features coming soon...</div>
        `;
    }

    // Utility methods
    formatStatus(status) {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    truncateText(text, length) {
        if (!text) return 'N/A';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    formatNumber(num) {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(num || 0);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getDriverStatusColor(status) {
        const colors = {
            'available': 'success',
            'busy': 'warning',
            'offline': 'secondary',
            'on_break': 'info',
            'suspended': 'danger'
        };
        return colors[status] || 'secondary';
    }

    startAutoRefresh() {
        // Refresh dashboard data every 30 seconds
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentPage === 'dashboard') {
                this.loadDashboard();
            } else if (this.currentPage === 'orders') {
                this.refreshOrders();
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});
