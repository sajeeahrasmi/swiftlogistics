# SwiftLogistics Admin Dashboard

This admin dashboard provides comprehensive order management and driver allocation functionality for the SwiftLogistics system.

## Features Implemented

### 1. Order Management
- **Dashboard Overview**: Real-time statistics of orders, deliveries, and driver availability
- **Order Queue**: Paginated list of all orders with filtering capabilities
- **Orders Needing Attention**: Automatic highlighting of failed, urgent, or long-pending orders
- **Order Status Tracking**: Visual status indicators with color coding

### 2. Driver Management
- **Driver Registration**: Create new driver profiles with vehicle information
- **Driver Status Tracking**: Real-time status (available, busy, offline, on break)
- **Driver Location Tracking**: GPS coordinate tracking and history
- **Performance Metrics**: Delivery statistics and ratings

### 3. Order-Driver Assignment
- **Single Order Assignment**: Assign individual orders to available drivers
- **Bulk Assignment**: Assign multiple orders to drivers in batch operations
- **Auto-Optimization**: Round-robin assignment for bulk operations
- **Emergency Reassignment**: Reassign orders in case of driver unavailability

### 4. Advanced Features
- **Real-time Updates**: Automatic refresh of data every 30 seconds
- **Performance Analytics**: Driver and order performance tracking
- **System Health Monitoring**: Database and service connectivity status
- **Audit Trail**: Complete history of order status changes and assignments

## API Endpoints

### Admin Endpoints
- `GET /api/admin/dashboard/overview` - Dashboard statistics and alerts
- `GET /api/admin/orders/queue` - Paginated order queue with filters
- `POST /api/admin/orders/bulk-assign` - Bulk assign orders to drivers
- `POST /api/admin/orders/:orderId/emergency-reassign` - Emergency reassignment
- `GET /api/admin/analytics/performance` - Performance analytics

### Driver Endpoints
- `POST /api/drivers` - Create new driver
- `GET /api/drivers` - List all drivers with filtering
- `GET /api/drivers/available` - Get available drivers for assignment
- `GET /api/drivers/:id` - Get driver details
- `PATCH /api/drivers/:id/status` - Update driver status and location

### Order Assignment Endpoints
- `POST /api/orders/:id/assign-driver` - Assign order to driver
- `POST /api/drivers/:driverId/assign-order/:orderId` - Alternative assignment endpoint

## Database Schema

### New Tables Added:
1. **drivers** - Driver profiles and vehicle information
2. **order_assignments** - Links orders to drivers with assignment details
3. **driver_schedules** - Driver availability schedules
4. **driver_location_history** - GPS tracking history
5. **driver_daily_metrics** - Performance analytics

## Setup Instructions

### 1. Database Setup
```sql
-- Run the drivers.sql script to create necessary tables
psql -h localhost -U postgres -d swiftlogistics -f "backend/database/drivers.sql"
```

### 2. Start the Order Service
```bash
cd backend/services/order-service
npm install
npm start
```

### 3. Open Admin Dashboard
```bash
# Serve the admin dashboard (you can use any simple HTTP server)
cd admin-dashboard
python -m http.server 8080
# or
npx http-server -p 8080
```

Then open: http://localhost:8080

## Usage Guide

### Managing Orders
1. **View Dashboard**: See real-time statistics and orders needing attention
2. **Browse Order Queue**: Use filters to find specific orders (status, priority, unassigned)
3. **Assign Orders**: Click "Assign" button next to unassigned orders
4. **Bulk Operations**: Select multiple orders and use "Bulk Assign" button

### Driver Management
1. **Add Drivers**: Create driver profiles with vehicle details
2. **Monitor Status**: Track driver availability and location
3. **View Performance**: Check delivery statistics and ratings

### Assignment Process
1. **Single Assignment**:
   - Click "Assign" next to an order
   - Select available driver
   - Set estimated pickup/delivery times
   - Add notes if needed
   - Confirm assignment

2. **Bulk Assignment**:
   - Select multiple orders using checkboxes
   - Click "Bulk Assign" button
   - Select one or more drivers
   - Orders will be distributed automatically
   - Confirm bulk assignment

### Filters and Search
- **Status Filter**: pending, processing, pickup_scheduled, in_transit, etc.
- **Priority Filter**: urgent, high, medium, low
- **Unassigned Filter**: Show only orders without drivers
- **Real-time Updates**: Data refreshes automatically

## Key Features

### Order Priority System
- **Urgent**: Red indicator, immediate attention needed
- **High**: Orange indicator, prioritized processing
- **Medium**: Yellow indicator, standard processing
- **Low**: Green indicator, flexible timing

### Driver Status System
- **Available**: Ready for new assignments
- **Busy**: Currently handling deliveries
- **Offline**: Not working
- **On Break**: Temporarily unavailable
- **Suspended**: Administratively disabled

### Performance Tracking
- Total deliveries and success rate
- Average delivery times
- Customer ratings
- Daily performance metrics

## Error Handling
- Comprehensive validation on all inputs
- Real-time error notifications
- Graceful fallback for API failures
- Automatic retry mechanisms

## Security Features
- JWT token authentication
- Role-based access control (admin/dispatcher only)
- Rate limiting on all endpoints
- Input validation and sanitization

## Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies
- Bootstrap 5.1.3 for UI components
- Font Awesome 6.0.0 for icons
- Native JavaScript (no additional frameworks)

This implementation provides a complete admin interface for managing orders and driver assignments in the SwiftLogistics system.
