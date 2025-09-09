-- Order Service Database Migration
-- This file creates the necessary tables for order management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    tracking_number VARCHAR(50) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending', 'processing', 'pickup_scheduled', 'picked_up',
            'in_transit', 'out_for_delivery', 'delivered', 'failed',
            'cancelled', 'returned'
        )
    ),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high', 'urgent')
    ),
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    special_instructions TEXT,
    
    -- External system references
    cms_reference VARCHAR(100),
    wms_reference VARCHAR(100),
    ros_reference VARCHAR(100),
    
    -- Audit fields
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_orders_client_id (client_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at),
    INDEX idx_orders_tracking_number (tracking_number)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    weight_kg DECIMAL(10, 2) CHECK (weight_kg > 0),
    dimensions_cm JSONB, -- {length: number, width: number, height: number}
    value DECIMAL(12, 2) CHECK (value >= 0),
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_order_items_order_id (order_id)
);

-- Order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    actor_id INTEGER REFERENCES users(id),
    actor_type VARCHAR(20) DEFAULT 'system' CHECK (
        actor_type IN ('system', 'client', 'driver', 'dispatcher', 'admin')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_order_status_order_id (order_id),
    INDEX idx_order_status_created_at (created_at)
);

-- Order processing queue table (for failed processing attempts)
CREATE TABLE IF NOT EXISTS order_processing_queue (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE,
    next_attempt TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_processing_queue_status (status),
    INDEX idx_processing_queue_next_attempt (next_attempt),
    UNIQUE (order_id)
);

-- Order events log table (for auditing)
CREATE TABLE IF NOT EXISTS order_events_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    source_service VARCHAR(50) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_order_events_order_id (order_id),
    INDEX idx_order_events_event_type (event_type),
    INDEX idx_order_events_created_at (created_at)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_queue_updated_at 
    BEFORE UPDATE ON order_processing_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, actor_type)
        VALUES (NEW.id, NEW.status, 'system');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for status changes
CREATE TRIGGER track_order_status_changes 
    AFTER UPDATE OF status ON orders 
    FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Insert sample data for development
INSERT INTO orders (
    client_id, tracking_number, status, priority,
    pickup_address, delivery_address, recipient_name, recipient_phone
) VALUES 
(
    1, 'TRK-001', 'pending', 'medium',
    '123 Warehouse St, Colombo 01', '456 Customer Ave, Colombo 03',
    'John Doe', '+94123456789'
),
(
    1, 'TRK-002', 'processing', 'high',
    '123 Warehouse St, Colombo 01', '789 Business Rd, Colombo 02',
    'Jane Smith', '+94123456780'
)
ON CONFLICT (tracking_number) DO NOTHING;

INSERT INTO order_items (order_id, description, quantity, weight_kg, value) VALUES
(1, 'Electronics Package', 1, 2.5, 25000.00),
(1, 'Documents', 2, 0.5, 1000.00),
(2, 'Clothing Package', 3, 5.0, 15000.00)
ON CONFLICT DO NOTHING;

-- Create views for reporting
CREATE VIEW order_summary_view AS
SELECT 
    o.id,
    o.tracking_number,
    o.status,
    o.priority,
    c.company_name as client_name,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.value) as total_value,
    o.created_at,
    o.estimated_delivery_time
FROM orders o
LEFT JOIN clients c ON o.client_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, c.company_name;

CREATE VIEW order_status_timeline_view AS
SELECT 
    o.id as order_id,
    o.tracking_number,
    o.status as current_status,
    COUNT(osh.id) as status_changes,
    MIN(osh.created_at) as first_status_date,
    MAX(osh.created_at) as last_status_date
FROM orders o
LEFT JOIN order_status_history osh ON o.id = osh.order_id
GROUP BY o.id, o.tracking_number, o.status;

-- Grant permissions (adjust based on your user roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO swiftlogistics_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO swiftlogistics_user;

-- Print completion message
DO $$ 
BEGIN
    RAISE NOTICE 'Order service database migration completed successfully';
END $$;