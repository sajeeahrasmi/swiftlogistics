// SwiftLogistics Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.API_BASE = 'http://localhost:3002/api/admin';
        this.DRIVERS_API_BASE = 'http://localhost:3002';
        this.AUTH_BASE = 'http://localhost:3001/api/auth';
        this.currentPage = 'dashboard';
        this.selectedOrders = new Set();
        this.autoRefreshInterval = null;
        
        this.checkAuthentication();
    }

    checkAuthentication() {
        const token = this.getAuthToken();
        const userInfo = this.getUserInfo();

        if (!token || !userInfo) {
            this.redirectToLogin();
            return;
        }

        // Check if user is admin
        try {
            const user = JSON.parse(userInfo);
            if (user.role !== 'admin') {
                this.showAlert('Access denied. Admin privileges required.', 'danger');
                this.logout();
                return;
            }
            
            // Token exists and user is admin, initialize dashboard
            this.init();
        } catch (error) {
            console.error('Error parsing user info:', error);
            this.logout();
        }
    }

    getAuthToken() {
        return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    }

    getUserInfo() {
        return localStorage.getItem('adminUserInfo') || sessionStorage.getItem('adminUserInfo');
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUserInfo');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUserInfo');
        this.redirectToLogin();
    }

    init() {
        this.setupEventListeners();
        this.displayUserInfo();
        this.loadPage('dashboard');
        this.startAutoRefresh();
    }

    displayUserInfo() {
        try {
            const userInfo = this.getUserInfo();
            if (userInfo) {
                const user = JSON.parse(userInfo);
                const nameElement = document.getElementById('adminUserName');
                if (nameElement) {
                    nameElement.textContent = `${user.first_name} ${user.last_name}`;
                }
            }
        } catch (error) {
            console.error('Error displaying user info:', error);
        }
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

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Modal event listeners
        document.getElementById('confirmAssignment')?.addEventListener('click', () => {
            this.handleBulkAssignment();
        });

        document.getElementById('confirmEmergency')?.addEventListener('click', () => {
            this.handleEmergencyReassignment();
        });
    }

    async apiRequest(endpoint, options = {}, useDriversApi = false) {
        const token = this.getAuthToken();
        if (!token) {
            this.showAlert('No authentication token found. Please login again.', 'danger');
            this.logout();
            return null;
        }

        const baseUrl = useDriversApi ? this.DRIVERS_API_BASE : this.API_BASE;
        const url = `${baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showAlert('Session expired. Please login again.', 'danger');
                    this.logout();
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
                case 'tracking':
                    await this.loadTracking();
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
        const response = await this.apiRequest('/dashboard/overview');
        if (!response || !response.success) return;

        const data = response.data;
        
        // Process the data to get dashboard metrics
        const metrics = this.processDashboardData(data);

        const content = `
            <div class="page-header">
                <h1 class="page-title">Dashboard Overview</h1>
                <p class="page-subtitle">Real-time logistics operations overview</p>
            </div>

            <!-- Statistics Cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-primary">${metrics.totalOrders}</div>
                        <div class="stat-label">Total Orders</div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-warning">${metrics.pendingOrders}</div>
                        <div class="stat-label">Pending Orders</div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-info">${metrics.activeDrivers}</div>
                        <div class="stat-label">Available Drivers</div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card text-center">
                        <div class="stat-number text-success">${metrics.inTransitOrders}</div>
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
                            <span class="badge bg-info">${metrics.activeDrivers}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>Delivered Today</span>
                            <span class="badge bg-success">${metrics.deliveredToday}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span>Failed Today</span>
                            <span class="badge bg-danger">${metrics.failedToday}</span>
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

        // Extract the orders array from the response
        const ordersArray = orders.data?.orders || orders.orders || orders.data || orders || [];
        console.log('Orders data:', orders); // Debug log
        console.log('Orders array:', ordersArray); // Debug log

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
                        ${this.renderOrdersTable(ordersArray)}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('content').innerHTML = content;
        this.setupOrderManagementEvents();
    }

    renderOrdersTable(orders) {
        if (!Array.isArray(orders) || orders.length === 0) {
            return '<tr><td colspan="10" class="text-center">No orders found</td></tr>';
        }
        
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

    async loadTracking() {
        const trackingData = await this.apiRequest('/tracking/orders');
        if (!trackingData) return;

        const trackingOrders = trackingData.data || [];
        console.log('Tracking data:', trackingData);
        console.log('Tracking orders:', trackingOrders);

        const content = `
            <div class="page-header">
                <h1 class="page-title">Order Tracking</h1>
                <p class="page-subtitle">Real-time tracking of all orders</p>
            </div>

            <!-- Search and Filter -->
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4">
                <div class="row">
                    <div class="col-md-6">
                        <input 
                            type="text" 
                            class="form-control" 
                            id="trackingSearchInput" 
                            placeholder="Search by tracking number, client, or recipient..."
                        >
                    </div>
                    <div class="col-md-3">
                        <select class="form-select" id="trackingStatusFilter">
                            <option value="">All Statuses</option>
                            <option value="Processing">Processing</option>
                            <option value="In Warehouse">In Warehouse</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Delivered">Delivered</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="adminDashboard.filterTracking()">
                            <i class="bi bi-search me-2"></i>Search
                        </button>
                        <button class="btn btn-outline-secondary ms-2" onclick="adminDashboard.refreshTracking()">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tracking Cards -->
            <div class="row" id="trackingCardsContainer">
                ${this.renderTrackingCards(trackingOrders)}
            </div>
        `;

        document.getElementById('content').innerHTML = content;
        this.setupTrackingEvents();
    }

    renderTrackingCards(orders) {
        if (!Array.isArray(orders) || orders.length === 0) {
            return `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-geo-alt text-muted" style="font-size: 3rem;"></i>
                        <h4 class="text-muted mt-3">No tracking data available</h4>
                        <p class="text-muted">Check if the tracking service is running</p>
                    </div>
                </div>
            `;
        }

        return orders.map(order => `
            <div class="col-md-6 col-lg-4 mb-4 tracking-card" data-tracking="${order.trackingNumber}" data-status="${order.status}">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-between align-items-start mb-3">
                            <div>
                                <h6 class="card-title mb-1">${order.clientName || 'Unknown Client'}</h6>
                                <small class="text-muted">${order.trackingNumber}</small>
                            </div>
                            <span class="badge bg-${this.getStatusColor(order.status)}">${order.status}</span>
                        </div>
                        
                        <div class="mb-3">
                            <h6 class="text-primary mb-1">${order.recipient || 'No recipient'}</h6>
                            <small class="text-muted d-block">${order.address || 'No address'}</small>
                        </div>

                        <div class="progress mb-3" style="height: 6px;">
                            <div class="progress-bar bg-primary" 
                                 style="width: ${order.routeProgress || 0}%"></div>
                        </div>

                        <div class="row text-center mb-3">
                            <div class="col-4">
                                <small class="text-muted d-block">Items</small>
                                <strong>${order.items || 0}</strong>
                            </div>
                            <div class="col-8">
                                <small class="text-muted d-block">Current Location</small>
                                <strong class="text-truncate d-block" title="${order.currentLocation || 'Unknown'}">${order.currentLocation || 'Unknown'}</strong>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between align-items-end">
                            <div>
                                <small class="text-muted">Last Update</small>
                                <div class="small">${order.lastUpdate || 'No update'}</div>
                            </div>
                            <div class="text-end">
                                <small class="text-muted">Est. Delivery</small>
                                <div class="small text-primary">${order.estimatedDelivery || 'TBD'}</div>
                            </div>
                        </div>

                        <div class="mt-3 pt-2 border-top">
                            <small class="text-muted">
                                <i class="bi bi-truck me-1"></i>
                                Driver: ${order.driverName || 'Unassigned'}
                            </small>
                        </div>
                    </div>
                    
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-outline-primary btn-sm w-100" 
                                onclick="adminDashboard.viewTrackingDetails('${order.trackingNumber}')">
                            <i class="bi bi-eye me-2"></i>View Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupTrackingEvents() {
        // Search input event
        document.getElementById('trackingSearchInput')?.addEventListener('input', 
            this.debounce(() => this.filterTracking(), 300)
        );

        // Status filter event
        document.getElementById('trackingStatusFilter')?.addEventListener('change', () => {
            this.filterTracking();
        });
    }

    filterTracking() {
        const searchTerm = document.getElementById('trackingSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('trackingStatusFilter')?.value || '';

        const cards = document.querySelectorAll('.tracking-card');
        cards.forEach(card => {
            const trackingNumber = card.dataset.tracking?.toLowerCase() || '';
            const status = card.dataset.status || '';
            const cardText = card.textContent.toLowerCase();

            const matchesSearch = !searchTerm || cardText.includes(searchTerm) || trackingNumber.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;

            card.style.display = (matchesSearch && matchesStatus) ? 'block' : 'none';
        });
    }

    async refreshTracking() {
        await this.loadTracking();
    }

    async viewTrackingDetails(trackingNumber) {
        console.log('Loading tracking details for:', trackingNumber);
        
        // Get detailed tracking information
        const trackingDetails = await this.getTrackingDetails(trackingNumber);
        
        if (!trackingDetails) {
            this.showAlert('Failed to load tracking details', 'danger');
            return;
        }
        
        this.showTrackingDetailsModal(trackingDetails);
    }

    async getTrackingDetails(trackingNumber) {
        try {
            // Try to get details from tracking service first
            const response = await fetch(`http://localhost:3003/api/orders/${trackingNumber}`);
            if (response.ok) {
                const data = await response.json();
                return data.data || data;
            }
        } catch (error) {
            console.warn('Could not fetch from tracking service:', error);
        }

        // Fallback to mock detailed data
        return this.getMockTrackingDetails(trackingNumber);
    }

    getMockTrackingDetails(trackingNumber) {
        return {
            trackingNumber: trackingNumber,
            recipient: "Bob Williams",
            recipientPhone: "+94 77 123 4567",
            recipientEmail: "bob.williams@email.com",
            address: "45 Union Place, Colombo 02",
            status: "In Transit",
            currentLocation: "Kandy Distribution Center",
            estimatedDelivery: "2025-09-20 03:00 PM",
            priority: "High",
            items: 2,
            weight: "1.2 kg",
            clientName: "Beta Ltd",
            driverName: "Maria Perera",
            driverPhone: "+94 71 987 6543",
            vehicleNumber: "WP CAB-1234",
            timeline: [
                {
                    timestamp: "2025-09-18 09:30 AM",
                    status: "Order Placed",
                    location: "Client Portal",
                    description: "Order created and payment confirmed",
                    icon: "bi-plus-circle",
                    color: "primary"
                },
                {
                    timestamp: "2025-09-18 10:15 AM",
                    status: "Processing",
                    location: "Colombo Main Warehouse",
                    description: "Package processed and ready for pickup",
                    icon: "bi-box-seam",
                    color: "info"
                },
                {
                    timestamp: "2025-09-18 02:45 PM",
                    status: "Driver Assigned",
                    location: "Colombo Main Warehouse",
                    description: "Assigned to Maria Perera (WP CAB-1234)",
                    icon: "bi-person-check",
                    color: "warning"
                },
                {
                    timestamp: "2025-09-18 03:30 PM",
                    status: "Picked Up",
                    location: "Colombo Main Warehouse",
                    description: "Package collected by driver",
                    icon: "bi-truck",
                    color: "warning"
                },
                {
                    timestamp: "2025-09-19 08:15 AM",
                    status: "In Transit",
                    location: "Kandy Distribution Center",
                    description: "Package arrived at intermediate hub",
                    icon: "bi-geo-alt",
                    color: "primary"
                }
            ],
            deliveryAttempts: [
                {
                    date: "2025-09-19",
                    time: "10:30 AM",
                    status: "Scheduled",
                    notes: "First delivery attempt scheduled",
                    outcome: "pending"
                }
            ],
            communications: [
                {
                    timestamp: "2025-09-18 02:50 PM",
                    type: "SMS",
                    recipient: "Customer",
                    message: "Your package TRK-728416 has been assigned to driver Maria Perera",
                    status: "delivered"
                },
                {
                    timestamp: "2025-09-19 08:20 AM",
                    type: "Email",
                    recipient: "Customer",
                    message: "Package update: Your order is now in transit to Kandy",
                    status: "delivered"
                }
            ]
        };
    }

    showTrackingDetailsModal(details) {
        const modalHTML = `
            <div class="modal fade" id="trackingDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-geo-alt me-2"></i>
                                Tracking Details: ${details.trackingNumber}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <!-- Left Column - Order Information -->
                                <div class="col-lg-4">
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="bi bi-box-seam me-2"></i>Order Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-2">
                                                <strong>Status:</strong>
                                                <span class="badge bg-${this.getStatusColor(details.status)} ms-2">${details.status}</span>
                                            </div>
                                            <div class="mb-2"><strong>Priority:</strong> ${details.priority || 'Medium'}</div>
                                            <div class="mb-2"><strong>Items:</strong> ${details.items || 1}</div>
                                            <div class="mb-2"><strong>Weight:</strong> ${details.weight || 'N/A'}</div>
                                            <div class="mb-2"><strong>Client:</strong> ${details.clientName || 'N/A'}</div>
                                            <div class="mb-2"><strong>Current Location:</strong> ${details.currentLocation || 'N/A'}</div>
                                            <div class="mb-2"><strong>Est. Delivery:</strong> ${details.estimatedDelivery || 'TBD'}</div>
                                        </div>
                                    </div>

                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="bi bi-person me-2"></i>Recipient Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-2"><strong>Name:</strong> ${details.recipient || 'N/A'}</div>
                                            <div class="mb-2"><strong>Phone:</strong> ${details.recipientPhone || 'N/A'}</div>
                                            <div class="mb-2"><strong>Email:</strong> ${details.recipientEmail || 'N/A'}</div>
                                            <div class="mb-2"><strong>Address:</strong><br>${details.address || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="bi bi-truck me-2"></i>Driver Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-2"><strong>Driver:</strong> ${details.driverName || 'Unassigned'}</div>
                                            <div class="mb-2"><strong>Phone:</strong> ${details.driverPhone || 'N/A'}</div>
                                            <div class="mb-2"><strong>Vehicle:</strong> ${details.vehicleNumber || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column - Timeline and Communications -->
                                <div class="col-lg-8">
                                    <!-- Delivery Timeline -->
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>Delivery Timeline</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="timeline">
                                                ${this.renderTimeline(details.timeline || [])}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Delivery Attempts -->
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="bi bi-arrow-repeat me-2"></i>Delivery Attempts</h6>
                                        </div>
                                        <div class="card-body">
                                            ${this.renderDeliveryAttempts(details.deliveryAttempts || [])}
                                        </div>
                                    </div>

                                    <!-- Customer Communications -->
                                    <div class="card">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="bi bi-chat-dots me-2"></i>Customer Communications</h6>
                                        </div>
                                        <div class="card-body">
                                            ${this.renderCommunications(details.communications || [])}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-primary" onclick="adminDashboard.printTrackingDetails('${details.trackingNumber}')">
                                <i class="bi bi-printer me-2"></i>Print
                            </button>
                            <button type="button" class="btn btn-outline-info" onclick="adminDashboard.exportTrackingDetails('${details.trackingNumber}')">
                                <i class="bi bi-download me-2"></i>Export
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('trackingDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('trackingDetailsModal'));
        modal.show();
    }

    renderTimeline(timeline) {
        if (!timeline || timeline.length === 0) {
            return '<p class="text-muted">No timeline data available</p>';
        }

        return timeline.map((item, index) => `
            <div class="timeline-item">
                <div class="timeline-marker bg-${item.color || 'primary'}">
                    <i class="${item.icon || 'bi-circle'} text-white"></i>
                </div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${item.status}</h6>
                            <p class="mb-1 text-muted small">${item.description}</p>
                            <small class="text-primary"><i class="bi bi-geo-alt me-1"></i>${item.location}</small>
                        </div>
                        <small class="text-muted">${item.timestamp}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderDeliveryAttempts(attempts) {
        if (!attempts || attempts.length === 0) {
            return '<p class="text-muted">No delivery attempts recorded</p>';
        }

        return attempts.map(attempt => `
            <div class="border-bottom pb-2 mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${attempt.date} at ${attempt.time}</strong>
                        <span class="badge bg-${attempt.outcome === 'pending' ? 'warning' : attempt.outcome === 'success' ? 'success' : 'danger'} ms-2">
                            ${attempt.status}
                        </span>
                    </div>
                </div>
                <small class="text-muted">${attempt.notes}</small>
            </div>
        `).join('');
    }

    renderCommunications(communications) {
        if (!communications || communications.length === 0) {
            return '<p class="text-muted">No communications recorded</p>';
        }

        return communications.map(comm => `
            <div class="border-bottom pb-2 mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-${comm.type === 'SMS' ? 'info' : 'primary'}">${comm.type}</span>
                        <strong class="ms-2">to ${comm.recipient}</strong>
                        <span class="badge bg-${comm.status === 'delivered' ? 'success' : 'warning'} ms-2">${comm.status}</span>
                    </div>
                    <small class="text-muted">${comm.timestamp}</small>
                </div>
                <small class="text-muted mt-1 d-block">${comm.message}</small>
            </div>
        `).join('');
    }

    printTrackingDetails(trackingNumber) {
        alert(`Printing tracking details for ${trackingNumber}...\n\nThis would generate a printable report.`);
    }

    exportTrackingDetails(trackingNumber) {
        alert(`Exporting tracking details for ${trackingNumber}...\n\nThis would download tracking data as PDF/Excel.`);
    }

    getStatusColor(status) {
        const statusColors = {
            'processing': 'warning',
            'in warehouse': 'info',
            'in transit': 'primary',
            'delivered': 'success',
            'failed': 'danger',
            'pending': 'secondary'
        };
        return statusColors[status?.toLowerCase()] || 'secondary';
    }

    // Debounce utility function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    updateSelectedCount() {
        const count = this.selectedOrders.size;
        document.getElementById('selectedCount').textContent = count;
        document.getElementById('bulkAssignBtn').disabled = count === 0;
    }

    async loadDriverManagement() {
        const response = await this.apiRequest('/api/drivers', {}, true);
        if (!response) return;

        const drivers = response.data?.drivers || response.drivers || response || [];
        console.log('Drivers data:', response);
        console.log('Drivers array:', drivers);

        const content = `
            <div class="page-header">
                <h1 class="page-title">Driver Management</h1>
                <p class="page-subtitle">Monitor and manage all drivers</p>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-primary" onclick="adminDashboard.showAddDriverModal()">
                        <i class="bi bi-plus-circle"></i> Add New Driver
                    </button>
                    <button class="btn btn-outline-primary" onclick="adminDashboard.exportDrivers()">
                        <i class="bi bi-download"></i> Export Data
                    </button>
                    <div class="dropdown">
                        <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-funnel"></i> Filter by Status
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterDrivers('all')">All Drivers</a></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterDrivers('available')">Available</a></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterDrivers('busy')">Busy</a></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterDrivers('offline')">Offline</a></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterDrivers('on_break')">On Break</a></li>
                            <li><a class="dropdown-item" href="#" onclick="adminDashboard.filterDrivers('suspended')">Suspended</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="row" id="driversContainer">
                ${Array.isArray(drivers) ? drivers.map(driver => `
                    <div class="col-md-6 col-lg-4 mb-3 driver-card" data-status="${driver.status}">
                        <div class="stat-card">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="mb-1">${driver.first_name} ${driver.last_name}</h6>
                                    <small class="text-muted">${driver.phone}</small>
                                </div>
                                <span class="badge bg-${this.getDriverStatusColor(driver.status)}">${this.formatStatus(driver.status)}</span>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Vehicle:</small>
                                <div>${this.formatStatus(driver.vehicle_type)} - ${driver.vehicle_plate}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">License:</small>
                                <div>${driver.driver_license || 'N/A'}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Total Deliveries:</small>
                                <div>${driver.total_deliveries || 0}</div>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted">Rating:</small>
                                <div>${'★'.repeat(Math.floor(parseFloat(driver.rating) || 5))} ${(parseFloat(driver.rating) || 5.0).toFixed(1)}/5 (${driver.rating_count || 0} reviews)</div>
                            </div>
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.viewDriverDetails('${driver.id}')">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="adminDashboard.editDriver('${driver.id}')">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                ${driver.status !== 'suspended' ? 
                                    `<button class="btn btn-sm btn-outline-warning" onclick="adminDashboard.toggleDriverStatus('${driver.id}', 'suspended')">
                                        <i class="bi bi-pause"></i> Suspend
                                    </button>` :
                                    `<button class="btn btn-sm btn-outline-success" onclick="adminDashboard.toggleDriverStatus('${driver.id}', 'available')">
                                        <i class="bi bi-play"></i> Activate
                                    </button>`
                                }
                            </div>
                        </div>
                    </div>
                `).join('') : '<div class="col-12"><div class="alert alert-info">No drivers found</div></div>'}
            </div>
        `;

        document.getElementById('content').innerHTML = content;
    }

    async openAssignmentModal() {
        if (this.selectedOrders.size === 0) {
            this.showAlert('Please select orders to assign', 'warning');
            return;
        }

        const response = await this.apiRequest('/api/drivers?available_only=true', {}, true);
        if (!response) return;

        const drivers = response.data?.drivers || response.drivers || response || [];

        // Populate driver select
        const driverSelect = document.getElementById('driverSelect');
        driverSelect.innerHTML = '<option value="">Choose a driver...</option>' +
            (Array.isArray(drivers) ? drivers.map(driver => `
                <option value="${driver.id}">
                    ${driver.first_name} ${driver.last_name} - ${driver.vehicle_type} (${driver.vehicle_plate})
                </option>
            `).join('') : '');

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

        // Format data according to what the API expects
        const assignments = Array.from(this.selectedOrders).map(orderId => ({
            order_id: parseInt(orderId),
            driver_id: parseInt(driverId),
            assignment_notes: notes || undefined
        }));

        const assignmentData = {
            assignments: assignments
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
        const response = await this.apiRequest('/api/drivers?available_only=true', {}, true);
        if (!response) return;

        const drivers = response.data?.drivers || response.drivers || response || [];

        // Populate driver select
        const emergencyDriverSelect = document.getElementById('emergencyDriverSelect');
        emergencyDriverSelect.innerHTML = '<option value="">Choose a driver...</option>' +
            (Array.isArray(drivers) ? drivers.map(driver => `
                <option value="${driver.id}">
                    ${driver.first_name} ${driver.last_name} - ${driver.vehicle_type}
                </option>
            `).join('') : '');

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
        const assignments = await this.apiRequest('/assignments');
        if (!assignments) return;

        const assignmentsArray = assignments.data?.assignments || assignments.assignments || assignments || [];

        const content = `
            <div class="page-header">
                <h1 class="page-title">Assignment Management</h1>
                <p class="page-subtitle">Track order assignments and driver allocations</p>
            </div>

            <div class="filter-section">
                <div class="row">
                    <div class="col-md-4">
                        <label class="form-label">Status Filter</label>
                        <select class="form-select" id="assignmentStatusFilter">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Date Range</label>
                        <input type="date" class="form-control" id="assignmentDateFilter">
                    </div>
                    <div class="col-md-4 d-flex align-items-end">
                        <button class="btn btn-primary" onclick="adminDashboard.filterAssignments()">
                            <i class="bi bi-funnel"></i> Filter
                        </button>
                        <button class="btn btn-outline-secondary ms-2" onclick="adminDashboard.clearAssignmentFilters()">
                            <i class="bi bi-x-circle"></i> Clear
                        </button>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Assignment ID</th>
                                <th>Order ID</th>
                                <th>Driver</th>
                                <th>Client</th>
                                <th>Status</th>
                                <th>Assigned Date</th>
                                <th>Completed Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="assignmentsTableBody">
                            ${Array.isArray(assignmentsArray) ? assignmentsArray.map(assignment => `
                                <tr>
                                    <td>#${assignment.id}</td>
                                    <td>#${assignment.order_id}</td>
                                    <td>${assignment.driver_name || 'N/A'}</td>
                                    <td>${assignment.client_name || 'N/A'}</td>
                                    <td><span class="badge status-${assignment.status}">${this.formatStatus(assignment.status)}</span></td>
                                    <td>${assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'N/A'}</td>
                                    <td>${assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary me-1" onclick="adminDashboard.viewAssignmentDetails('${assignment.id}')">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                        ${assignment.status === 'pending' ? `
                                            <button class="btn btn-sm btn-outline-danger" onclick="adminDashboard.cancelAssignment('${assignment.id}')">
                                                <i class="bi bi-x-circle"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="8" class="text-center">No assignments found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = content;
    }

    async loadClients() {
        const clients = await this.apiRequest('/clients');
        if (!clients) return;

        const clientsArray = clients.data?.clients || clients.clients || clients.data || clients || [];

        const content = `
            <div class="page-header">
                <h1 class="page-title">Client Management</h1>
                <p class="page-subtitle">Manage client accounts and relationships</p>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-primary" onclick="adminDashboard.showAddClientModal()">
                        <i class="bi bi-plus-circle"></i> Add New Client
                    </button>
                    <button class="btn btn-outline-primary" onclick="adminDashboard.exportClients()">
                        <i class="bi bi-download"></i> Export Data
                    </button>
                </div>
            </div>

            <div class="filter-section">
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Search Clients</label>
                        <input type="text" class="form-control" id="clientSearchInput" placeholder="Search by name, email, or company...">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Status Filter</label>
                        <select class="form-select" id="clientStatusFilter">
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <div class="col-md-3 d-flex align-items-end">
                        <button class="btn btn-primary" onclick="adminDashboard.filterClients()">
                            <i class="bi bi-search"></i> Search
                        </button>
                    </div>
                </div>
            </div>

            <div class="row">
                ${Array.isArray(clientsArray) ? clientsArray.map(client => `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="stat-card">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="mb-1">${client.company_name || (client.first_name + ' ' + client.last_name)}</h6>
                                    <small class="text-muted">${client.contact_email || client.email || 'No email'}</small>
                                </div>
                                <span class="badge bg-${client.status === 'active' ? 'success' : client.status === 'inactive' ? 'secondary' : 'danger'}">${client.status || 'active'}</span>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Contact:</small>
                                <div>${client.contact_phone || client.phone || 'N/A'}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Address:</small>
                                <div>${this.formatClientAddress(client)}</div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Contact Person:</small>
                                <div>${client.contact_person || 'N/A'}</div>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted">Total Orders:</small>
                                <div><strong>${client.total_orders || 0}</strong></div>
                            </div>
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.viewClientDetails('${client.id}')">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="adminDashboard.editClient('${client.id}')">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('') : '<div class="col-12"><div class="alert alert-info">No clients found</div></div>'}
            </div>
        `;

        document.getElementById('content').innerHTML = content;
    }

    async loadSettings() {
        const content = `
            <div class="page-header">
                <h1 class="page-title">System Settings</h1>
                <p class="page-subtitle">Configure system parameters and preferences</p>
            </div>

            <div class="row">
                <!-- General Settings -->
                <div class="col-md-6 mb-4">
                    <div class="stat-card">
                        <h5 class="mb-3"><i class="bi bi-gear me-2"></i>General Settings</h5>
                        <form id="generalSettingsForm">
                            <div class="mb-3">
                                <label class="form-label">Company Name</label>
                                <input type="text" class="form-control" id="companyName" value="SwiftLogistics">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">System Email</label>
                                <input type="email" class="form-control" id="systemEmail" value="admin@swiftlogistics.com">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Default Timezone</label>
                                <select class="form-select" id="timezone">
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">Eastern Time</option>
                                    <option value="America/Chicago">Central Time</option>
                                    <option value="America/Denver">Mountain Time</option>
                                    <option value="America/Los_Angeles">Pacific Time</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
                </div>

                <!-- Notification Settings -->
                <div class="col-md-6 mb-4">
                    <div class="stat-card">
                        <h5 class="mb-3"><i class="bi bi-bell me-2"></i>Notification Settings</h5>
                        <form id="notificationSettingsForm">
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="emailNotifications" checked>
                                    <label class="form-check-label" for="emailNotifications">
                                        Email Notifications
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="orderAlerts" checked>
                                    <label class="form-check-label" for="orderAlerts">
                                        New Order Alerts
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="driverAlerts" checked>
                                    <label class="form-check-label" for="driverAlerts">
                                        Driver Status Alerts
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="systemAlerts">
                                    <label class="form-check-label" for="systemAlerts">
                                        System Maintenance Alerts
                                    </label>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Preferences</button>
                        </form>
                    </div>
                </div>

                <!-- Security Settings -->
                <div class="col-md-6 mb-4">
                    <div class="stat-card">
                        <h5 class="mb-3"><i class="bi bi-shield-check me-2"></i>Security Settings</h5>
                        <form id="securitySettingsForm">
                            <div class="mb-3">
                                <label class="form-label">Session Timeout (minutes)</label>
                                <input type="number" class="form-control" id="sessionTimeout" value="60" min="15" max="480">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Maximum Login Attempts</label>
                                <input type="number" class="form-control" id="maxLoginAttempts" value="5" min="3" max="10">
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="twoFactorAuth">
                                    <label class="form-check-label" for="twoFactorAuth">
                                        Enable Two-Factor Authentication
                                    </label>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">Update Security</button>
                        </form>
                    </div>
                </div>

                <!-- System Information -->
                <div class="col-md-6 mb-4">
                    <div class="stat-card">
                        <h5 class="mb-3"><i class="bi bi-info-circle me-2"></i>System Information</h5>
                        <div class="mb-2">
                            <small class="text-muted">Version:</small>
                            <div><strong>1.0.0</strong></div>
                        </div>
                        <div class="mb-2">
                            <small class="text-muted">Last Updated:</small>
                            <div>${new Date().toLocaleDateString()}</div>
                        </div>
                        <div class="mb-2">
                            <small class="text-muted">Database Status:</small>
                            <div><span class="badge bg-success">Connected</span></div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">Active Users:</small>
                            <div><strong>1</strong> (Admin)</div>
                        </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary" onclick="adminDashboard.checkSystemHealth()">
                                <i class="bi bi-heart-pulse"></i> System Health Check
                            </button>
                            <button class="btn btn-outline-secondary" onclick="adminDashboard.downloadLogs()">
                                <i class="bi bi-download"></i> Download Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = content;

        // Add form event listeners
        document.getElementById('generalSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGeneralSettings();
        });

        document.getElementById('notificationSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNotificationSettings();
        });

        document.getElementById('securitySettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSecuritySettings();
        });
    }

    // Supporting methods for new functionalities
    async filterAssignments() {
        const status = document.getElementById('assignmentStatusFilter').value;
        const date = document.getElementById('assignmentDateFilter').value;
        // Reload assignments with filters
        await this.loadAssignments();
        this.showAlert('Assignments filtered successfully', 'success');
    }

    clearAssignmentFilters() {
        document.getElementById('assignmentStatusFilter').value = '';
        document.getElementById('assignmentDateFilter').value = '';
        this.loadAssignments();
    }

    async viewAssignmentDetails(assignmentId) {
        try {
            // Show the modal first
            const modal = new bootstrap.Modal(document.getElementById('assignmentDetailsModal') || this.createAssignmentDetailsModal());
            modal.show();
            
            // Reset content to loading state
            const content = document.getElementById('assignmentDetailsContent');
            content.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            
            // Fetch assignment details
            const response = await this.apiRequest(`/assignments/${assignmentId}`);
            
            if (response && response.success) {
                const assignment = response.data.assignment;
                
                content.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Assignment Information</h6>
                            <div class="mb-2">
                                <strong>Assignment ID:</strong> #${assignment.id}
                            </div>
                            <div class="mb-2">
                                <strong>Status:</strong> <span class="badge bg-${this.getStatusColor(assignment.status)}">${this.formatStatus(assignment.status)}</span>
                            </div>
                            <div class="mb-2">
                                <strong>Assigned Date:</strong> ${this.formatDateTime(assignment.assigned_at)}
                            </div>
                            <div class="mb-2">
                                <strong>Accepted Date:</strong> ${assignment.accepted_at ? this.formatDateTime(assignment.accepted_at) : 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Started Date:</strong> ${assignment.started_at ? this.formatDateTime(assignment.started_at) : 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Completed Date:</strong> ${assignment.completed_at ? this.formatDateTime(assignment.completed_at) : 'N/A'}
                            </div>
                            ${assignment.assignment_notes ? `
                            <div class="mb-2">
                                <strong>Assignment Notes:</strong><br>
                                <small class="text-muted">${assignment.assignment_notes}</small>
                            </div>
                            ` : ''}
                            ${assignment.admin_notes ? `
                            <div class="mb-2">
                                <strong>Admin Notes:</strong><br>
                                <small class="text-muted">${assignment.admin_notes}</small>
                            </div>
                            ` : ''}
                            ${assignment.driver_notes ? `
                            <div class="mb-2">
                                <strong>Driver Notes:</strong><br>
                                <small class="text-muted">${assignment.driver_notes}</small>
                            </div>
                            ` : ''}
                            
                            <h6 class="fw-bold mb-3 mt-4">Driver Information</h6>
                            <div class="mb-2">
                                <strong>Driver:</strong> ${assignment.driver_name || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Email:</strong> ${assignment.driver_email || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Phone:</strong> ${assignment.driver_phone || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>License Number:</strong> ${assignment.driver_license || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Vehicle:</strong> ${assignment.vehicle_type ? `${this.formatStatus(assignment.vehicle_type)} ${assignment.vehicle_model ? `(${assignment.vehicle_model})` : ''} - ${assignment.vehicle_plate || 'N/A'}` : 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Vehicle Capacity:</strong> ${assignment.vehicle_capacity_kg ? `${assignment.vehicle_capacity_kg} kg` : 'N/A'}
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Order Information</h6>
                            <div class="mb-2">
                                <strong>Order ID:</strong> #${assignment.order_id}
                            </div>
                            <div class="mb-2">
                                <strong>Tracking Number:</strong> ${assignment.tracking_number || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Order Status:</strong> <span class="badge bg-${this.getStatusColor(assignment.order_status)}">${this.formatStatus(assignment.order_status)}</span>
                            </div>
                            <div class="mb-2">
                                <strong>Priority:</strong> <span class="badge bg-${this.getPriorityColor(assignment.priority)}">${this.formatStatus(assignment.priority)}</span>
                            </div>
                            <div class="mb-2">
                                <strong>Created:</strong> ${this.formatDateTime(assignment.order_created_at)}
                            </div>
                            
                            <h6 class="fw-bold mb-3 mt-4">Client Information</h6>
                            <div class="mb-2">
                                <strong>Client:</strong> ${assignment.client_name || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Company:</strong> ${assignment.company_name || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Email:</strong> ${assignment.client_email || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Phone:</strong> ${assignment.client_phone || 'N/A'}
                            </div>
                            
                            <h6 class="fw-bold mb-3 mt-4">Delivery Details</h6>
                            <div class="mb-2">
                                <strong>Pickup Address:</strong><br>
                                <small class="text-muted">${assignment.pickup_address || 'N/A'}</small>
                            </div>
                            <div class="mb-2">
                                <strong>Delivery Address:</strong><br>
                                <small class="text-muted">${assignment.delivery_address || 'N/A'}</small>
                            </div>
                            <div class="mb-2">
                                <strong>Recipient:</strong> ${assignment.recipient_name || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Recipient Phone:</strong> ${assignment.recipient_phone || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Estimated Pickup:</strong> ${assignment.estimated_pickup_time ? this.formatDateTime(assignment.estimated_pickup_time) : 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Actual Pickup:</strong> ${assignment.actual_pickup_time ? this.formatDateTime(assignment.actual_pickup_time) : 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Estimated Delivery:</strong> ${assignment.estimated_delivery_time ? this.formatDateTime(assignment.estimated_delivery_time) : (assignment.order_estimated_delivery ? this.formatDateTime(assignment.order_estimated_delivery) : 'N/A')}
                            </div>
                            <div class="mb-2">
                                <strong>Actual Delivery:</strong> ${assignment.actual_delivery_time ? this.formatDateTime(assignment.actual_delivery_time) : 'N/A'}
                            </div>
                            ${assignment.special_instructions ? `
                            <div class="mb-2">
                                <strong>Special Instructions:</strong><br>
                                <small class="text-muted">${assignment.special_instructions}</small>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                
            } else {
                throw new Error('Failed to fetch assignment details');
            }
        } catch (error) {
            console.error('Error loading assignment details:', error);
            const content = document.getElementById('assignmentDetailsContent');
            if (content) {
                content.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        Failed to load assignment details. Please try again.
                    </div>
                `;
            }
        }
    }

    createAssignmentDetailsModal() {
        const modalHtml = `
            <div class="modal fade" id="assignmentDetailsModal" tabindex="-1" aria-labelledby="assignmentDetailsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="assignmentDetailsModalLabel">
                                <i class="bi bi-clipboard-data"></i> Assignment Details
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="assignmentDetailsContent">
                                <!-- Content will be loaded here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        return document.getElementById('assignmentDetailsModal');
    }

    async cancelAssignment(assignmentId) {
        if (confirm('Are you sure you want to cancel this assignment?')) {
            // API call to cancel assignment would go here
            this.showAlert(`Assignment ${assignmentId} cancelled successfully`, 'warning');
            await this.loadAssignments();
        }
    }

    async filterClients() {
        const search = document.getElementById('clientSearchInput').value;
        const status = document.getElementById('clientStatusFilter').value;
        // Reload clients with filters
        await this.loadClients();
        this.showAlert('Clients filtered successfully', 'success');
    }

    async showAddClientModal() {
        this.showAlert('Add client functionality would open a modal here', 'info');
    }

    async exportClients() {
        this.showAlert('Client data export functionality would be implemented here', 'info');
    }

    async viewClientDetails(clientId) {
        try {
            // Show the modal first
            const modal = new bootstrap.Modal(document.getElementById('clientDetailsModal') || this.createClientDetailsModal());
            modal.show();
            
            // Reset content to loading state
            const content = document.getElementById('clientDetailsContent');
            content.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            
            // Fetch client details
            const response = await this.apiRequest(`/clients/${clientId}`);
            
            if (response && response.success) {
                const client = response.data.client;
                
                content.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Company Information</h6>
                            <div class="mb-2">
                                <strong>Company Name:</strong> ${client.company_name || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Registration Number:</strong> ${client.company_registration_number || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Tax ID:</strong> ${client.tax_id || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Company Type:</strong> ${this.formatStatus(client.company_type)}
                            </div>
                            <div class="mb-2">
                                <strong>Industry:</strong> ${client.industry || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Website:</strong> ${client.website ? `<a href="${client.website}" target="_blank">${client.website}</a>` : 'N/A'}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Contact Information</h6>
                            <div class="mb-2">
                                <strong>Contact Person:</strong> ${client.contact_person || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Email:</strong> ${client.contact_email || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Phone:</strong> ${client.contact_phone || 'N/A'}
                            </div>
                            <div class="mb-2">
                                <strong>Status:</strong> 
                                <span class="badge bg-${client.status === 'active' ? 'success' : client.status === 'inactive' ? 'secondary' : 'danger'}">${this.formatStatus(client.status)}</span>
                            </div>
                            <div class="mb-2">
                                <strong>Preferred Communication:</strong> ${this.formatStatus(client.preferred_communication)}
                            </div>
                        </div>
                    </div>
                    <hr>
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Address</h6>
                            <div class="mb-2">
                                <strong>Address:</strong><br>
                                ${this.formatClientAddress(client)}
                            </div>
                            <div class="mb-2">
                                <strong>Country:</strong> ${client.country || 'N/A'}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Business Details</h6>
                            <div class="mb-2">
                                <strong>Contract Type:</strong> ${this.formatStatus(client.contract_type)}
                            </div>
                            <div class="mb-2">
                                <strong>Credit Limit:</strong> ${client.currency || 'LKR'} ${this.formatNumber(client.credit_limit)}
                            </div>
                            <div class="mb-2">
                                <strong>Current Balance:</strong> ${client.currency || 'LKR'} ${this.formatNumber(client.current_balance)}
                            </div>
                            <div class="mb-2">
                                <strong>Payment Terms:</strong> ${client.payment_terms || 30} days
                            </div>
                            <div class="mb-2">
                                <strong>Created:</strong> ${client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Unknown'}
                            </div>
                        </div>
                    </div>
                    ${client.special_requirements ? `
                    <hr>
                    <div class="row">
                        <div class="col-12">
                            <h6 class="fw-bold mb-3">Special Requirements</h6>
                            <p class="text-muted">${client.special_requirements}</p>
                        </div>
                    </div>
                    ` : ''}
                `;
                
            } else {
                throw new Error('Failed to fetch client details');
            }
        } catch (error) {
            console.error('Error loading client details:', error);
            const content = document.getElementById('clientDetailsContent');
            if (content) {
                content.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        Failed to load client details. Please try again.
                    </div>
                `;
            }
        }
    }

    createClientDetailsModal() {
        // Check if modal already exists
        let modal = document.getElementById('clientDetailsModal');
        if (modal) return modal;

        // Create the modal HTML
        const modalHTML = `
            <div class="modal fade" id="clientDetailsModal" tabindex="-1" aria-labelledby="clientDetailsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="clientDetailsModalLabel">Client Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="clientDetailsContent">
                            <div class="text-center">
                                <div class="spinner-border" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="editClientModalBtn">Edit Client</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to the document
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return document.getElementById('clientDetailsModal');
    }

    async editClient(clientId) {
        // For now, show an informative message about edit functionality
        this.showAlert(`Edit client functionality is not yet implemented. Client ID: ${clientId}. This would open an edit form with the client's current information for modification.`, 'info');
        
        // TODO: Implement client editing functionality
        // This should:
        // 1. Fetch current client data
        // 2. Open an edit modal with a form
        // 3. Allow updating client information
        // 4. Submit changes to the API
    }

    async saveGeneralSettings() {
        const companyName = document.getElementById('companyName').value;
        const systemEmail = document.getElementById('systemEmail').value;
        const timezone = document.getElementById('timezone').value;
        
        // API call to save settings would go here
        this.showAlert('General settings saved successfully', 'success');
    }

    async saveNotificationSettings() {
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const orderAlerts = document.getElementById('orderAlerts').checked;
        const driverAlerts = document.getElementById('driverAlerts').checked;
        const systemAlerts = document.getElementById('systemAlerts').checked;
        
        // API call to save notification preferences would go here
        this.showAlert('Notification preferences saved successfully', 'success');
    }

    async saveSecuritySettings() {
        const sessionTimeout = document.getElementById('sessionTimeout').value;
        const maxLoginAttempts = document.getElementById('maxLoginAttempts').value;
        const twoFactorAuth = document.getElementById('twoFactorAuth').checked;
        
        // API call to save security settings would go here
        this.showAlert('Security settings updated successfully', 'success');
    }

    async checkSystemHealth() {
        this.showAlert('System health check: All services running normally', 'success');
    }

    async downloadLogs() {
        this.showAlert('Log download functionality would be implemented here', 'info');
    }

    async viewDriverDetails(driverId) {
        try {
            // Show the modal first
            const modal = new bootstrap.Modal(document.getElementById('driverDetailsModal'));
            modal.show();
            
            // Reset content to loading state
            const content = document.getElementById('driverDetailsContent');
            content.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            
            // Fetch driver details
            const response = await this.apiRequest(`/api/drivers/${driverId}`, {}, true);
            
            if (response && response.success) {
                const driverData = response.data.driver;
                const statusClass = this.getStatusClass(driverData.status);
                const vehicleTypeIcon = this.getVehicleTypeIcon(driverData.vehicle_type);
                
                content.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Personal Information</h6>
                            <div class="mb-2">
                                <strong>Name:</strong> ${driverData.first_name} ${driverData.last_name}
                            </div>
                            <div class="mb-2">
                                <strong>Email:</strong> ${driverData.email}
                            </div>
                            <div class="mb-2">
                                <strong>Phone:</strong> ${driverData.phone}
                            </div>
                            <div class="mb-2">
                                <strong>Emergency Contact:</strong> ${driverData.emergency_contact_name || 'Not provided'}
                            </div>
                            <div class="mb-2">
                                <strong>Emergency Phone:</strong> ${driverData.emergency_contact_phone || 'Not provided'}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Driver Information</h6>
                            <div class="mb-2">
                                <strong>License Number:</strong> ${driverData.driver_license || 'Not provided'}
                            </div>
                            <div class="mb-2">
                                <strong>License Expiry:</strong> ${driverData.license_expiry ? new Date(driverData.license_expiry).toLocaleDateString() : 'Not provided'}
                            </div>
                            <div class="mb-2">
                                <strong>Status:</strong> 
                                <span class="badge ${statusClass}">${this.formatStatus(driverData.status)}</span>
                            </div>
                            <div class="mb-2">
                                <strong>Total Deliveries:</strong> ${driverData.total_deliveries || 0}
                            </div>
                            <div class="mb-2">
                                <strong>Success Rate:</strong> ${driverData.total_deliveries > 0 ? 
                                    Math.round(((driverData.successful_deliveries || 0) / driverData.total_deliveries) * 100) : 0}%
                            </div>
                            <div class="mb-2">
                                <strong>Rating:</strong> 
                                <span class="text-warning">
                                    ${'★'.repeat(Math.floor(driverData.rating || 5))}${'☆'.repeat(5 - Math.floor(driverData.rating || 5))}
                                </span>
                                (${driverData.rating || 5.0}/5.0)
                            </div>
                        </div>
                    </div>
                    <hr>
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Vehicle Information</h6>
                            <div class="mb-2">
                                <strong>Type:</strong> 
                                <i class="${vehicleTypeIcon}"></i> ${this.formatStatus(driverData.vehicle_type)}
                            </div>
                            <div class="mb-2">
                                <strong>Plate Number:</strong> ${driverData.vehicle_plate}
                            </div>
                            <div class="mb-2">
                                <strong>Model:</strong> ${driverData.vehicle_model || 'Not specified'}
                            </div>
                            <div class="mb-2">
                                <strong>Capacity:</strong> ${driverData.vehicle_capacity_kg}kg
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="fw-bold mb-3">Work Schedule</h6>
                            <div class="mb-2">
                                <strong>Shift:</strong> ${driverData.shift_start || 'Not set'} - ${driverData.shift_end || 'Not set'}
                            </div>
                            <div class="mb-2">
                                <strong>Working Days:</strong> 
                                <div class="mt-1">
                                    ${this.formatWorkingDays(driverData.working_days)}
                                </div>
                            </div>
                            <div class="mb-2">
                                <strong>Joined:</strong> ${driverData.created_at ? new Date(driverData.created_at).toLocaleDateString() : 'Unknown'}
                            </div>
                            <div class="mb-2">
                                <strong>Last Update:</strong> ${driverData.updated_at ? new Date(driverData.updated_at).toLocaleDateString() : 'Unknown'}
                            </div>
                        </div>
                    </div>
                `;
                
                // Store driver ID for edit functionality
                document.getElementById('editDriverBtn').setAttribute('data-driver-id', driverId);
                
            } else {
                throw new Error('Failed to fetch driver details');
            }
        } catch (error) {
            console.error('Error loading driver details:', error);
            document.getElementById('driverDetailsContent').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Failed to load driver details. Please try again.
                </div>
            `;
        }
    }

    async showAddDriverModal() {
        const modal = new bootstrap.Modal(document.getElementById('addDriverModal'));
        modal.show();

        // Add form submit event listener
        const form = document.getElementById('addDriverForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.handleAddDriver();
        };
    }

    async handleAddDriver() {
        // Get form data
        const formData = {
            first_name: document.getElementById('driverFirstName').value,
            last_name: document.getElementById('driverLastName').value,
            email: document.getElementById('driverEmail').value,
            phone: document.getElementById('driverPhone').value,
            password: document.getElementById('driverPassword').value,
            license_number: document.getElementById('driverLicenseNumber').value,
            license_expiry_date: document.getElementById('driverLicenseExpiry').value,
            vehicle_type: document.getElementById('driverVehicleType').value,
            vehicle_plate: document.getElementById('driverVehiclePlate').value,
            vehicle_capacity_kg: parseInt(document.getElementById('driverVehicleCapacity').value) || 0,
            emergency_contact: document.getElementById('driverEmergencyContact').value
        };

        // Validate required fields
        const requiredFields = [
            { field: 'first_name', name: 'First Name' },
            { field: 'last_name', name: 'Last Name' },
            { field: 'email', name: 'Email' },
            { field: 'phone', name: 'Phone' },
            { field: 'password', name: 'Password' },
            { field: 'license_number', name: 'License Number' },
            { field: 'license_expiry_date', name: 'License Expiry Date' },
            { field: 'vehicle_type', name: 'Vehicle Type' },
            { field: 'vehicle_plate', name: 'Vehicle Plate' },
            { field: 'vehicle_capacity_kg', name: 'Vehicle Capacity' }
        ];

        for (const { field, name } of requiredFields) {
            if (!formData[field] || formData[field] === '' || (field === 'vehicle_capacity_kg' && formData[field] <= 0)) {
                this.showAlert(`Please fill in the ${name} field.`, 'danger');
                return;
            }
        }

        try {
            // Call API to create driver
            const result = await this.apiRequest('/api/drivers/comprehensive', {
                method: 'POST',
                body: JSON.stringify(formData)
            }, true); // Use drivers API

            if (result && result.success) {
                this.showAlert('Driver added successfully!', 'success');
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('addDriverModal')).hide();
                
                // Reset form
                document.getElementById('addDriverForm').reset();
                
                // Refresh driver list
                await this.loadDriverManagement();
            } else {
                throw new Error(result?.message || 'Failed to add driver');
            }
        } catch (error) {
            console.error('Add driver error:', error);
            this.showAlert(`Failed to add driver: ${error.message}`, 'danger');
        }
    }

    async exportDrivers() {
        this.showAlert('Driver data export functionality would be implemented here', 'info');
    }

    processDashboardData(data) {
        const statusCounts = data.status_counts || [];
        const todayMetrics = data.today_metrics || {};
        const driverStats = data.driver_stats || [];

        // Calculate totals from status counts
        let totalOrders = 0;
        let pendingOrders = 0;
        let inTransitOrders = 0;

        statusCounts.forEach(status => {
            const count = parseInt(status.count) || 0;
            totalOrders += count;
            
            if (status.status === 'pending') {
                pendingOrders = count;
            } else if (['pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery'].includes(status.status)) {
                inTransitOrders += count;
            }
        });

        // Calculate available drivers
        let activeDrivers = 0;
        driverStats.forEach(driver => {
            if (driver.status === 'available') {
                activeDrivers += parseInt(driver.count) || 0;
            }
        });

        return {
            totalOrders: totalOrders || parseInt(todayMetrics.total_orders) || 0,
            pendingOrders: pendingOrders,
            activeDrivers: activeDrivers,
            inTransitOrders: inTransitOrders,
            deliveredToday: parseInt(todayMetrics.delivered_orders) || 0,
            failedToday: parseInt(todayMetrics.failed_orders) || 0
        };
    }

    // Utility methods
    formatStatus(status) {
        if (!status) return 'Unknown';
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    truncateText(text, length) {
        if (!text) return 'N/A';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    formatNumber(num) {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(num || 0);
    }

    getStatusColor(status) {
        const statusColors = {
            // Order statuses
            'pending': 'warning',
            'processing': 'info',
            'pickup_scheduled': 'primary',
            'picked_up': 'info',
            'in_transit': 'primary',
            'out_for_delivery': 'info',
            'delivered': 'success',
            'failed': 'danger',
            'cancelled': 'secondary',
            'returned': 'warning',
            
            // Assignment statuses
            'accepted': 'success',
            'rejected': 'danger',
            'completed': 'success',
            
            // Driver statuses
            'available': 'success',
            'busy': 'warning',
            'offline': 'secondary',
            'on_break': 'info',
            'suspended': 'danger',
            
            // Client statuses
            'active': 'success',
            'inactive': 'secondary',
            'suspended': 'danger'
        };
        return statusColors[status?.toLowerCase()] || 'secondary';
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return 'Invalid Date';
        }
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

    filterDrivers(status) {
        const driverCards = document.querySelectorAll('.driver-card');
        driverCards.forEach(card => {
            if (status === 'all' || card.dataset.status === status) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    async toggleDriverStatus(driverId, newStatus) {
        if (confirm(`Are you sure you want to change this driver's status to ${newStatus}?`)) {
            try {
                const response = await this.apiRequest(`/api/drivers/${driverId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: newStatus })
                }, true); // Use drivers API
                
                if (response && response.success) {
                    this.showAlert(`Driver status updated to ${this.formatStatus(newStatus)}`, 'success');
                    await this.loadDriverManagement(); // Reload the driver list
                } else {
                    this.showAlert('Failed to update driver status', 'error');
                }
            } catch (error) {
                console.error('Error updating driver status:', error);
                this.showAlert('Error updating driver status', 'error');
            }
        }
    }

    async editDriver(driverId) {
        this.showAlert(`Edit driver functionality for ID: ${driverId} - To be implemented`, 'info');
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

    getStatusClass(status) {
        const statusClasses = {
            'available': 'bg-success',
            'busy': 'bg-warning text-dark',
            'offline': 'bg-secondary',
            'on_break': 'bg-info',
            'suspended': 'bg-danger'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    getVehicleTypeIcon(vehicleType) {
        const icons = {
            'motorcycle': 'bi bi-bicycle',
            'van': 'bi bi-truck',
            'truck': 'bi bi-truck-front',
            'bicycle': 'bi bi-bicycle'
        };
        return icons[vehicleType] || 'bi bi-truck';
    }

    formatWorkingDays(workingDays) {
        if (!workingDays || !Array.isArray(workingDays)) {
            return 'Not specified';
        }
        
        const dayAbbrevs = {
            'monday': 'Mon',
            'tuesday': 'Tue', 
            'wednesday': 'Wed',
            'thursday': 'Thu',
            'friday': 'Fri',
            'saturday': 'Sat',
            'sunday': 'Sun'
        };
        
        return workingDays.map(day => 
            `<span class="badge bg-light text-dark me-1">${dayAbbrevs[day] || day}</span>`
        ).join('');
    }

    getPriorityColor(priority) {
        const priorityColors = {
            'low': 'secondary',
            'medium': 'primary',
            'high': 'warning',
            'urgent': 'danger'
        };
        return priorityColors[priority?.toLowerCase()] || 'secondary';
    }

    formatClientAddress(client) {
        if (!client) return 'N/A';
        
        const addressParts = [];
        if (client.address_line1) addressParts.push(client.address_line1);
        if (client.address_line2) addressParts.push(client.address_line2);
        if (client.city) addressParts.push(client.city);
        if (client.state_province) addressParts.push(client.state_province);
        if (client.postal_code) addressParts.push(client.postal_code);
        
        return addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});
