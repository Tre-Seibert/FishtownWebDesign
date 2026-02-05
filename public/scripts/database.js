const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fishtown_webdesign',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create newsletter_subscriptions table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('active', 'unsubscribed') DEFAULT 'active'
      )
    `;
    
    await connection.execute(createTableQuery);

    // Create questionnaire_submissions table
    const createQuestionnaireTableQuery = `
      CREATE TABLE IF NOT EXISTS questionnaire_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        primary_services TEXT NOT NULL,
        top_revenue_services TEXT NOT NULL,
        about_business TEXT NOT NULL,
        why_choose_you TEXT NOT NULL,
        essential_info TEXT,
        design_inspiration TEXT NOT NULL,
        primary_cta VARCHAR(255) NOT NULL,
        branding TEXT NOT NULL,
        features TEXT NOT NULL,
        requested_pages TEXT NOT NULL,
        experience_feedback TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await connection.execute(createQuestionnaireTableQuery);

    // Create contract_submissions table
    const createContractTableQuery = `
      CREATE TABLE IF NOT EXISTS contract_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscription_id VARCHAR(255) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        business_name VARCHAR(255),
        business_address TEXT,
        plan_type ENUM('monthly', 'yearly') NOT NULL,
        start_date DATE,
        docuseal_submission_id VARCHAR(255),
        signing_url TEXT,
        status ENUM('pending', 'sent', 'signed', 'completed', 'cancelled') DEFAULT 'pending',
        signed_pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        signed_at TIMESTAMP NULL
      )
    `;

    await connection.execute(createContractTableQuery);

    // Create square_payments table for tracking checkout sessions and payments
    const createSquarePaymentsTableQuery = `
      CREATE TABLE IF NOT EXISTS square_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_submission_id INT,
        checkout_id VARCHAR(255),
        order_id VARCHAR(255),
        payment_link_id VARCHAR(255),
        payment_link_url TEXT,
        client_email VARCHAR(255) NOT NULL,
        client_name VARCHAR(255),
        plan_type ENUM('monthly', 'yearly') NOT NULL,
        amount_cents INT NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        square_payment_id VARCHAR(255),
        redirect_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        webhook_received_at TIMESTAMP NULL,
        FOREIGN KEY (contract_submission_id) REFERENCES contract_submissions(id) ON DELETE SET NULL
      )
    `;

    await connection.execute(createSquarePaymentsTableQuery);
    console.log('Database tables initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
}; 