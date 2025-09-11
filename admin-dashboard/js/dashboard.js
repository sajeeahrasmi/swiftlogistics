// SwiftLogistics Admin Dashboard JavaScript

// Global constants
const API_BASE_URL = 'http://localhost:3002/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzQ3OTk0MywiZXhwIjoxNzU3NTY2MzQzfQ.CQKSeC3GkvetPnr8SxERd574wZRt5MleWoqVbaMjT_U';

// Global API function
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showError(`API Error: ${error.message}`);
        return null;
    }
}

class AdminDashboard {
    constructor() {
        this.API_BASE = 'http://localhost:3002';
        this.AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiYWRtaW5Ac3dpZnRsb2dpc3RpY3MuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU3NDc4MjIyLCJleHAiOjE3NTc1NjQ2MjJ9.ytf24rSCpch-5pklNXYoYjl6BwRPoSZmI--uXyW0UIA';
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
}

// Navigation Functions
function showDashboard() {
    hideAllContent();
    document.getElementById('dashboard-content').style.display = 'block';
    loadDashboardData();
    updateActiveNav('Dashboard');
}

function showOrderQueue() {
    hideAllContent();
    document.getElementById('order-queue-content').style.display = 'block';
    loadOrderQueue();
    updateActiveNav('Order Queue');
}

function showDrivers() {
    hideAllContent();
    document.getElementById('drivers-content').style.display = 'block';
    loadDrivers();
    updateActiveNav('Drivers');
}

function showAssignments() {
    hideAllContent();
    document.getElementById('assignments-content').style.display = 'block';
    loadAssignments();
    updateActiveNav('Assignments');
}

function showAnalytics() {
    hideAllContent();
    document.getElementById('analytics-content').style.display = 'block';
    loadAnalytics();
    updateActiveNav('Analytics');
}

function hideAllContent() {
    const contents = ['dashboard-content', 'order-queue-content', 'drivers-content', 'assignments-content', 'analytics-content'];
    contents.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
}

function updateActiveNav(activeItem) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link').classList.add('active');
}

