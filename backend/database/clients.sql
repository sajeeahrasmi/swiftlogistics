-- Clients table for Swift Logistics
-- This table stores all client companies that use the service

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    
    -- Client company information
    company_name VARCHAR(255) NOT NULL,
    company_registration_number VARCHAR(100) UNIQUE,
    tax_id VARCHAR(100),
    company_type VARCHAR(50) DEFAULT 'business', -- business, individual, enterprise
    
    -- Contact information
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_person VARCHAR(100),
    
    -- Address information
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Sri Lanka',
    
    -- Business details
    industry VARCHAR(100),
    website VARCHAR(255),
    business_since DATE,
    employee_count VARCHAR(50), -- small, medium, large, or specific range
    
    -- Contract and billing information
    contract_type VARCHAR(50) DEFAULT 'standard', -- standard, premium, enterprise
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, annually
    credit_limit DECIMAL(15, 2) DEFAULT 100000.00,
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    payment_terms INTEGER DEFAULT 30, -- days
    currency VARCHAR(3) DEFAULT 'LKR',
    
    -- Status and preferences
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    preferred_communication VARCHAR(50) DEFAULT 'email' CHECK (preferred_communication IN ('email', 'phone', 'sms')),
    special_requirements TEXT,
    
    -- Relationship to user account
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_credit_limit_positive CHECK (credit_limit >= 0),
    CONSTRAINT chk_current_balance CHECK (current_balance >= -credit_limit),
    CONSTRAINT chk_payment_terms_positive CHECK (payment_terms > 0)
);

-- Client contacts table (additional contact persons)
CREATE TABLE IF NOT EXISTS client_contacts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Contact details
    full_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    
    -- Contact preferences
    is_primary_contact BOOLEAN DEFAULT FALSE,
    is_billing_contact BOOLEAN DEFAULT FALSE,
    is_technical_contact BOOLEAN DEFAULT FALSE,
    
    -- Availability
    working_hours VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'Asia/Colombo',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client documents table (contracts, agreements, etc.)
