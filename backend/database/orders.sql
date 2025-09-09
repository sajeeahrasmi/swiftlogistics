-- Swift Logistics Orders Database Schema
-- This file creates all tables and relationships for order management

-- Enable UUID extension for generating tracking numbers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better data integrity (only if they don't exist)
DO $$ 
BEGIN
    -- Order status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'pending',
            'processing',
            'pickup_scheduled',
            'picked_up',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'failed',
            'cancelled',
            'returned'
        );
    END IF;

    -- Order priority enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_priority') THEN
        CREATE TYPE order_priority AS ENUM (
            'low',
            'medium',
            'high',
            'urgent'
        );
    END IF;

    -- Actor type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_type') THEN
        CREATE TYPE actor_type AS ENUM (
            'system',
            'client',
            'driver',
            'dispatcher',
            'admin'
        );
    END IF;
END $$;

-- Create sequence for tracking numbers (if not exists)
CREATE SEQUENCE IF NOT EXISTS orders_tracking_seq START 100000;

-- Orders table - main table for all orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    
    -- Tracking and identification
    tracking_number VARCHAR(50) UNIQUE NOT NULL DEFAULT 'TRK-' || nextval('orders_tracking_seq'),
    external_order_id VARCHAR(100),
    
    -- Order details
    status order_status NOT NULL DEFAULT 'pending',
    priority order_priority NOT NULL DEFAULT 'medium',
    
    -- Address information
    pickup_address TEXT NOT NULL,
    pickup_contact_name VARCHAR(100),
    pickup_contact_phone VARCHAR(20),
    
    delivery_address TEXT NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(100),
    
    -- Timing information
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- Package information
    total_weight_kg DECIMAL(10, 2) DEFAULT 0,
    total_value DECIMAL(12, 2) DEFAULT 0,
    package_count INTEGER DEFAULT 1,
    
    -- Special instructions
    special_instructions TEXT,
    delivery_notes TEXT,
    
    -- External system references
    cms_reference VARCHAR(100),
    wms_reference VARCHAR(100),
    ros_reference VARCHAR(100),
    
    -- Financial information
    shipping_cost DECIMAL(12, 2) DEFAULT 0,
    insurance_cost DECIMAL(12, 2) DEFAULT 0,
    total_cost DECIMAL(12, 2) DEFAULT 0,
    
    -- Audit fields
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_total_weight_positive CHECK (total_weight_kg >= 0),
    CONSTRAINT chk_total_value_positive CHECK (total_value >= 0),
    CONSTRAINT chk_package_count_positive CHECK (package_count > 0)
);

-- Order items table - individual items within an order
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    
    -- Item details
    description VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    weight_kg DECIMAL(10, 2) CHECK (weight_kg > 0),
    
    -- Dimensions
    dimensions_cm JSONB,
    
    value DECIMAL(12, 2) CHECK (value >= 0),
    hs_code VARCHAR(20),
    
    -- Item-specific instructions
    handling_instructions TEXT,
    is_fragile BOOLEAN DEFAULT FALSE,
    is_perishable BOOLEAN DEFAULT FALSE,
    is_hazardous BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_item_weight_positive CHECK (weight_kg > 0)
);

-- Order status history table - tracks all status changes
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    
    -- Status information
    status order_status NOT NULL,
    previous_status order_status,
    notes TEXT,
    
    -- Actor information
    actor_id INTEGER,
    actor_type actor_type DEFAULT 'system',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order proof of delivery table - evidence of successful delivery
CREATE TABLE IF NOT EXISTS order_proof_of_delivery (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    
    -- Delivery evidence
    recipient_signature TEXT,
    delivery_photo_url VARCHAR(500),
    notes TEXT,
    
    -- Recipient information at time of delivery
    actual_recipient_name VARCHAR(100),
    actual_recipient_phone VARCHAR(20),
    delivery_confirmation_code VARCHAR(50),
    
    -- Timestamps
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (order_id)
);