// Dashboard Data Loading
async function loadDashboardData() {
    try {
        const overview = await apiCall('/admin/dashboard/overview');
        if (overview && overview.success) {
            updateDashboardStats(overview.data);
            updateOrdersNeedingAttention(overview.data.orders_needing_attention);
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function updateDashboardStats(data) {
    // Update stat cards
    document.getElementById('total-orders').textContent = data.today_metrics?.total_orders || '0';
    document.getElementById('delivered-orders').textContent = data.today_metrics?.delivered_orders || '0';
    document.getElementById('pending-orders').textContent = data.today_metrics?.urgent_orders || '0';
    
    // Calculate available drivers
    const availableDrivers = data.driver_stats?.find(stat => stat.status === 'available')?.count || '0';
    document.getElementById('available-drivers').textContent = availableDrivers;
}

function updateOrdersNeedingAttention(orders) {
    const tbody = document.getElementById('attention-orders');
    const countBadge = document.getElementById('attention-count');
    
    countBadge.textContent = orders?.length || 0;
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No orders need immediate attention</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr class="order-row" onclick="viewOrderDetails('${order.id}')">
            <td>
                <code>${order.tracking_number}</code>
            </td>
            <td>
                <span class="badge priority-${order.priority}">${order.priority.toUpperCase()}</span>
            </td>
            <td>
                <span class="badge status-${order.status}">${order.status.replace('_', ' ').toUpperCase()}</span>
            </td>
            <td>${Math.round(order.age_hours)}h ago</td>
            <td>${order.client_company || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); assignOrder('${order.id}')">
                    <i class="fas fa-user-plus"></i> Assign
                </button>
            </td>
        </tr>
    `).join('');
}

// Order Queue Management
async function loadOrderQueue(page = 1) {
    try {
        const filters = getOrderFilters();
        const params = new URLSearchParams({
            page: page,
            limit: 20,
            ...filters
        });

        const response = await apiCall(`/admin/orders/queue?${params}`);
        if (response && response.success) {
            updateOrdersTable(response.data.orders);
            updatePagination(response.data.pagination);
        }
    } catch (error) {
        console.error('Failed to load order queue:', error);
    }
}

function getOrderFilters() {
    return {
        status: document.getElementById('status-filter')?.value || '',
        priority: document.getElementById('priority-filter')?.value || '',
        unassigned_only: document.getElementById('unassigned-filter')?.checked || false
    };
}

function updateOrdersTable(orders) {
    const tbody = document.getElementById('orders-table');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr class="order-row">
            <td>
                <input type="checkbox" class="order-checkbox" value="${order.id}" onchange="updateSelectedOrders()">
            </td>
            <td>
                <code>${order.tracking_number}</code>
                <br><small class="text-muted">${new Date(order.created_at).toLocaleDateString()}</small>
            </td>
            <td>
                <span class="badge priority-${order.priority}">${order.priority.toUpperCase()}</span>
            </td>
            <td>
                <span class="badge status-${order.status}">${order.status.replace('_', ' ').toUpperCase()}</span>
            </td>
            <td>${order.client_company || 'N/A'}</td>
            <td>
                ${Math.round(order.age_hours)}h ago
                ${order.age_hours > 2 ? '<i class="fas fa-exclamation-triangle text-warning ms-1"></i>' : ''}
            </td>
            <td>
                ${order.driver_id ? 
                    `<div class="d-flex align-items-center">
                        <i class="fas fa-user-check text-success me-1"></i>
                        <small>${order.driver_first_name} ${order.driver_last_name}<br>
                        <span class="text-muted">${order.vehicle_type} - ${order.vehicle_plate}</span></small>
                    </div>` :
                    '<span class="text-muted"><i class="fas fa-user-times"></i> Unassigned</span>'
                }
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    ${!order.driver_id ? 
                        `<button class="btn btn-outline-primary" onclick="assignOrder('${order.id}')">
                            <i class="fas fa-user-plus"></i>
                        </button>` : 
                        `<button class="btn btn-outline-warning" onclick="reassignOrder('${order.id}')">
                            <i class="fas fa-exchange-alt"></i>
                        </button>`
                    }
                    <button class="btn btn-outline-info" onclick="viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    const paginationElement = document.getElementById('pagination');
    const { page, totalPages } = pagination;
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadOrderQueue(${page - 1})">Previous</a>
        </li>
    `;
    
    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        paginationHTML += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadOrderQueue(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadOrderQueue(${page + 1})">Next</a>
        </li>
    `;
    
    paginationElement.innerHTML = paginationHTML;
}

// Order Assignment Functions
async function assignOrder(orderId) {
    try {
        // Load available drivers
        const driversResponse = await apiCall('/drivers/available');
        if (!driversResponse || !driversResponse.success) {
            showError('Failed to load available drivers');
            return;
        }

        // Show assignment modal
        showAssignmentModal(orderId, driversResponse.data.available_drivers);
    } catch (error) {
        console.error('Failed to show assignment modal:', error);
        showError('Failed to load assignment data');
    }
}

function showAssignmentModal(orderId, drivers) {
    const modal = new bootstrap.Modal(document.getElementById('assignModal'));
    
    // Populate driver select
    const driverSelect = document.getElementById('driver-select');
    driverSelect.innerHTML = '<option value="">Select a driver...</option>' +
        drivers.map(driver => `
            <option value="${driver.id}">
                ${driver.first_name} ${driver.last_name} - ${driver.vehicle_type} (${driver.vehicle_plate})
                ${driver.active_orders > 0 ? ` - ${driver.active_orders} active orders` : ''}
            </option>
        `).join('');
    
    // Set default pickup and delivery times
    const now = new Date();
    const pickup = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    const delivery = new Date(now.getTime() + 4 * 60 * 60000); // 4 hours from now
    
    document.getElementById('estimated-pickup').value = pickup.toISOString().slice(0, 16);
    document.getElementById('estimated-delivery').value = delivery.toISOString().slice(0, 16);
    
    // Store order ID for confirmation
    modal._orderId = orderId;
    
    modal.show();
}

async function confirmAssignment() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('assignModal'));
    const orderId = modal._orderId;
    
    const assignmentData = {
        driver_id: parseInt(document.getElementById('driver-select').value),
        estimated_pickup_time: document.getElementById('estimated-pickup').value,
        estimated_delivery_time: document.getElementById('estimated-delivery').value,
        assignment_notes: document.getElementById('assignment-notes-single').value
    };

    if (!assignmentData.driver_id) {
        showError('Please select a driver');
        return;
    }

    try {
        const response = await apiCall(`/orders/${orderId}/assign-driver`, 'POST', assignmentData);
        if (response && response.success) {
            showSuccess('Order assigned successfully');
            modal.hide();
            loadOrderQueue(currentPage); // Reload current page
            loadDashboardData(); // Refresh dashboard
        } else {
            showError(response?.message || 'Failed to assign order');
        }
    } catch (error) {
        console.error('Assignment failed:', error);
        showError('Failed to assign order');
    }
}

// Bulk Assignment Functions
function showBulkAssignModal() {
    const selectedOrderIds = Array.from(selectedOrders);
    if (selectedOrderIds.length === 0) {
        showError('Please select orders to assign');
        return;
    }

    updateBulkAssignModal();
    loadAvailableDriversForBulk();
    
    const modal = new bootstrap.Modal(document.getElementById('bulkAssignModal'));
    modal.show();
}

function updateBulkAssignModal() {
    const selectedOrderIds = Array.from(selectedOrders);
    document.getElementById('selected-order-count').textContent = selectedOrderIds.length;
    
    // Show selected orders (this would need order data from the table)
    const selectedOrdersList = document.getElementById('selected-orders-list');
    selectedOrdersList.innerHTML = selectedOrderIds.map(id => `
        <div class="d-flex justify-content-between align-items-center mb-1">
            <small>Order #${id}</small>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFromBulkSelection('${id}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

async function loadAvailableDriversForBulk() {
    try {
        const driversResponse = await apiCall('/drivers/available');
        if (driversResponse && driversResponse.success) {
            const driversList = document.getElementById('available-drivers-list');
            driversList.innerHTML = driversResponse.data.available_drivers.map(driver => `
                <div class="form-check mb-2">
                    <input class="form-check-input driver-checkbox" type="checkbox" value="${driver.id}" id="driver-${driver.id}">
                    <label class="form-check-label" for="driver-${driver.id}">
                        <strong>${driver.first_name} ${driver.last_name}</strong><br>
                        <small class="text-muted">
                            ${driver.vehicle_type} - ${driver.vehicle_plate}
                            ${driver.active_orders > 0 ? ` | ${driver.active_orders} active orders` : ' | Available'}
                        </small>
                    </label>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load drivers for bulk assignment:', error);
    }
}

async function confirmBulkAssignment() {
    const selectedOrderIds = Array.from(selectedOrders);
    const selectedDriverIds = Array.from(document.querySelectorAll('.driver-checkbox:checked')).map(cb => parseInt(cb.value));
    const assignmentNotes = document.getElementById('assignment-notes').value;
    
    if (selectedDriverIds.length === 0) {
        showError('Please select at least one driver');
        return;
    }

    // Create assignments (simple round-robin for demo)
    const assignments = selectedOrderIds.map((orderId, index) => ({
        order_id: parseInt(orderId),
        driver_id: selectedDriverIds[index % selectedDriverIds.length],
        assignment_notes: assignmentNotes
    }));

    try {
        const response = await apiCall('/admin/orders/bulk-assign', 'POST', { assignments });
        if (response && response.success) {
            showSuccess(`Bulk assignment completed: ${response.data.successful_assignments} successful, ${response.data.failed_assignments} failed`);
            
            // Hide modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('bulkAssignModal'));
            modal.hide();
            
            selectedOrders.clear();
            updateSelectedOrdersUI();
            loadOrderQueue(currentPage);
            loadDashboardData();
        } else {
            showError(response?.message || 'Bulk assignment failed');
        }
    } catch (error) {
        console.error('Bulk assignment failed:', error);
        showError('Bulk assignment failed');
    }
}

// Selection Management
function updateSelectedOrders() {
    selectedOrders.clear();
    document.querySelectorAll('.order-checkbox:checked').forEach(checkbox => {
        selectedOrders.add(checkbox.value);
    });
    updateSelectedOrdersUI();
}

function updateSelectedOrdersUI() {
    const count = selectedOrders.size;
    // Update any UI elements that show selected count
    document.getElementById('selected-order-count').textContent = count;
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateSelectedOrders();
}

// Filter Functions
function filterOrders() {
    currentPage = 1;
    loadOrderQueue(currentPage);
}

function resetFilters() {
    document.getElementById('status-filter').value = '';
    document.getElementById('priority-filter').value = '';
    document.getElementById('unassigned-filter').checked = false;
    filterOrders();
}

// Utility Functions
function refreshData() {
    const currentView = getCurrentView();
    switch (currentView) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'orders':
            loadOrderQueue(currentPage);
            break;
        case 'drivers':
            loadDrivers();
            break;
        case 'assignments':
            loadAssignments();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

function getCurrentView() {
    // Determine which view is currently active
    if (document.getElementById('dashboard-content').style.display !== 'none') return 'dashboard';
    if (document.getElementById('order-queue-content').style.display !== 'none') return 'orders';
    if (document.getElementById('drivers-content').style.display !== 'none') return 'drivers';
    if (document.getElementById('assignments-content').style.display !== 'none') return 'assignments';
    if (document.getElementById('analytics-content').style.display !== 'none') return 'analytics';
    return 'dashboard';
}

function viewOrderDetails(orderId) {
    // This would open a detailed order view
    console.log('View order details for:', orderId);
    // Implement order details modal or navigation
}

function reassignOrder(orderId) {
    // This would open reassignment modal
    console.log('Reassign order:', orderId);
    // Implement reassignment functionality
}

function removeFromBulkSelection(orderId) {
    selectedOrders.delete(orderId);
    updateBulkAssignModal();
    
    // Update checkbox in main table
    const checkbox = document.querySelector(`.order-checkbox[value="${orderId}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
}

// Notification Functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'danger');
}

function showNotification(message, type) {
    // Create a toast notification
    const toastHTML = `
        <div class="toast align-items-center text-bg-${type} border-0" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.body.lastElementChild;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove element after toast is hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Placeholder functions for other views
async function loadDrivers() {
    document.getElementById('drivers-list').innerHTML = 'Loading drivers...';
    try {
        const response = await apiCall('/drivers');
        if (response && response.success) {
            document.getElementById('drivers-list').innerHTML = `
                <div class="row">
                    ${response.data.drivers.map(driver => `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${driver.first_name} ${driver.last_name}</h6>
                                    <p class="card-text">
                                        <span class="badge driver-${driver.status}">${driver.status}</span><br>
                                        <small class="text-muted">${driver.vehicle_type} - ${driver.vehicle_plate}</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load drivers:', error);
        document.getElementById('drivers-list').innerHTML = 'Failed to load drivers.';
    }
}

async function loadAssignments() {
    document.getElementById('assignments-list').innerHTML = 'Assignment management functionality will be implemented here.';
}

async function loadAnalytics() {
    document.getElementById('analytics-charts').innerHTML = 'Analytics and reporting functionality will be implemented here.';
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.reload();
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    showDashboard();
    
    // Set up periodic refresh
    setInterval(refreshData, 30000); // Refresh every 30 seconds
});

// Handle modal cleanup
document.addEventListener('hidden.bs.modal', function (event) {
    // Clear form data when modals are closed
    const forms = event.target.querySelectorAll('form, input, textarea, select');
    forms.forEach(element => {
        if (element.tagName === 'FORM') {
            element.reset();
        } else if (element.type !== 'checkbox' && element.type !== 'radio') {
            element.value = '';
        } else {
            element.checked = false;
        }
    });
});
