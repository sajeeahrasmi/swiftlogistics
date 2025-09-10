-- Sample data for SwiftLogistics admin functionality

-- Insert sample orders with different statuses and priorities
INSERT INTO orders (client_id, tracking_number, status, priority, pickup_address, pickup_contact_name, pickup_contact_phone, delivery_address, recipient_name, recipient_phone, recipient_email, total_weight_kg, total_value, package_count, special_instructions, created_at) VALUES
(1, 'TRK-100003', 'pending', 'urgent', '123 Business St, Colombo 01', 'John Manager', '+94701234567', '456 Home Ave, Kandy', 'Sarah Wilson', '+94701234568', 'sarah@email.com', 2.5, 15000.00, 2, 'Handle with care - electronics', NOW() - INTERVAL '1 hour'),
(1, 'TRK-100004', 'processing', 'high', '789 Office Rd, Galle', 'Mike Admin', '+94701234569', '321 Delivery St, Matara', 'David Brown', '+94701234570', 'david@email.com', 5.2, 25000.00, 3, 'Fragile items', NOW() - INTERVAL '2 hours'),
(2, 'TRK-100005', 'pickup_scheduled', 'medium', '555 Shop Lane, Negombo', 'Lisa Store', '+94701234571', '888 Customer Rd, Anuradhapura', 'Emma Green', '+94701234572', 'emma@email.com', 1.8, 8500.00, 1, 'Standard delivery', NOW() - INTERVAL '3 hours'),
(2, 'TRK-100006', 'in_transit', 'medium', '999 Warehouse Blvd, Ja-Ela', 'Tom Worker', '+94701234573', '777 Resident St, Kurunegala', 'Alex Johnson', '+94701234574', 'alex@email.com', 3.1, 12000.00, 2, 'No special requirements', NOW() - INTERVAL '4 hours'),
(1, 'TRK-100007', 'failed', 'low', '444 Supply Ave, Kalutara', 'Janet Coordinator', '+94701234575', '222 Delivery Point, Ratnapura', 'Chris Davis', '+94701234576', 'chris@email.com', 7.5, 35000.00, 4, 'Multiple packages', NOW() - INTERVAL '6 hours'),
(3, 'TRK-100008', 'pending', 'urgent', '111 Export St, Colombo 03', 'Export Manager', '+94701234577', '333 Import Rd, Hambantota', 'Maria Lopez', '+94701234578', 'maria@email.com', 0.8, 5500.00, 1, 'Express delivery required', NOW() - INTERVAL '30 minutes');

-- Insert sample drivers
UPDATE drivers SET 
    status = 'available',
    current_latitude = 6.9271,
    current_longitude = 79.8612,
    last_location_update = NOW(),
    shift_start = '08:00:00',
    shift_end = '18:00:00'
WHERE id IN (1, 2, 3);

UPDATE drivers SET 
    status = 'busy',
    current_latitude = 7.2906,
    current_longitude = 80.6337,
    last_location_update = NOW() - INTERVAL '15 minutes',
    shift_start = '06:00:00',
    shift_end = '16:00:00'
WHERE id IN (4, 5);

-- Update driver 6 to offline
UPDATE drivers SET 
    status = 'offline',
    shift_start = '10:00:00',
    shift_end = '20:00:00'
WHERE id = 6;

-- Insert sample order items for the new orders
INSERT INTO order_items (order_id, description, quantity, weight_kg, value, is_fragile) VALUES
(4, 'Laptop Computer', 1, 2.0, 12000.00, true),
(4, 'Mouse and Keyboard Set', 1, 0.5, 3000.00, false),
(5, 'Desktop Monitor', 1, 4.5, 18000.00, true),
(5, 'HDMI Cable', 1, 0.3, 2500.00, false),
(5, 'Power Adapter', 1, 0.4, 4500.00, false),
(6, 'Books Package', 1, 1.8, 8500.00, false),
(7, 'Mobile Phone', 1, 0.2, 8000.00, true),
(7, 'Phone Case', 1, 0.1, 2000.00, false),
(8, 'Documents Envelope', 1, 0.3, 2000.00, false),
(8, 'USB Drive', 1, 0.05, 3500.00, false),
(8, 'Tablet', 1, 0.8, 25000.00, true),
(8, 'Charger', 1, 0.4, 5000.00, false),
(9, 'Gift Package', 1, 0.8, 5500.00, false);

-- Insert sample order status history
INSERT INTO order_status_history (order_id, status, previous_status, actor_type, created_at) VALUES
(4, 'pending', NULL, 'system', NOW() - INTERVAL '1 hour'),
(5, 'processing', 'pending', 'admin', NOW() - INTERVAL '2 hours'),
(6, 'pickup_scheduled', 'processing', 'admin', NOW() - INTERVAL '3 hours'),
(7, 'in_transit', 'pickup_scheduled', 'driver', NOW() - INTERVAL '4 hours'),
(8, 'failed', 'in_transit', 'driver', NOW() - INTERVAL '6 hours'),
(9, 'pending', NULL, 'system', NOW() - INTERVAL '30 minutes');

-- Update sequences to ensure consistent tracking numbers
SELECT setval('orders_tracking_seq', 100010);

-- Insert some sample analytics data
INSERT INTO order_analytics (analytics_date, hour, client_id, priority, status, order_count, total_value, total_weight_kg, avg_delivery_time_seconds, created_at) VALUES
(CURRENT_DATE, 8, 1, 'urgent', 'pending', 2, 20500.00, 3.3, 0, NOW()),
(CURRENT_DATE, 9, 1, 'high', 'processing', 1, 25000.00, 5.2, 1800, NOW()),
(CURRENT_DATE, 10, 2, 'medium', 'pickup_scheduled', 1, 8500.00, 1.8, 0, NOW()),
(CURRENT_DATE, 11, 2, 'medium', 'in_transit', 1, 12000.00, 3.1, 3600, NOW()),
(CURRENT_DATE - INTERVAL '1 day', 14, 1, 'low', 'failed', 1, 35000.00, 7.5, 0, NOW() - INTERVAL '1 day');