-- Order failure reasons table - tracks failed delivery attempts
CREATE TABLE IF NOT EXISTS order_failure_reasons (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    
    -- Failure details
    reason_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order processing queue table - manages background processing
CREATE TABLE IF NOT EXISTS order_processing_queue (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    
    -- Processing information
    process_type VARCHAR(50) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Timing information
    last_attempt TIMESTAMP WITH TIME ZONE,
    next_attempt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and results
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'retrying')
    ),
    error_message TEXT,
    result_data JSONB,
    
    -- Priority handling
    priority INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (order_id, process_type)
);

-- Order events log table - audit trail for all order-related events
CREATE TABLE IF NOT EXISTS order_events_log (
    id SERIAL PRIMARY KEY,
    
    -- Event identification
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(100) NOT NULL,
    
    -- Related entities
    order_id INTEGER,
    client_id INTEGER,
    user_id INTEGER,
    
    -- Event data
    event_data JSONB NOT NULL,
    source_service VARCHAR(50) NOT NULL,
    correlation_id VARCHAR(100),
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processing_attempts INTEGER DEFAULT 0,
    processing_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Order analytics table - pre-aggregated data for reporting
CREATE TABLE IF NOT EXISTS order_analytics (
    id SERIAL PRIMARY KEY,
    
    -- Time dimensions
    analytics_date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour < 24),
    
    -- Business dimensions
    client_id INTEGER,
    priority order_priority,
    status order_status,
    
    -- Metrics
    order_count INTEGER DEFAULT 0,
    total_value DECIMAL(15, 2) DEFAULT 0,
    total_weight_kg DECIMAL(12, 2) DEFAULT 0,
    total_cost DECIMAL(15, 2) DEFAULT 0,
    avg_delivery_time_seconds INTEGER DEFAULT 0,
    
    -- Failure metrics
    failed_order_count INTEGER DEFAULT 0,
    cancellation_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (analytics_date, hour, client_id, priority, status)
);

