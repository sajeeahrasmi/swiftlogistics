-- Drivers and Driver Management Tables for SwiftLogistics
-- This file creates all tables needed for driver management and order allocation

-- Driver status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
        CREATE TYPE driver_status AS ENUM (
            'available',
            'busy',
            'offline',
            'on_break',
            'suspended'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
        CREATE TYPE vehicle_type AS ENUM (
            'motorcycle',
            'van',
            'truck',
            'bicycle'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allocation_status') THEN
        CREATE TYPE allocation_status AS ENUM (
            'pending',
            'accepted',
            'rejected',
            'completed',
            'cancelled'
        );
    END IF;
END $$;

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Driver information
    driver_license VARCHAR(50) NOT NULL UNIQUE,
    license_expiry DATE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    
    -- Vehicle information
    vehicle_type vehicle_type NOT NULL DEFAULT 'van',
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_model VARCHAR(100),
    vehicle_capacity_kg DECIMAL(10, 2) DEFAULT 100,
    
    -- Status and availability
    status driver_status NOT NULL DEFAULT 'offline',
    is_active BOOLEAN DEFAULT true,
    
    -- Location tracking
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,
    
    -- Working hours
    shift_start TIME,
    shift_end TIME,
    working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_rating_valid CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT chk_capacity_positive CHECK (vehicle_capacity_kg > 0),
    CONSTRAINT chk_successful_deliveries CHECK (successful_deliveries <= total_deliveries)
);

-- Order assignments table (links orders to drivers)
CREATE TABLE IF NOT EXISTS order_assignments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    -- Assignment details
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Status tracking
    status allocation_status NOT NULL DEFAULT 'pending',
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery information
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- Notes and feedback
    assignment_notes TEXT,
    driver_notes TEXT,
    admin_notes TEXT,
    
    -- Performance tracking
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    delivery_feedback TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (order_id), -- One assignment per order
    CONSTRAINT chk_times_logical CHECK (
        (accepted_at IS NULL OR accepted_at >= assigned_at) AND
        (started_at IS NULL OR started_at >= accepted_at) AND
        (completed_at IS NULL OR completed_at >= started_at)
    )
);

-- Driver availability schedules
CREATE TABLE IF NOT EXISTS driver_schedules (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    -- Schedule information
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    
    -- Break times
    break_start TIME,
    break_end TIME,
    
    -- Notes
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (driver_id, schedule_date),
    CONSTRAINT chk_schedule_times CHECK (end_time > start_time),
    CONSTRAINT chk_break_times CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
    )
);

-- Driver location history for tracking
CREATE TABLE IF NOT EXISTS driver_location_history (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    
    -- Location data
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters INTEGER,
    
    -- Additional data
    speed_kmh DECIMAL(5, 2),
    heading_degrees INTEGER CHECK (heading_degrees >= 0 AND heading_degrees < 360),
    altitude_meters DECIMAL(8, 2),
    
    -- Timestamp
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_location_history_driver_time (driver_id, recorded_at),
    INDEX idx_location_history_order (order_id)
);

-- Driver performance metrics aggregated by day
CREATE TABLE IF NOT EXISTS driver_daily_metrics (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- Delivery metrics
    orders_assigned INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    orders_failed INTEGER DEFAULT 0,
    orders_cancelled INTEGER DEFAULT 0,
    
    -- Time metrics
    hours_worked DECIMAL(5, 2) DEFAULT 0,
    total_distance_km DECIMAL(10, 2) DEFAULT 0,
    avg_delivery_time_minutes INTEGER DEFAULT 0,
    
    -- Performance metrics
    on_time_deliveries INTEGER DEFAULT 0,
    customer_rating_avg DECIMAL(3, 2),
    customer_rating_count INTEGER DEFAULT 0,
    
    -- Financial metrics
    earnings DECIMAL(10, 2) DEFAULT 0,
    fuel_cost DECIMAL(10, 2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (driver_id, metric_date),
    CONSTRAINT chk_completed_orders CHECK (orders_completed <= orders_assigned),
    CONSTRAINT chk_on_time_deliveries CHECK (on_time_deliveries <= orders_completed)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_type ON drivers(vehicle_type);

CREATE INDEX IF NOT EXISTS idx_order_assignments_order_id ON order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_driver_id ON order_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_status ON order_assignments(status);
CREATE INDEX IF NOT EXISTS idx_order_assignments_assigned_at ON order_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_date ON driver_schedules(driver_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_date ON driver_schedules(schedule_date);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_assignments_updated_at BEFORE UPDATE ON order_assignments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_schedules_updated_at BEFORE UPDATE ON driver_schedules 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_daily_metrics_updated_at BEFORE UPDATE ON driver_daily_metrics 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample drivers for testing
INSERT INTO drivers (
    user_id, driver_license, license_expiry, phone, vehicle_type, 
    vehicle_plate, vehicle_model, vehicle_capacity_kg, status
) VALUES 
(1, 'DL001', '2025-12-31', '+1234567890', 'van', 'ABC-123', 'Ford Transit', 500, 'available'),
(2, 'DL002', '2026-06-30', '+1234567891', 'motorcycle', 'XYZ-456', 'Honda CB125', 20, 'available'),
(3, 'DL003', '2025-11-15', '+1234567892', 'truck', 'TRK-789', 'Mercedes Sprinter', 1000, 'offline')
ON CONFLICT (driver_license) DO NOTHING;