CREATE TABLE IF NOT EXISTS client_documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Document details
    document_type VARCHAR(100) NOT NULL, -- contract, agreement, certificate, etc.
    document_name VARCHAR(255) NOT NULL,
    document_path VARCHAR(500) NOT NULL, -- path to stored file
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Document metadata
    version VARCHAR(50) DEFAULT '1.0',
    effective_date DATE NOT NULL,
    expiration_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Signatory information
    signed_by VARCHAR(100),
    signed_date DATE,
    witness VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'replaced')),
    
    -- Audit fields
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client service preferences table
CREATE TABLE IF NOT EXISTS client_service_preferences (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
    
    -- Delivery preferences
    preferred_delivery_time VARCHAR(100), -- morning, afternoon, evening, specific hours
    weekend_delivery BOOLEAN DEFAULT FALSE,
    holiday_delivery BOOLEAN DEFAULT FALSE,
    
    -- Packaging preferences
    packaging_requirements TEXT,
    labeling_requirements TEXT,
    special_handling_instructions TEXT,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    notification_frequency VARCHAR(20) DEFAULT 'per_shipment', -- per_shipment, daily_digest, weekly_digest
    
    -- Reporting preferences
    report_frequency VARCHAR(20) DEFAULT 'monthly',
    report_format VARCHAR(20) DEFAULT 'pdf', -- pdf, excel, csv
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiration ON client_documents(expiration_date);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_client_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_client_updated_at();

CREATE TRIGGER trigger_client_contacts_updated_at 
    BEFORE UPDATE ON client_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_client_updated_at();

CREATE TRIGGER trigger_client_documents_updated_at 
    BEFORE UPDATE ON client_documents 
    FOR EACH ROW EXECUTE FUNCTION update_client_updated_at();

CREATE TRIGGER trigger_client_preferences_updated_at 
    BEFORE UPDATE ON client_service_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_client_updated_at();

-- Insert sample client data (using your existing user with ID 1)
INSERT INTO clients (
    company_name,
    company_registration_number,
    contact_email,
    contact_phone,
    contact_person,
    address_line1,
    city,
    postal_code,
    country,
    industry,
    user_id,
    created_by,
    credit_limit,
    payment_terms
) VALUES 
(
    'Colombo Electronics Ltd.',
    'REG-123456',
    'orders@colomboelectronics.lk',
    '+94112345678',
    'Mr. Rajesh Perera',
    '123 Galle Road',
    'Colombo',
    '00300',
    'Sri Lanka',
    'Electronics Retail',
    1,  -- Your existing user ID
    1,  -- Created by user ID 1
    500000.00,
    30
),
(
    'Kandy Fashion House',
    'REG-789012',
    'info@kandyfashion.lk',
    '+94119876543',
    'Ms. Anusha Silva',
    '456 Kandy Street',
    'Kandy',
    '20000',
    'Sri Lanka',
    'Fashion Retail',
    1,  -- Your existing user ID
    1,  -- Created by user ID 1
    250000.00,
    15
),
(
    'Galle Organic Foods',
    'REG-345678',
    'sales@galleorganic.lk',
    '+94117654321',
    'Mr. Sunil Fernando',
    '789 Matara Road',
    'Galle',
    '80000',
    'Sri Lanka',
    'Food & Beverage',
    1,  -- Your existing user ID
    1,  -- Created by user ID 1
    100000.00,
    45
)
ON CONFLICT (company_registration_number) DO NOTHING;

-- Insert sample client contacts
INSERT INTO client_contacts (
    client_id,
    full_name,
    position,
    email,
    phone,
    is_primary_contact,
    is_billing_contact
) VALUES
(1, 'Mr. Rajesh Perera', 'Operations Manager', 'rajesh@colomboelectronics.lk', '+94112345678', true, true),
(1, 'Ms. Nisha Kumar', 'Logistics Coordinator', 'nisha@colomboelectronics.lk', '+94112345679', false, false),
(2, 'Ms. Anusha Silva', 'Owner', 'anusha@kandyfashion.lk', '+94119876543', true, true),
(3, 'Mr. Sunil Fernando', 'Managing Director', 'sunil@galleorganic.lk', '+94117654321', true, true)
ON CONFLICT DO NOTHING;

-- Insert sample service preferences
INSERT INTO client_service_preferences (
    client_id,
    preferred_delivery_time,
    weekend_delivery,
    email_notifications,
    sms_notifications
) VALUES
(1, '09:00-17:00', false, true, true),
(2, '10:00-18:00', true, true, false),
(3, '08:00-16:00', false, false, true)
ON CONFLICT (client_id) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW client_summary_view AS
SELECT 
    c.id,
    c.company_name,
    c.contact_email,
    c.contact_phone,
    c.city,
    c.country,
    c.status,
    c.credit_limit,
    c.current_balance,
    c.payment_terms,
    u.email as owner_email,
    u.first_name as owner_first_name,
    u.last_name as owner_last_name,
    COUNT(DISTINCT cc.id) as contact_count,
    c.created_at
FROM clients c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN client_contacts cc ON c.id = cc.client_id
GROUP BY c.id, u.email, u.first_name, u.last_name;

CREATE OR REPLACE VIEW client_financial_summary AS
SELECT 
    c.id,
    c.company_name,
    c.credit_limit,
    c.current_balance,
    c.payment_terms,
    (c.credit_limit + c.current_balance) as available_credit,
    CASE 
        WHEN c.current_balance > 0 THEN 'credit_balance'
        WHEN c.current_balance = 0 THEN 'zero_balance'
        ELSE 'debt_balance'
    END as balance_status,
    c.currency
FROM clients c;

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO swiftlogistics_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO swiftlogistics_user;

-- Print completion message
DO $$ 
BEGIN
    RAISE NOTICE 'Clients database schema created successfully';
    RAISE NOTICE 'Created tables: clients, client_contacts, client_documents, client_service_preferences';
    RAISE NOTICE 'Created views: client_summary_view, client_financial_summary';
    RAISE NOTICE 'Inserted sample client data';
END $$;