const { query } = require('../database/connection');

// Create new client
const createClient = async (req, res) => {
  try {
    const { company_name, contact_email, contact_phone, address_line1, city, user_id } = req.body;
    
    const result = await query(
      `INSERT INTO clients (company_name, contact_email, contact_phone, address_line1, city, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [company_name, contact_email, contact_phone, address_line1, city, user_id]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create client'
    });
  }
};

// Get all clients
const getClients = async (req, res) => {
  try {
    const result = await query('SELECT * FROM clients ORDER BY id');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients'
    });
  }
};

// Get specific client
const getClient = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM clients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client'
    });
  }
};

module.exports = { createClient, getClients, getClient };