-- Create indexes (if they don't exist)
DO $$ 
BEGIN
    -- Orders indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_client_id') THEN
        CREATE INDEX idx_orders_client_id ON orders(client_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_status') THEN
        CREATE INDEX idx_orders_status ON orders(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_priority') THEN
        CREATE INDEX idx_orders_priority ON orders(priority);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_created_at') THEN
        CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_tracking_number') THEN
        CREATE INDEX idx_orders_tracking_number ON orders(tracking_number);
    END IF;

    -- Order items indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_order_id') THEN
        CREATE INDEX idx_order_items_order_id ON order_items(order_id);
    END IF;

    -- Status history indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_status_history_order_id') THEN
        CREATE INDEX idx_status_history_order_id ON order_status_history(order_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_status_history_created_at') THEN
        CREATE INDEX idx_status_history_created_at ON order_status_history(created_at DESC);
    END IF;

    -- Events log indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_log_order_id') THEN
        CREATE INDEX idx_events_log_order_id ON order_events_log(order_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_log_created_at') THEN
        CREATE INDEX idx_events_log_created_at ON order_events_log(created_at DESC);
    END IF;
END $$;

-- Functions for automatic updates (only create if they don't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle order status changes and logging
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, previous_status, actor_type)
        VALUES (NEW.id, NEW.status, OLD.status, 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate tracking number
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_number IS NULL THEN
        NEW.tracking_number := 'TRK-' || nextval('orders_tracking_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update order totals from items
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        UPDATE orders o
        SET 
            total_weight_kg = COALESCE((
                SELECT SUM(weight_kg * quantity) 
                FROM order_items 
                WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
            ), 0),
            total_value = COALESCE((
                SELECT SUM(value * quantity) 
                FROM order_items 
                WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
            ), 0),
            package_count = COALESCE((
                SELECT COUNT(*) 
                FROM order_items 
                WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE o.id = COALESCE(NEW.order_id, OLD.order_id);
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (only if they don't exist)
DO $$ 
BEGIN
    -- Update timestamps trigger for orders
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_orders_updated_at') THEN
        CREATE TRIGGER trigger_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Generate tracking number trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_tracking_number') THEN
        CREATE TRIGGER trigger_generate_tracking_number
            BEFORE INSERT ON orders
            FOR EACH ROW
            EXECUTE FUNCTION generate_tracking_number();
    END IF;

    -- Log status changes trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_log_status_change') THEN
        CREATE TRIGGER trigger_log_status_change
            AFTER UPDATE OF status ON orders
            FOR EACH ROW
            EXECUTE FUNCTION log_order_status_change();
    END IF;

    -- Update order totals trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_order_totals') THEN
        CREATE TRIGGER trigger_update_order_totals
            AFTER INSERT OR UPDATE OR DELETE ON order_items
            FOR EACH ROW
            EXECUTE FUNCTION update_order_totals();
    END IF;
END $$;

-- Now add foreign key constraints if the referenced tables exist
DO $$ 
BEGIN
    -- Check if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Add foreign keys to users table
        ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id),
            ADD CONSTRAINT fk_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
        
        ALTER TABLE order_status_history 
            ADD CONSTRAINT fk_status_history_actor FOREIGN KEY (actor_id) REFERENCES users(id);
            
        ALTER TABLE order_events_log 
            ADD CONSTRAINT fk_events_log_user FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;

    -- Check if clients table exists (you'll need to create this later)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_client FOREIGN KEY (client_id) REFERENCES clients(id);
            
        ALTER TABLE order_events_log 
            ADD CONSTRAINT fk_events_log_client FOREIGN KEY (client_id) REFERENCES clients(id);
            
        ALTER TABLE order_analytics 
            ADD CONSTRAINT fk_analytics_client FOREIGN KEY (client_id) REFERENCES clients(id);
    END IF;

    -- Add self-referencing foreign keys (these should always work)
    ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    
    ALTER TABLE order_status_history 
        ADD CONSTRAINT fk_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    
    ALTER TABLE order_proof_of_delivery 
        ADD CONSTRAINT fk_proof_of_delivery_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    
    ALTER TABLE order_failure_reasons 
        ADD CONSTRAINT fk_failure_reasons_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    
    ALTER TABLE order_processing_queue 
        ADD CONSTRAINT fk_processing_queue_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    
    ALTER TABLE order_events_log 
        ADD CONSTRAINT fk_events_log_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

EXCEPTION WHEN others THEN
    -- If foreign key creation fails, just continue
    RAISE NOTICE 'Could not create all foreign keys: %', SQLERRM;
END $$;

-- Insert sample data for development and testing
INSERT INTO orders (
    client_id, status, priority,
    pickup_address, delivery_address, 
    recipient_name, recipient_phone,
    total_weight_kg, total_value, package_count
) VALUES 
(
    1, 'pending', 'medium',
    '123 Warehouse Street, Colombo 01',
    '456 Customer Avenue, Colombo 03',
    'John Doe', '+94123456789',
    5.5, 30000.00, 2
),
(
    1, 'processing', 'high',
    '123 Warehouse Street, Colombo 01', 
    '789 Business Road, Colombo 02',
    'Jane Smith', '+94123456780',
    8.2, 45000.00, 3
),
(
    2, 'out_for_delivery', 'urgent',
    '456 Distribution Center, Colombo 04',
    '321 Home Address, Colombo 05', 
    'Robert Johnson', '+94123456781',
    3.1, 15000.00, 1
)
ON CONFLICT (tracking_number) DO NOTHING;

INSERT INTO order_items (order_id, description, quantity, weight_kg, value, is_fragile) VALUES
(1, 'Laptop Computer', 1, 2.5, 25000.00, true),
(1, 'Documents Package', 1, 0.5, 1000.00, false),
(2, 'Clothing Bundle', 2, 5.0, 20000.00, false),
(2, 'Shoes', 1, 1.2, 5000.00, false),
(3, 'Mobile Phone', 1, 0.3, 15000.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO order_status_history (order_id, status, notes) VALUES
(1, 'pending', 'Order created by client'),
(2, 'processing', 'Order being processed in warehouse'),
(3, 'out_for_delivery', 'Package with delivery driver')
ON CONFLICT DO NOTHING;

-- Print completion message
DO $$ 
BEGIN
    RAISE NOTICE 'Orders database schema created successfully';
    RAISE NOTICE 'Created tables: orders, order_items, order_status_history, order_proof_of_delivery, order_failure_reasons, order_processing_queue, order_events_log, order_analytics';
END $$;