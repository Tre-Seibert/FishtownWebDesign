require('dotenv').config();

/**
 * Environment Variables Required:
 * 
 * Database:
 * - DB_HOST (default: 'localhost')
 * - DB_USER (default: 'root')
 * - DB_PASSWORD (default: '')
 * - DB_NAME (default: 'fishtown_webdesign')
 * - DB_PORT (default: 3306)
 * 
 * DocuSeal API (for contract signing):
 * - DOCUSEAL_API_KEY - DocuSeal API authentication token (required for /api/purchase/create-contract)
 * - DOCUSEAL_API_URL (optional, defaults to 'https://api.docuseal.co')
 * 
 * Square API (for payments):
 * - SQUARE_ACCESS_TOKEN - Square API access token (from Square Developer Dashboard)
 * - SQUARE_ENVIRONMENT - 'sandbox' or 'production' (default: 'sandbox')
 * - SQUARE_LOCATION_ID - Square location ID for the business
 * - SQUARE_WEBHOOK_SIGNATURE_KEY - Signature key for verifying Square webhooks
 * 
 * Webhooks:
 * - WEBHOOK_SECRET_TOKEN - Secret token for webhook authentication
 * - NEWSLETTER_SECRET_TOKEN - Secret token for newsletter sending
 * - NEWSLETTER_TEST_EMAIL - Test email for newsletter testing mode
 */

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');
const { pool, testConnection, initializeDatabase } = require('./public/scripts/database');
const zohoMailService = require('./public/scripts/zohoMail');
const fs = require('fs').promises;
const { SquareClient, SquareEnvironment } = require('square');

// Initialize Square client
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox
});

// Define a port number
const port = 7000;

// Custom middleware to skip JSON parsing for Square webhook (needs raw body for signature verification)
app.use((req, res, next) => {
  if (req.path === '/webhook/square') {
    return next();
  }
  express.json()(req, res, next);
});

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the /public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Set the views directory (where your .ejs files are located)
app.set('views', path.join(__dirname, 'views'));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Trust proxy (needed when behind Cloudflare, AWS ALB, etc.)
app.set('trust proxy', true);

// Allowed blog post slugs
const ALLOWED_BLOG_POSTS = [
  'HVAC-Website-Design-Case-Study-Axel-Mechanical-Services',
  'definitive-guide-to-web-design-for-philadelphia-businesses',
  'from-cat-inspiration-to-coffee-empire-building-green-shades-coffee-co-purpose-driven-ecommerce-platform',
  'web-design-mistakes-philadelphia-startups'
];

// Allowed category slugs
const ALLOWED_CATEGORIES = ['web-design', 'case-studies'];

// Force HTTPS redirect (before www redirect)
// Skip if behind a proxy (Cloudflare, AWS ALB, etc.) - they handle HTTPS redirects
app.use((req, res, next) => {
  const host = req.get('host');
  const forwardedProto = req.get('X-Forwarded-Proto');
  const isLocalhost = host === 'localhost:7000';
  
  // Skip redirect for localhost
  if (isLocalhost) {
    return next();
  }
  
  // If behind a proxy (X-Forwarded-Proto exists), let the proxy handle HTTPS redirects
  // This prevents infinite redirect loops when proxy forwards HTTP to Node.js
  if (forwardedProto) {
    return next();
  }
  
  // Only redirect if direct connection (no proxy) and protocol is HTTP
  if (req.protocol === 'http') {
    return res.redirect(301, `https://${host}${req.url}`);
  }
  
  next();
});

// Force www redirect
app.use((req, res, next) => {
  if (req.hostname === 'fishtownwebdesign.com') {
    return res.redirect(301, `https://www.fishtownwebdesign.com${req.url}`);
  }
  next();
});

const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');

// In-memory cache for the sitemap
let cachedSitemap = null;

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Function to generate the sitemap
async function generateSitemap() {
  try {
    logger.info('Starting sitemap generation');
    const posts = await getPosts();
    const sitemap = new SitemapStream({ hostname: 'https://www.fishtownwebdesign.com' });

    // Add static pages
    const staticPages = [
      { url: '/', changefreq: 'monthly', priority: 1.0 },
      { url: '/about', changefreq: 'monthly', priority: 0.8 },
      { url: '/pricing', changefreq: 'monthly', priority: 0.8 },
      { url: '/contact', changefreq: 'monthly', priority: 0.8 },
      { url: '/terms-of-service', changefreq: 'yearly', priority: 0.5 },
      { url: '/privacy-policy', changefreq: 'yearly', priority: 0.5 },
      { url: '/faq', changefreq: 'monthly', priority: 0.7 },
      { url: '/web-design', changefreq: 'monthly', priority: 0.8 },
      { url: '/blog', changefreq: 'weekly', priority: 0.9 },
      { url: '/seo', changefreq: 'monthly', priority: 0.8 },
      { url: '/saas-development', changefreq: 'monthly', priority: 0.8 },
      { url: '/charity', changefreq: 'monthly', priority: 0.8 },
      // Industry-specific landing pages
      { url: '/contractor-web-design', changefreq: 'monthly', priority: 0.8 },
      { url: '/venue-web-design', changefreq: 'monthly', priority: 0.8 },
      { url: '/ecommerce-web-design', changefreq: 'monthly', priority: 0.8 },
      { url: '/startup-product-development', changefreq: 'monthly', priority: 0.8 },
      // Location-specific landing pages
      { url: '/web-design-lancaster-pa', changefreq: 'monthly', priority: 0.8 },
      { url: '/web-design-fishtown', changefreq: 'monthly', priority: 0.8 },
      { url: '/web-design-center-city', changefreq: 'monthly', priority: 0.8 },
      { url: '/web-design-old-city', changefreq: 'monthly', priority: 0.8 },
      { url: '/web-design-northern-liberties', changefreq: 'monthly', priority: 0.8 },
      { url: '/web-design-university-city', changefreq: 'monthly', priority: 0.8 }
    ];

    staticPages.forEach(page => sitemap.write(page));
    logger.info('Added static pages to sitemap', { pageCount: staticPages.length });

    // Add blog posts (only allowed ones)
    const allowedPosts = posts.filter(post => ALLOWED_BLOG_POSTS.includes(post.slug));
    allowedPosts.forEach(post => {
      sitemap.write({
        url: `/blog/${post.slug}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: post.publishedDate || new Date().toISOString(),
      });
    });
    logger.info('Added blog posts to sitemap', { postCount: allowedPosts.length });

    // Add category pages
    ALLOWED_CATEGORIES.forEach(categorySlug => {
      sitemap.write({
        url: `/blog/category/${categorySlug}`,
        changefreq: 'weekly',
        priority: 0.8,
      });
    });
    logger.info('Added category pages to sitemap', { categoryCount: ALLOWED_CATEGORIES.length });

    sitemap.end();
    cachedSitemap = await streamToPromise(sitemap).then(data => data.toString());
    logger.info('Sitemap generation completed successfully');
    return cachedSitemap;
  } catch (error) {
    logger.error('Error generating sitemap', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

app.post('/webhook/update-sitemap', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const expectedToken = `Bearer ${process.env.WEBHOOK_SECRET_TOKEN}`; // Load from .env
  console.log(authHeader)
  if (!authHeader || authHeader !== expectedToken) {
    console.log('Unauthorized webhook request');
    return res.status(401).send('Unauthorized');
  }
  try {
    console.log('Received webhook to update sitemap:', req.body);
    await generateSitemap();  
    res.status(200).send('Sitemap updated successfully');
  } catch (error) {
    console.error('Error updating sitemap via webhook:', error);
    res.status(500).send('Error updating sitemap');
  }
});

// DocuSeal webhook handler for contract signing events
app.post('/webhook/docuseal', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Log full webhook for debugging
    logger.info('DocuSeal webhook received', {
      event: webhookData.event_type || webhookData.event || webhookData.type,
      submissionId: webhookData.data?.id || webhookData.submission_id || webhookData.submission?.id || webhookData.id,
      fullWebhook: JSON.stringify(webhookData, null, 2)
    });

    // Verify webhook signature if DocuSeal provides it
    // TODO: Add signature verification when DocuSeal webhook signature is available
    // const signature = req.headers['x-docuseal-signature'];
    // if (signature) {
    //   // Verify signature logic here
    // }

    // Handle different webhook event types
    // DocuSeal sends: event_type (e.g., 'submission.completed') and data object
    const eventType = webhookData.event_type || webhookData.event || webhookData.type || 'unknown';
    const submissionData = webhookData.data || webhookData;
    const submissionId = submissionData?.id || 
                        webhookData.submission_id || 
                        webhookData.submission?.id || 
                        webhookData.id;

    if (!submissionId) {
      logger.warn('DocuSeal webhook missing submission ID', { webhookData });
      return res.status(400).json({ success: false, message: 'Missing submission ID' });
    }

    const connection = await pool.getConnection();
    
    try {
      // Find contract submission by DocuSeal submission ID
      const [submissions] = await connection.execute(
        'SELECT id, subscription_id, status FROM contract_submissions WHERE docuseal_submission_id = ?',
        [String(submissionId)]
      );

      if (submissions.length === 0) {
        logger.warn('Contract submission not found for DocuSeal submission', { submissionId });
        connection.release();
        return res.status(404).json({ success: false, message: 'Contract submission not found' });
      }

      const contractSubmission = submissions[0];

      // Handle signed/completed event
      // DocuSeal sends 'submission.completed' when all parties have signed
      if (eventType === 'submission.completed' || 
          eventType === 'submission.signed' || 
          submissionData?.status === 'completed' ||
          webhookData.status === 'completed') {
        
        // Update contract status to signed
        await connection.execute(
          `UPDATE contract_submissions 
           SET status = 'signed', signed_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [contractSubmission.id]
        );

        logger.info('Contract marked as signed', {
          contractId: contractSubmission.id,
          submissionId: submissionId,
          eventType: eventType
        });

        // TODO: Download signed PDF from DocuSeal API
        // const docusealApiKey = process.env.DOCUSEAL_API_KEY;
        // const docusealApiUrl = process.env.DOCUSEAL_API_URL || 'https://api.docuseal.co';
        // const pdfResponse = await axios.get(
        //   `${docusealApiUrl}/submissions/${submissionId}/documents`,
        //   { headers: { 'X-Auth-Token': docusealApiKey } }
        // );
        // Store PDF URL or download and store
        // Update signed_pdf_url in database

        // TODO: Trigger next step in purchase flow (payment processing)
        // This would integrate with your payment system
        // Example:
        // await generatePaymentLink(contractSubmission);

        connection.release();
        return res.status(200).json({ 
          success: true, 
          message: 'Contract signed successfully',
          contractId: contractSubmission.id
        });
      }

      // Handle other event types (sent, viewed, etc.)
      if (eventType === 'submission.sent' || 
          eventType === 'submission.viewed' ||
          submissionData?.status === 'sent' ||
          webhookData.status === 'sent') {
        
        const newStatus = eventType === 'submission.viewed' ? 'viewed' : 'sent';
        await connection.execute(
          `UPDATE contract_submissions SET status = ? WHERE id = ?`,
          [newStatus, contractSubmission.id]
        );
        
        logger.info('Contract status updated', {
          contractId: contractSubmission.id,
          newStatus: newStatus,
          eventType: eventType
        });
        
        connection.release();
        return res.status(200).json({ 
          success: true, 
          message: `Contract ${newStatus} status updated` 
        });
      }

      connection.release();
      return res.status(200).json({ success: true, message: 'Webhook received' });
    } catch (dbError) {
      connection.release();
      throw dbError;
    }
  } catch (error) {
    logger.error('Error processing DocuSeal webhook', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    // Return 200 to prevent DocuSeal from retrying
    return res.status(200).json({ success: false, message: 'Webhook processing error' });
  }
});

/**
 * Calculate prorated amount for monthly plan based on days remaining in month
 * Billing cycle: 1st of each month
 * 
 * @param {number} monthlyAmountCents - Full monthly amount in cents (e.g., 15000 for $150)
 * @returns {Object} - { proratedAmountCents, daysRemaining, daysInMonth, startDate, nextBillingDate }
 */
function calculateProratedAmount(monthlyAmountCents) {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Days remaining including today
  const daysRemaining = daysInMonth - currentDay + 1;
  
  // Calculate prorated amount (round to nearest cent)
  const dailyRate = monthlyAmountCents / daysInMonth;
  const proratedAmountCents = Math.round(dailyRate * daysRemaining);
  
  // Next billing date is 1st of next month
  const nextBillingDate = new Date(currentYear, currentMonth + 1, 1);
  
  return {
    proratedAmountCents,
    daysRemaining,
    daysInMonth,
    dailyRateCents: Math.round(dailyRate),
    startDate: now.toISOString().split('T')[0],
    nextBillingDate: nextBillingDate.toISOString().split('T')[0],
    isFullMonth: currentDay === 1 // No proration needed if signing on 1st
  };
}

/**
 * Square Checkout API - Create payment link with redirect to questionnaire
 * Supports prorated first month for monthly plans
 * 
 * POST /api/square/create-checkout
 * Body: {
 *   client_email: "client@example.com",
 *   client_name: "John Doe",
 *   plan_type: "monthly" | "yearly",
 *   contract_submission_id: 123 (optional - links payment to contract),
 *   subscription_plan_variation_id: "..." (optional - for subscription checkout)
 * }
 * 
 * Returns: { success: true, checkoutUrl: "https://square.link/...", paymentLinkId: "...", proration: {...} }
 */
app.post('/api/square/create-checkout', async (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  
  try {
    const { client_email, client_name, plan_type, contract_submission_id, subscription_plan_variation_id } = req.body || {};

    // Validate required fields
    if (!client_email || !plan_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: client_email and plan_type are required.'
      });
    }

    // Validate plan_type
    const normalizedPlanType = (plan_type || '').toLowerCase().trim();
    if (!['monthly', 'yearly'].includes(normalizedPlanType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan_type. Must be "monthly" or "yearly".'
      });
    }

    // Check if Square is configured
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      logger.error('Square API not configured - SQUARE_ACCESS_TOKEN missing');
      return res.status(500).json({
        success: false,
        message: 'Payment service is not properly configured. Please contact support.'
      });
    }

    // Build redirect URL to questionnaire with email pre-filled
    const questionnaireRedirectUrl = `https://www.fishtownwebdesign.com/questionnaire?email=${encodeURIComponent(client_email)}&payment=success`;

    // Generate unique idempotency key
    const idempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let amountCents;
    let planDescription;
    let prorationInfo = null;

    if (normalizedPlanType === 'yearly') {
      // Yearly plan - no proration, full amount
      amountCents = 149900; // $1,499.00
      planDescription = 'Website Development Service - Annual Plan';
    } else {
      // Monthly plan - calculate prorated first payment
      const proration = calculateProratedAmount(15000); // $150.00 base
      prorationInfo = proration;
      
      if (proration.isFullMonth) {
        // Signing on 1st of month - full price
        amountCents = 15000;
        planDescription = 'Website Development Service - Monthly Plan';
      } else {
        // Prorated first month
        amountCents = proration.proratedAmountCents;
        planDescription = `Website Development Service - First Month (Prorated: ${proration.daysRemaining} days)`;
      }
      
      logger.info('Monthly plan proration calculated', {
        client_email,
        fullMonthCents: 15000,
        proratedCents: amountCents,
        daysRemaining: proration.daysRemaining,
        daysInMonth: proration.daysInMonth,
        nextBillingDate: proration.nextBillingDate
      });
    }

    logger.info('Creating Square checkout', {
      client_email,
      plan_type: normalizedPlanType,
      amountCents,
      isProrated: prorationInfo && !prorationInfo.isFullMonth,
      contract_submission_id
    });

    // Check if we should create a subscription checkout or one-time payment
    // Subscription checkout requires a subscription_plan_variation_id from Square Catalog
    let checkoutResponse;
    
    if (subscription_plan_variation_id) {
      // Create subscription checkout (Square handles recurring billing)
      checkoutResponse = await squareClient.checkout.paymentLinks.create({
        idempotencyKey,
        checkoutOptions: {
          redirectUrl: questionnaireRedirectUrl,
          askForShippingAddress: false,
          subscriptionPlanId: subscription_plan_variation_id
        },
        prePopulatedData: {
          buyerEmail: client_email
        }
      });
    } else {
      // Create one-time payment checkout (for prorated first payment)
      // Note: For full subscription support, you'll need to create subscription plans in Square Dashboard
      // and pass the subscription_plan_variation_id
      checkoutResponse = await squareClient.checkout.paymentLinks.create({
        idempotencyKey,
        order: {
          locationId: process.env.SQUARE_LOCATION_ID,
          lineItems: [
            {
              name: planDescription,
              quantity: '1',
              basePriceMoney: {
                amount: BigInt(amountCents),
                currency: 'USD'
              },
              note: normalizedPlanType === 'monthly' && prorationInfo 
                ? `Prorated for ${prorationInfo.daysRemaining} days. Next billing: ${prorationInfo.nextBillingDate} at $150.00/month`
                : undefined
            }
          ]
        },
        checkoutOptions: {
          redirectUrl: questionnaireRedirectUrl,
          askForShippingAddress: false
        },
        prePopulatedData: {
          buyerEmail: client_email
        }
      });
    }

    const paymentLink = checkoutResponse.paymentLink;
    
    if (!paymentLink || !paymentLink.url) {
      logger.error('Invalid Square checkout response', { response: checkoutResponse });
      return res.status(500).json({
        success: false,
        message: 'Failed to create checkout. Please try again.'
      });
    }

    logger.info('Square checkout created successfully', {
      paymentLinkId: paymentLink?.id,
      orderId: paymentLink?.orderId,
      client_email
    });

    // Store payment record in database
    try {
      const connection = await pool.getConnection();
      await connection.execute(
        `INSERT INTO square_payments 
          (contract_submission_id, payment_link_id, payment_link_url, order_id, client_email, client_name, plan_type, amount_cents, redirect_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          contract_submission_id || null,
          paymentLink.id,
          paymentLink.url,
          paymentLink.orderId || null,
          client_email,
          client_name || null,
          normalizedPlanType,
          amountCents,
          questionnaireRedirectUrl
        ]
      );
      connection.release();
    } catch (dbError) {
      // Log but don't fail - payment link was created successfully
      logger.warn('Failed to store Square payment record', {
        error: dbError.message,
        paymentLinkId: paymentLink.id
      });
    }

    return res.json({
      success: true,
      checkoutUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.orderId,
      proration: prorationInfo ? {
        isProrated: !prorationInfo.isFullMonth,
        originalAmountCents: 15000,
        proratedAmountCents: amountCents,
        daysRemaining: prorationInfo.daysRemaining,
        daysInMonth: prorationInfo.daysInMonth,
        nextBillingDate: prorationInfo.nextBillingDate
      } : null
    });

  } catch (error) {
    logger.error('Error creating Square checkout', {
      error: error.message,
      stack: error.stack,
      squareErrors: error.errors
    });

    // Handle Square API errors
    if (error.errors) {
      const squareError = error.errors[0];
      return res.status(400).json({
        success: false,
        message: squareError.detail || 'Failed to create checkout.',
        code: squareError.code
      });
    }

    return res.status(500).json({
      success: false,
      message: 'There was an error creating your checkout. Please try again later.'
    });
  }
});

/**
 * Square Webhook Handler - Receives payment events from Square
 * 
 * POST /webhook/square
 * 
 * Handles events:
 * - payment.completed - Payment was successful
 * - payment.updated - Payment status changed
 * - order.fulfillment.updated - Order fulfillment status changed
 * 
 * On successful payment, sends email with questionnaire link
 */
app.post('/webhook/square', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-square-hmacsha256-signature'];
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    
    // Parse the body
    let webhookData;
    if (Buffer.isBuffer(req.body)) {
      webhookData = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'string') {
      webhookData = JSON.parse(req.body);
    } else {
      webhookData = req.body;
    }

    logger.info('Square webhook received', {
      eventType: webhookData.type,
      eventId: webhookData.event_id,
      hasSignature: !!signature
    });

    // Optional: Verify webhook signature (recommended for production)
    // Square provides HMAC-SHA256 signature verification
    // For now, we'll log if signature is missing but continue processing
    if (webhookSignatureKey && !signature) {
      logger.warn('Square webhook missing signature - consider verifying in production');
    }

    const eventType = webhookData.type;
    const eventData = webhookData.data?.object;

    // Handle payment.completed event
    if (eventType === 'payment.completed' || eventType === 'payment.updated') {
      const payment = eventData?.payment;
      
      if (!payment) {
        logger.warn('Square webhook missing payment data', { webhookData });
        return res.status(200).json({ success: true, message: 'Webhook received' });
      }

      const paymentStatus = payment.status;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amountMoney = payment.amount_money;

      logger.info('Square payment event', {
        paymentId,
        orderId,
        status: paymentStatus,
        amount: amountMoney?.amount,
        currency: amountMoney?.currency
      });

      // Only process completed payments
      if (paymentStatus === 'COMPLETED') {
        const connection = await pool.getConnection();
        
        try {
          // Find the payment record by order_id
          const [payments] = await connection.execute(
            'SELECT id, client_email, client_name, plan_type, contract_submission_id, status FROM square_payments WHERE order_id = ?',
            [orderId]
          );

          if (payments.length > 0) {
            const paymentRecord = payments[0];

            // Update payment status
            await connection.execute(
              `UPDATE square_payments 
               SET status = 'completed', 
                   square_payment_id = ?, 
                   completed_at = CURRENT_TIMESTAMP,
                   webhook_received_at = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [paymentId, paymentRecord.id]
            );

            // Update contract submission status if linked
            if (paymentRecord.contract_submission_id) {
              await connection.execute(
                `UPDATE contract_submissions SET status = 'completed' WHERE id = ?`,
                [paymentRecord.contract_submission_id]
              );
            }

            logger.info('Square payment marked as completed', {
              paymentRecordId: paymentRecord.id,
              paymentId,
              client_email: paymentRecord.client_email
            });

            // Send confirmation email with questionnaire link
            if (paymentRecord.client_email) {
              try {
                const questionnaireUrl = `https://www.fishtownwebdesign.com/questionnaire?email=${encodeURIComponent(paymentRecord.client_email)}`;
                const planName = paymentRecord.plan_type === 'yearly' ? 'Annual' : 'Monthly';
                
                const emailHtml = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1a1a2e;">Payment Received - Thank You!</h1>
                    <p>Hi ${paymentRecord.client_name || 'there'},</p>
                    <p>Thank you for your payment! Your <strong>${planName} Plan</strong> subscription is now active.</p>
                    <p>To get started, please complete our client questionnaire. This helps us understand your business and build the perfect website for you:</p>
                    <p style="margin: 30px 0;">
                      <a href="${questionnaireUrl}" 
                         style="background-color: #ff6b35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Complete Your Questionnaire
                      </a>
                    </p>
                    <p>If you have any questions, reply to this email or contact us at <a href="mailto:sales@fishtownwebdesign.com">sales@fishtownwebdesign.com</a>.</p>
                    <p>Best regards,<br>The Fishtown Web Design Team</p>
                  </div>
                `;

                await zohoMailService.sendEmail(
                  paymentRecord.client_email,
                  'Payment Received - Complete Your Questionnaire',
                  emailHtml
                );

                logger.info('Payment confirmation email sent', {
                  client_email: paymentRecord.client_email
                });
              } catch (emailError) {
                logger.error('Failed to send payment confirmation email', {
                  error: emailError.message,
                  client_email: paymentRecord.client_email
                });
              }
            }
          } else {
            logger.warn('No payment record found for Square order', { orderId });
          }

          connection.release();
        } catch (dbError) {
          connection.release();
          throw dbError;
        }
      }
    }

    // Handle order.fulfillment.updated event (alternative event type)
    if (eventType === 'order.fulfillment.updated') {
      logger.info('Square order fulfillment updated', {
        orderId: eventData?.order?.id,
        state: eventData?.fulfillment?.state
      });
    }

    // Handle subscription.created event
    if (eventType === 'subscription.created') {
      const subscription = eventData?.subscription || eventData;
      logger.info('Square subscription created', {
        subscriptionId: subscription?.id,
        customerId: subscription?.customerId,
        planId: subscription?.planId,
        status: subscription?.status
      });
      
      // Could store subscription ID for future management (pause, cancel, etc.)
    }

    // Handle subscription.updated event
    if (eventType === 'subscription.updated') {
      const subscription = eventData?.subscription || eventData;
      logger.info('Square subscription updated', {
        subscriptionId: subscription?.id,
        customerId: subscription?.customerId,
        status: subscription?.status,
        canceledDate: subscription?.canceledDate
      });
      
      // Handle subscription cancellation or status changes
      if (subscription?.status === 'CANCELED') {
        logger.info('Subscription was canceled', {
          subscriptionId: subscription?.id
        });
        // TODO: Update client status in database, send notification email, etc.
      }
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    logger.error('Error processing Square webhook', {
      error: error.message,
      stack: error.stack
    });
    // Return 200 to prevent Square from retrying
    return res.status(200).json({ success: false, message: 'Webhook processing error' });
  }
});

// Route to serve the sitemap dynamically
app.get('/sitemap.xml', async (req, res) => {
  try {
    if (!cachedSitemap) {
      cachedSitemap = await generateSitemap();
    }
    res.header('Content-Type', 'application/xml');
    res.send(cachedSitemap);
  } catch (error) {
    res.status(500).send('Error generating sitemap');
  }
});

// Import axios before route handlers that use it
const axios = require('axios');

// Route to create contract submission via DocuSeal
// IMPORTANT: This route must be defined BEFORE the proxy middleware
// to ensure it's matched first and not proxied to Strapi
// Also handle /purchase/create-contract (without /api) in case reverse proxy strips /api
const handleCreateContractRoute = async (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  const requestStartTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Contract submission request received', {
    requestId,
    bodyKeys: Object.keys(req.body || {}),
    hasSubscriptionId: !!req.body?.subscriptionId,
    hasClientName: !!req.body?.client_name,
    hasClientEmail: !!req.body?.client_email,
    hasPlanType: !!req.body?.plan_type
  });
  
  try {
    const {
      subscriptionId,
      client_name,
      client_email,
      client_phone,
      business_name,
      business_address,
      plan_type,
      start_date,
      client_type,
      client_signature_data,
      client_printed_name,
      client_signature_date
    } = req.body || {};

    logger.info('Parsed request body', {
      requestId,
      subscriptionId,
      client_name,
      client_email: client_email ? '***' : null,
      client_phone: client_phone ? '***' : null,
      plan_type,
      has_business_name: !!business_name,
      has_start_date: !!start_date
    });

    // Validate required fields
    if (!subscriptionId || !client_name || !client_email || !client_phone || !plan_type || !business_address) {
      logger.warn('Missing required fields', {
        requestId,
        hasSubscriptionId: !!subscriptionId,
        hasClientName: !!client_name,
        hasClientEmail: !!client_email,
        hasClientPhone: !!client_phone,
        hasPlanType: !!plan_type,
        hasBusinessAddress: !!business_address
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subscriptionId, client_name, client_email, client_phone, business_address, and plan_type are required.'
      });
    }
    
    // Validate that business_address is not empty
    if (!business_address.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Address is required and cannot be empty.'
      });
    }
    
    // Validate company name and company type relationship
    const hasCompanyName = business_name && business_name.trim() !== '';
    const hasCompanyType = client_type && client_type.trim() !== '';
    
    if (hasCompanyName && !hasCompanyType) {
      logger.warn('Company type required when company name is provided', {
        requestId,
        hasBusinessName: hasCompanyName,
        hasClientType: hasCompanyType
      });
      return res.status(400).json({
        success: false,
        message: 'Company Type is required when a Company Name is provided.'
      });
    }
    
    if (hasCompanyType && !hasCompanyName) {
      logger.warn('Company name required when company type is selected', {
        requestId,
        hasBusinessName: hasCompanyName,
        hasClientType: hasCompanyType
      });
      return res.status(400).json({
        success: false,
        message: 'Company Name is required when a Company Type is selected.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client_email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Normalize plan_type to lowercase for comparison (do this early for validation)
    const normalizedPlanType = (plan_type || '').toLowerCase().trim();
    
    // Validate plan_type
    if (!['monthly', 'yearly'].includes(normalizedPlanType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan_type. Must be "monthly" or "yearly".'
      });
    }

    // Check if DocuSeal API key is configured
    const docusealApiKey = process.env.DOCUSEAL_API_KEY;
    if (!docusealApiKey) {
      logger.error('DocuSeal API key not configured');
      return res.status(500).json({
        success: false,
        message: 'Contract service is not properly configured. Please contact support.'
      });
    }

    // Read contract template HTML
    const templatePath = path.join(__dirname, 'public', 'contract-template.html');
    logger.info('Reading contract template', { requestId, templatePath });
    const templateReadStart = Date.now();
    let templateHtml = await fs.readFile(templatePath, 'utf8');
    const templateReadDuration = Date.now() - templateReadStart;
    logger.info('Template read complete', {
      requestId,
      duration: templateReadDuration + 'ms',
      sizeKB: (templateHtml.length / 1024).toFixed(2)
    });
    
    // Read and inline CSS files for DocuSeal (external CSS won't load in DocuSeal's HTML-to-PDF conversion)
    try {
      const contractCssPath = path.join(__dirname, 'public', 'css', 'contract-template.css');
      let contractCss = await fs.readFile(contractCssPath, 'utf8');
      
      // Remove the @import from contract-template.css since we'll inline core.css separately
      contractCss = contractCss.replace(/@import\s+url\([^)]+\)\s*;?/gi, '');
      
      // Extract CSS variables from core.css (the :root section)
      const coreCssPath = path.join(__dirname, 'public', 'css', 'core.css');
      const coreCss = await fs.readFile(coreCssPath, 'utf8');
      
      // Extract :root { ... } block with CSS variables
      const rootMatch = coreCss.match(/:root\s*\{[^}]+\}/);
      const cssVariables = rootMatch ? rootMatch[0] : '';
      
      // Create inline style block with CSS variables and contract styles
      const inlineStyles = `
<style data-docuseal-inline>
/* CSS Variables from core.css */
${cssVariables}

/* Contract Template Styles (inlined for DocuSeal) */
${contractCss}
</style>`;
      
      // Remove external CSS link tags (they won't work in DocuSeal)
      templateHtml = templateHtml.replace(/<link[^>]*href="[^"]*contract-template\.css"[^>]*>/gi, '');
      templateHtml = templateHtml.replace(/<link[^>]*href="[^"]*core\.css"[^>]*>/gi, '');
      
      // Inject inline styles into head
      if (templateHtml.includes('</head>')) {
        templateHtml = templateHtml.replace('</head>', inlineStyles + '\n</head>');
      } else {
        templateHtml = inlineStyles + templateHtml;
      }
      
      logger.info('CSS inlined for DocuSeal', {
        requestId,
        contractCssSizeKB: (contractCss.length / 1024).toFixed(2),
        cssVariablesLength: cssVariables.length
      });
    } catch (cssError) {
      logger.warn('Failed to inline CSS files', {
        requestId,
        error: cssError.message
      });
      // Continue without inlined CSS - styles may not render correctly
    }
    
    // Remove welcome popup (not needed in DocuSeal document)
    // Use a robust approach: find the opening tag and walk to find the matching closing tag
    const welcomeOverlayMatch = templateHtml.match(/<div[^>]*id="welcome-overlay"[^>]*>/i);
    if (welcomeOverlayMatch) {
      const startPos = templateHtml.indexOf(welcomeOverlayMatch[0]);
      const afterOpen = startPos + welcomeOverlayMatch[0].length;
      let depth = 1;
      let pos = afterOpen;
      const len = templateHtml.length;
      while (depth > 0 && pos < len) {
        const nextOpen = templateHtml.indexOf('<div', pos);
        const nextClose = templateHtml.indexOf('</div>', pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 4;
        } else {
          depth--;
          pos = nextClose + 6;
        }
      }
      templateHtml = templateHtml.substring(0, startPos) + templateHtml.substring(pos);
      logger.info('Welcome popup removed from template', { requestId });
    }
    
    // Remove welcome popup styles from the inline <style> tag in head
    // The template has a large <style> block with welcome popup styles - remove it entirely
    // since the welcome popup is removed and these styles are not needed
    templateHtml = templateHtml.replace(/<style>\s*\/\*\s*={5,}\s*\*\/[\s\S]*?Welcome Popup Styles[\s\S]*?<\/style>/gi, '');
    
    // Read and convert company signature image to base64 for DocuSeal
    try {
      const signatureImagePath = path.join(__dirname, 'public', 'content', 'contract', 'George Seibert.png');
      const signatureImageBuffer = await fs.readFile(signatureImagePath);
      const signatureImageBase64 = signatureImageBuffer.toString('base64');
      const signatureImageDataUri = `data:image/png;base64,${signatureImageBase64}`;
      
      // Replace the image src with the base64 data URI
      templateHtml = templateHtml.replace(
        /src="\/public\/content\/contract\/George Seibert\.png"/gi,
        `src="${signatureImageDataUri}"`
      );
      
      logger.info('Company signature image converted to base64', {
        requestId,
        imageSizeKB: (signatureImageBuffer.length / 1024).toFixed(2)
      });
    } catch (imageError) {
      logger.warn('Failed to load company signature image', {
        requestId,
        error: imageError.message
      });
      // Continue without the image - the placeholder will show
    }

    // Get current date for signature date and effective date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const effectiveDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate service fee based on plan type (normalizedPlanType already defined above)
    const serviceFee = normalizedPlanType === 'monthly' 
      ? '$150.00 per month, payable in advance, subject to the terms of Section 2.5 herein.'
      : '$1,499.00 per year, payable in advance, subject to the terms of Section 2.5 herein.';
    
    logger.info('Service fee calculated', { 
      requestId, 
      plan_type, 
      normalizedPlanType, 
      serviceFee 
    });
    
    const serviceTerm = '1 Year';
    const clientType = client_type || 'entity'; // Use actual client_type from form

    // Build CLIENT_INTRO text based on whether it's a business or individual
    let clientIntro = '';
    if (business_name && business_name.trim() !== '') {
      // Business client - use actual company type if provided
      const entityType = client_type && client_type.trim() !== '' ? client_type : 'entity';
      clientIntro = `<strong>${business_name}</strong> ("Client"), a Pennsylvania ${entityType}`;
    } else {
      // Individual client
      clientIntro = `<strong>${client_name}</strong> ("Client"), an individual`;
    }

    // Replace template placeholders with actual data
    templateHtml = templateHtml
      .replace(/\{\{CLIENT_NAME\}\}/g, client_name || '')
      .replace(/\{\{BUSINESS_NAME\}\}/g, business_name || '')
      .replace(/\{\{CLIENT_EMAIL\}\}/g, client_email || '')
      .replace(/\{\{CLIENT_PHONE\}\}/g, client_phone || '')
      .replace(/\{\{BUSINESS_ADDRESS\}\}/g, business_address || '')
      .replace(/\{\{START_DATE\}\}/g, start_date || '')
      .replace(/\{\{DATE\}\}/g, currentDate)
      .replace(/\{\{EFFECTIVE_DATE\}\}/g, effectiveDate)
      .replace(/\{\{SERVICE_FEE\}\}/g, serviceFee)
      .replace(/\{\{SERVICE_TERM\}\}/g, serviceTerm)
      .replace(/\{\{CLIENT_TYPE\}\}/g, clientType)
      .replace(/\{\{CLIENT_INTRO\}\}/g, clientIntro)
      .replace(/\{\{PLAN_TYPE_MONTHLY\}\}/g, normalizedPlanType === 'monthly' ? 'selected' : '')
      .replace(/\{\{PLAN_TYPE_YEARLY\}\}/g, normalizedPlanType === 'yearly' ? 'selected' : '');
    
    // Pre-fill form inputs on page 1 with client data
    templateHtml = templateHtml
      .replace(/(<input[^>]*id="input-company"[^>]*)(>)/gi, `$1 value="${(business_name || '').replace(/"/g, '&quot;')}"$2`)
      .replace(/(<input[^>]*id="input-contact"[^>]*)(>)/gi, `$1 value="${(client_name || '').replace(/"/g, '&quot;')}"$2`)
      .replace(/(<input[^>]*id="input-address"[^>]*)(>)/gi, `$1 value="${(business_address || '').replace(/"/g, '&quot;')}"$2`)
      .replace(/(<input[^>]*id="input-phone"[^>]*)(>)/gi, `$1 value="${(client_phone || '').replace(/"/g, '&quot;')}"$2`)
      .replace(/(<input[^>]*id="input-email"[^>]*)(>)/gi, `$1 value="${(client_email || '').replace(/"/g, '&quot;')}"$2`);
    
    // Pre-select the client_type option in the select dropdown
    if (client_type && client_type.trim() !== '') {
      const escapedType = client_type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      templateHtml = templateHtml.replace(
        new RegExp(`(<option[^>]*value="${escapedType}"[^>]*)>`, 'gi'),
        '$1 selected>'
      );
    }
    
    templateHtml = templateHtml
      .replace(/(<select[^>]*id="plan-type"[^>]*>[\s\S]*?<option[^>]*value=")(monthly)("[\s\S]*?>)/gi, (match, p1, val, p2) => {
        return normalizedPlanType === 'monthly' ? `${p1}${val}" selected${p2}` : match;
      })
      .replace(/(<select[^>]*id="plan-type"[^>]*>[\s\S]*?<option[^>]*value=")(yearly)("[\s\S]*?>)/gi, (match, p1, val, p2) => {
        return normalizedPlanType === 'yearly' ? `${p1}${val}" selected${p2}` : match;
      })
      // Replace service fee - match the input tag and replace value attribute regardless of attribute order
      .replace(/(<input[^>]*id="service-fee-display"[^>]*>)/gi, (match) => {
        // Replace existing value attribute if present
        if (match.includes('value="')) {
          const replaced = match.replace(/value="[^"]*"/gi, `value="${serviceFee.replace(/"/g, '&quot;')}"`);
          logger.info('Service fee input value replaced', { requestId, originalMatch: match.substring(0, 100), replaced: replaced.substring(0, 100), serviceFee });
          return replaced;
        }
        // If no value attribute, add it before the closing >
        const replaced = match.replace(/>$/, ` value="${serviceFee.replace(/"/g, '&quot;')}">`);
        logger.info('Service fee input value added', { requestId, originalMatch: match.substring(0, 100), replaced: replaced.substring(0, 100), serviceFee });
        return replaced;
      })
      .replace(/(<input[^>]*id="start-date"[^>]*)(>)/gi, `$1 value="${(start_date || new Date().toISOString().split('T')[0])}"$2`)
      .replace(/(<input[^>]*id="signature-date-company"[^>]*value=")[^"]*(")/gi, `$1${currentDate.replace(/"/g, '&quot;')}$2`);
    
    // Pre-fill DocuSeal fields with values
    const clientSignatureDate = start_date || new Date().toISOString().split('T')[0];
    templateHtml = templateHtml
      .replace(/(<text-field[^>]*name="Client Printed Name"[^>]*)(>)/gi, `$1 value="${(client_name || '').replace(/"/g, '&quot;')}"$2`)
      .replace(/(<date-field[^>]*name="Client Signature Date"[^>]*)(>)/gi, `$1 value="${clientSignatureDate}"$2`);
    
    // Clean HTML for DocuSeal: remove interactive elements but keep styles and structure
    const cleaningStart = Date.now();
    logger.info('Starting HTML cleaning', { requestId });
    
    // Remove script tags (they won't work in PDF conversion)
    const scriptsBefore = (templateHtml.match(/<script/gi) || []).length;
    templateHtml = templateHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const scriptsAfter = (templateHtml.match(/<script/gi) || []).length;
    
    // Remove form wrapper but keep the content (DocuSeal handles its own form)
    templateHtml = templateHtml.replace(/<form[^>]*>/gi, '<div>').replace(/<\/form>/gi, '</div>');
    
    // Remove min-heights that cause a blank first page in DocuSeal's PDF render.
    // .contract-wrapper { min-height: 100vh } and .page-container { min-height: 600px }
    // reserve a full page of empty space when DocuSeal converts HTML to document pages.
    templateHtml = templateHtml.replace(/\.contract-wrapper\s*\{[^}]*\}/gi, (match) => {
      return match.replace(/min-height\s*:\s*100vh[^;]*;?/gi, 'min-height: 0; ');
    });
    templateHtml = templateHtml.replace(/\.page-container\s*\{[^}]*\}/gi, (match) => {
      if (match.includes('min-height')) {
        return match.replace(/min-height\s*:\s*[^;]+;?/gi, 'min-height: 0; ');
      }
      return match;
    });
    // Inject override so DocuSeal's renderer never gets a full-page blank (works even if regex misses).
    // Remove vertical padding/margin on .contract-page so Article X and "Article X (continued)" sit flush.
    // Also simplify signature section styling to prevent page breaks and remove dramatic effects.
    const docusealLayoutFix = `<style data-docuseal-layout-fix>
.contract-wrapper,.page-container{min-height:0 !important;}
.contract-page{padding:0 clamp(1.5rem,3vw,2rem) !important;margin:0 !important;box-shadow:none !important;}
/* Simplify signature section for DocuSeal - remove dramatic styling */
.signature-section{
  background: #E5DDD0 !important;
  border: 1px solid #C4B8A8 !important;
  border-radius: 0.5rem !important;
  box-shadow: none !important;
  padding: 1.5rem !important;
  margin-top: 1.5rem !important;
  page-break-inside: avoid !important;
}
.signature-section::before{display:none !important;content:none !important;}
.signature-block{margin-bottom:1.5rem !important;page-break-inside:avoid !important;}
.signature-field{
  min-height: 60px !important;
  padding: 0.75rem !important;
  border: 1px solid #C4B8A8 !important;
  border-radius: 0.25rem !important;
  background: #F4F2ED !important;
}
.signature-field.client-signature{min-height:80px !important;}
.signature-field.company-signature{min-height:auto !important;padding:0.5rem !important;}
.signature-image{max-height:40px !important;}
.version-info{margin-top:1rem !important;padding-top:0.5rem !important;}
</style>`;
    if (templateHtml.includes('</head>')) {
      templateHtml = templateHtml.replace('</head>', docusealLayoutFix + '\n</head>');
    } else {
      templateHtml = docusealLayoutFix + templateHtml;
    }
    
    // Remove navigation controls and submit buttons (not needed in DocuSeal signing interface)
    templateHtml = templateHtml.replace(/<div[^>]*class="contract-nav"[^>]*>[\s\S]*?<\/div>/gi, '');
    templateHtml = templateHtml.replace(/<div[^>]*id="submit-section"[^>]*>[\s\S]*?<\/div>/gi, '');
    templateHtml = templateHtml.replace(/<div[^>]*class="[^"]*submit-block[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove site-wide navigation and footer (added for web display but not needed in DocuSeal PDF)
    // Remove top banner (matches nested div structure with whitespace)
    templateHtml = templateHtml.replace(/<div[^>]*class="[^"]*cs-topper-card[^"]*"[^>]*>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi, '');
    // Remove site navigation header
    templateHtml = templateHtml.replace(/<header[^>]*id="cs-navigation"[^>]*>[\s\S]*?<\/header>/gi, '');
    // Remove footer
    templateHtml = templateHtml.replace(/<footer[^>]*id="cs-footer-2412"[^>]*>[\s\S]*?<\/footer>/gi, '');
    // Remove page-wrapper div but keep contents (unwrap it)
    templateHtml = templateHtml.replace(/<div[^>]*class="[^"]*page-wrapper[^"]*"[^>]*>/gi, '');
    // Remove the corresponding closing comment and div for page-wrapper at end
    templateHtml = templateHtml.replace(/<\/div>[\s]*<!--\s*End page-wrapper\s*-->/gi, '');
    
    // For individuals (no company), remove Company and Company Type fields entirely from DocuSeal
    if (!business_name || business_name.trim() === '') {
      // Find and remove only the div containing input-company
      const companyInputMatch = templateHtml.match(/<input[^>]*id="input-company"[^>]*>/i);
      if (companyInputMatch) {
        const inputPos = templateHtml.indexOf(companyInputMatch[0]);
        // Find the cover-field div that contains this input (search backwards)
        const beforeInput = templateHtml.substring(0, inputPos);
        const divStartMatch = beforeInput.match(/.*(<div[^>]*class="cover-field"[^>]*>)/s);
        if (divStartMatch) {
          const divStart = beforeInput.lastIndexOf(divStartMatch[1]);
          const divEnd = templateHtml.indexOf('</div>', inputPos) + 6;
          templateHtml = templateHtml.substring(0, divStart) + templateHtml.substring(divEnd);
        }
      }
    }
    
    if (!client_type || client_type.trim() === '') {
      // Find and remove only the div containing input-client-type select
      const selectMatch = templateHtml.match(/<select[^>]*id="input-client-type"[^>]*>/i);
      if (selectMatch) {
        const selectPos = templateHtml.indexOf(selectMatch[0]);
        const beforeSelect = templateHtml.substring(0, selectPos);
        const divStartMatch = beforeSelect.match(/.*(<div[^>]*class="cover-field"[^>]*>)/s);
        if (divStartMatch) {
          const divStart = beforeSelect.lastIndexOf(divStartMatch[1]);
          // Find the closing </div> after the </select>
          const selectEnd = templateHtml.indexOf('</select>', selectPos) + 9;
          const divEnd = templateHtml.indexOf('</div>', selectEnd) + 6;
          templateHtml = templateHtml.substring(0, divStart) + templateHtml.substring(divEnd);
        }
      }
    } else {
      // Convert client_type select dropdown to plain text for DocuSeal
      templateHtml = templateHtml.replace(
        /<select[^>]*id="input-client-type"[^>]*>[\s\S]*?<\/select>/gi,
        `<span class="cover-input" style="display:block;padding:0.5rem 0;">${client_type}</span>`
      );
    }
    
    // Make all contract pages visible for DocuSeal (they're hidden by default with display:none).
    // Also reduce padding so stacked sections don't create huge vertical gaps between articles.
    templateHtml = templateHtml.replace(/\.contract-page\s*\{[^}]*\}/gi, (match) => {
      let out = match;
      // Replace any display:none with display:block !important
      if (out.includes('display') && out.includes('none')) {
        out = out.replace(/display\s*:\s*none[^;]*/gi, 'display: block !important');
      } else if (!out.includes('display')) {
        out = out.replace(/\{/, '{ display: block !important; ');
      }
      // Remove vertical padding so Article X and "Article X (continued)" sit flush
      if (out.includes('padding')) {
        out = out.replace(/padding\s*:\s*[^;]+;?/gi, 'padding: 0 clamp(1.5rem, 3vw, 2rem); ');
      }
      if (out.includes('margin')) {
        out = out.replace(/margin\s*:\s*[^;]+;?/gi, 'margin: 0; ');
      }
      return out;
    });
    
    // Also ensure .contract-page.active has display:block and remove opacity animations
    templateHtml = templateHtml.replace(/\.contract-page\.active\s*\{[^}]*\}/gi, (match) => {
      let newMatch = match;
      if (newMatch.includes('display')) {
        newMatch = newMatch.replace(/display\s*:\s*[^;]*/gi, 'display: block !important');
      } else {
        newMatch = newMatch.replace(/\{/, '{ display: block !important; ');
      }
      // Remove opacity animations that might hide content
      newMatch = newMatch.replace(/opacity\s*:\s*[^;]*/gi, 'opacity: 1 !important');
      return newMatch;
    });
    
    // Remove opacity animations from @keyframes that might affect visibility
    templateHtml = templateHtml.replace(/@keyframes\s+fadeIn[^}]*\{[^}]*opacity\s*:\s*0[^}]*\}/gi, '');
    
    // Unwrap .contract-page divs so DocuSeal gets one continuous flow (no block boundaries = no extra spacing)
    templateHtml = (function unwrapContractPages(html) {
      const openTag = /<div[^>]*class="[^"]*contract-page[^"]*"[^>]*>/i;
      let result = html;
      let match;
      while ((match = result.match(openTag)) !== null) {
        const start = result.indexOf(match[0]);
        const afterOpen = start + match[0].length;
        let depth = 1;
        let pos = afterOpen;
        const len = result.length;
        while (depth > 0 && pos < len) {
          const nextOpen = result.indexOf('<div', pos);
          const nextClose = result.indexOf('</div>', pos);
          if (nextClose === -1) break;
          if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            pos = nextOpen + 4;
          } else {
            depth--;
            pos = nextClose + 6;
          }
        }
        const end = pos;
        const inner = result.substring(afterOpen, end - 6);
        result = result.substring(0, start) + inner + result.substring(end);
      }
      return result;
    })(templateHtml);
    
    // Force min-height:0 and minimal padding on wrapper (fixes blank first page)
    templateHtml = templateHtml.replace(/<div([^>]*class="[^"]*contract-wrapper[^"]*"[^>]*)>/gi, (match, attrs) => {
      const styleMatch = attrs.match(/\s*style\s*=\s*["']([^"']*)["']/i);
      let s = styleMatch ? styleMatch[1] : '';
      s = s.replace(/min-height\s*:\s*[^;]+;?/gi, '').replace(/padding\s*:\s*[^;]+;?/gi, '').trim();
      s = s ? `${s}; min-height:0 !important; padding:0.5rem 1rem !important;` : 'min-height:0 !important; padding:0.5rem 1rem !important;';
      attrs = attrs.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
      return `<div${attrs} style="${s}">`;
    });
    templateHtml = templateHtml.replace(/<div([^>]*class="[^"]*page-container[^"]*"[^>]*)>/gi, (match, attrs) => {
      const styleMatch = attrs.match(/\s*style\s*=\s*["']([^"']*)["']/i);
      let s = styleMatch ? styleMatch[1] : '';
      s = s.replace(/min-height\s*:\s*[^;]+;?/gi, '').trim();
      s = s ? `${s}; min-height:0 !important;` : 'min-height:0 !important;';
      attrs = attrs.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
      return `<div${attrs} style="${s}">`;
    });
    
    // Make signature-section visible for DocuSeal (hidden on the form but needed for signing)
    // Just set display:block - other styling is handled by the docusealLayoutFix CSS
    templateHtml = templateHtml.replace(/<div([^>]*class="[^"]*signature-section[^"]*"[^>]*)style="[^"]*display\s*:\s*none[^"]*"([^>]*)>/gi, (match, before, after) => {
      return `<div${before}style="display: block;"${after}>`;
    });
    
    // Also ensure page-container doesn't hide content
    templateHtml = templateHtml.replace(/\.page-container\s*\{[^}]*\}/gi, (match) => {
      if (match.includes('display') && match.includes('none')) {
        return match.replace(/display\s*:\s*none[^;]*/gi, 'display: block !important');
      }
      return match;
    });
    
    // Remove onclick handlers and other interactive attributes
    templateHtml = templateHtml.replace(/\s+onclick="[^"]*"/gi, '');
    templateHtml = templateHtml.replace(/\s+oninput="[^"]*"/gi, '');
    templateHtml = templateHtml.replace(/\s+onchange="[^"]*"/gi, '');
    templateHtml = templateHtml.replace(/\s+onsubmit="[^"]*"/gi, '');
    
    const cleaningDuration = Date.now() - cleaningStart;
    
    // Log HTML size and content for debugging
    const htmlSizeKB = (templateHtml.length / 1024).toFixed(2);
    logger.info('HTML cleaning complete', {
      requestId,
      duration: cleaningDuration + 'ms',
      sizeKB: htmlSizeKB,
      scriptsRemoved: scriptsBefore - scriptsAfter,
      hasSignatureField: templateHtml.includes('signature-field'),
      hasTextField: templateHtml.includes('text-field'),
      hasDateField: templateHtml.includes('date-field'),
      signatureFieldCount: (templateHtml.match(/signature-field/gi) || []).length,
      textFieldCount: (templateHtml.match(/text-field/gi) || []).length,
      dateFieldCount: (templateHtml.match(/date-field/gi) || []).length
    });

    // Prepare DocuSeal API request
    const docusealApiUrl = process.env.DOCUSEAL_API_URL || 'https://api.docuseal.co';
    const docusealEndpoint = `${docusealApiUrl}/submissions/html`;

    // Create dynamic Square checkout with redirect to questionnaire
    // Includes prorated first month for monthly plans
    let squarePaymentUrl;
    let squareCheckoutData = null;
    let prorationInfo = null;
    
    if (process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID) {
      try {
        let amountCents;
        let planDescription;
        
        if (normalizedPlanType === 'yearly') {
          amountCents = 149900; // $1,499.00
          planDescription = 'Website Development Service - Annual Plan';
        } else {
          // Calculate prorated first month
          const proration = calculateProratedAmount(15000);
          prorationInfo = proration;
          
          if (proration.isFullMonth) {
            amountCents = 15000;
            planDescription = 'Website Development Service - Monthly Plan';
          } else {
            amountCents = proration.proratedAmountCents;
            planDescription = `Website Development Service - First Month (Prorated: ${proration.daysRemaining} days)`;
          }
        }
        
        const questionnaireRedirectUrl = `https://www.fishtownwebdesign.com/questionnaire?email=${encodeURIComponent(client_email)}&payment=success`;
        const idempotencyKey = `contract-${subscriptionId}-${Date.now()}`;

        logger.info('Creating Square checkout for contract', {
          requestId,
          client_email,
          plan_type: normalizedPlanType,
          amountCents,
          isProrated: prorationInfo && !prorationInfo.isFullMonth,
          prorationDetails: prorationInfo
        });

        const checkoutResponse = await squareClient.checkout.paymentLinks.create({
          idempotencyKey,
          order: {
            locationId: process.env.SQUARE_LOCATION_ID,
            lineItems: [
              {
                name: planDescription,
                quantity: '1',
                basePriceMoney: {
                  amount: BigInt(amountCents),
                  currency: 'USD'
                },
                note: normalizedPlanType === 'monthly' && prorationInfo && !prorationInfo.isFullMonth
                  ? `Prorated for ${prorationInfo.daysRemaining} days. Regular billing ($150/month) starts ${prorationInfo.nextBillingDate}`
                  : undefined
              }
            ]
          },
          checkoutOptions: {
            redirectUrl: questionnaireRedirectUrl,
            askForShippingAddress: false
          },
          prePopulatedData: {
            buyerEmail: client_email
          }
        });

        const paymentLink = checkoutResponse.paymentLink;
        if (paymentLink && paymentLink.url) {
          squarePaymentUrl = paymentLink.url;
          squareCheckoutData = {
            paymentLinkId: paymentLink.id,
            orderId: paymentLink.orderId,
            url: paymentLink.url,
            amountCents: amountCents,
            isProrated: prorationInfo && !prorationInfo.isFullMonth
          };
          
          logger.info('Square checkout created for contract', {
            requestId,
            paymentLinkId: paymentLink.id,
            amountCents,
            client_email
          });
        }
      } catch (squareError) {
        logger.warn('Failed to create Square checkout, falling back to static link', {
          requestId,
          error: squareError.message,
          squareErrors: squareError.errors
        });
      }
    }

    // Fallback to static Square payment links if dynamic checkout failed
    if (!squarePaymentUrl) {
      squarePaymentUrl = normalizedPlanType === 'yearly' 
        ? 'https://square.link/u/K82W8oIo'
        : 'https://square.link/u/xTet1TLc';
      logger.info('Using fallback static Square payment URL', { requestId, squarePaymentUrl });
    }

    // Build DocuSeal payload according to API documentation
    // https://www.docuseal.com/docs/api#create-a-submission-from-html
    const docusealPayload = {
      name: `Web Design Service Agreement - ${client_name}`,
      // Redirect client to Square payment after signing
      completed_redirect_url: squarePaymentUrl,
      documents: [
        {
          name: 'Website Development Service Agreement',
          html: templateHtml
        }
      ],
      submitters: [
        {
          role: 'First Party',
          email: client_email,
          name: client_name,
          // Client-specific redirect to payment
          completed_redirect_url: squarePaymentUrl
        },
        {
          role: 'Second Party',
          email: 'sales@fishtownwebdesign.com',
          name: 'George Seibert'
          // No redirect for company signer
        }
      ],
      // Optional: Add metadata for tracking
      external_id: subscriptionId,
      // Optional: Add variables that can be used in the HTML template
      variables: {
        subscription_id: subscriptionId,
        plan_type: plan_type,
        client_name: client_name,
        business_name: business_name || '',
        client_email: client_email,
        client_phone: client_phone,
        business_address: business_address || '',
        start_date: start_date || currentDate,
        signature_date: currentDate,
        service_fee: serviceFee,
        service_term: serviceTerm,
        effective_date: effectiveDate,
        client_printed_name: client_printed_name || client_name,
        client_signature_date: client_signature_date || currentDate
      }
    };

    // Call DocuSeal API with timeout
    logger.info('Calling DocuSeal API', {
      requestId,
      endpoint: docusealEndpoint,
      payloadSizeKB: (JSON.stringify(docusealPayload).length / 1024).toFixed(2),
      documentsCount: docusealPayload.documents?.length,
      submittersCount: docusealPayload.submitters?.length,
      timeout: '120s'
    });
    
    const docusealApiStart = Date.now();
    let docusealResponse;
    try {
      docusealResponse = await axios.post(docusealEndpoint, docusealPayload, {
        headers: {
          'X-Auth-Token': docusealApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120 second timeout (2 minutes) - HTML to PDF conversion can take time
      });
      
      const docusealApiDuration = Date.now() - docusealApiStart;
      logger.info('DocuSeal API response received', {
        requestId,
        duration: docusealApiDuration + 'ms',
        status: docusealResponse.status,
        hasData: !!docusealResponse.data,
        responseKeys: Object.keys(docusealResponse.data || {})
      });
    } catch (docusealError) {
      const docusealApiDuration = Date.now() - docusealApiStart;
      logger.error('DocuSeal API error', {
        requestId,
        duration: docusealApiDuration + 'ms',
        error: docusealError.message,
        code: docusealError.code,
        response: docusealError.response?.data,
        status: docusealError.response?.status,
        statusText: docusealError.response?.statusText,
        requestPayload: {
          hasDocuments: !!docusealPayload.documents,
          documentsCount: docusealPayload.documents?.length,
          submittersCount: docusealPayload.submitters?.length,
          hasVariables: !!docusealPayload.variables,
          htmlSizeKB: htmlSizeKB
        },
        stack: docusealError.stack?.substring(0, 500)
      });
      
      // Handle timeout errors
      if (docusealError.code === 'ECONNABORTED' || docusealError.message.includes('timeout')) {
        return res.status(504).json({
          success: false,
          message: 'The contract service is taking longer than expected. Please try again in a moment.',
          error: 'timeout'
        });
      }
      
      // Handle network errors
      if (docusealError.code === 'ECONNREFUSED' || docusealError.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          message: 'The contract service is temporarily unavailable. Please try again later.',
          error: 'service_unavailable'
        });
      }
      
      // Provide more helpful error message
      const errorMessage = docusealError.response?.data?.error || 
                          docusealError.response?.data?.message ||
                          'Failed to create contract submission. Please try again later.';
      
      return res.status(docusealError.response?.status || 500).json({
        success: false,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? docusealError.response?.data : undefined
      });
    }

    // Extract submission ID and signing URL from DocuSeal response
    // Response structure: { data: { id, submitters: [{ url, slug, ... }] } }
    const submissionData = docusealResponse.data?.data || docusealResponse.data;
    const submissionId = submissionData?.id;
    
    logger.info('Processing DocuSeal response', {
      requestId,
      submissionId,
      responseStructure: Object.keys(submissionData || {}),
      submittersCount: submissionData?.submitters?.length || 0,
      submitters: submissionData?.submitters?.map(s => ({
        role: s.role,
        email: s.email ? '***' : null,
        hasUrl: !!s.url,
        hasSlug: !!s.slug,
        status: s.status
      }))
    });
    
    // Find the first submitter (client) and get their signing URL
    const clientSubmitter = submissionData?.submitters?.find(s => s.role === 'First Party') || 
                           submissionData?.submitters?.[0];
    const signingUrl = clientSubmitter?.embed_src ||
                      clientSubmitter?.url || 
                      submissionData?.submitters?.[0]?.embed_src ||
                      submissionData?.submitters?.[0]?.url ||
                      docusealResponse.data?.signing_url;
    
    logger.info('Extracted signing information', {
      requestId,
      submissionId,
      hasSigningUrl: !!signingUrl,
      signingUrl: signingUrl ? '***' : null,
      clientSubmitterRole: clientSubmitter?.role,
      clientSubmitterStatus: clientSubmitter?.status
    });

    if (!submissionId || !signingUrl) {
      logger.error('Invalid DocuSeal response structure', {
        response: docusealResponse.data
      });
      return res.status(500).json({
        success: false,
        message: 'Invalid response from contract service. Please contact support.'
      });
    }

    // Store submission in database (non-blocking for testing)
    try {
      const connection = await pool.getConnection();
      try {
        await connection.execute(
          `INSERT INTO contract_submissions 
            (subscription_id, client_name, client_email, client_phone, business_name, business_address, plan_type, start_date, docuseal_submission_id, signing_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
          [
            String(subscriptionId).trim(),
            String(client_name).trim(),
            String(client_email).trim(),
            String(client_phone).trim(),
            business_name ? String(business_name).trim() : null,
            business_address ? String(business_address).trim() : null,
            plan_type,
            start_date || null,
            String(submissionId).trim(),
            signingUrl
          ]
        );
        connection.release();

        logger.info('Contract submission created successfully', {
          subscriptionId,
          client_email,
          docusealSubmissionId: submissionId
        });

        // Store Square payment record if checkout was created
        if (squareCheckoutData) {
          try {
            // Get the contract submission ID we just created
            const [contractRows] = await connection.execute(
              'SELECT id FROM contract_submissions WHERE docuseal_submission_id = ? ORDER BY id DESC LIMIT 1',
              [String(submissionId).trim()]
            );
            
            const contractSubmissionId = contractRows.length > 0 ? contractRows[0].id : null;
            const amountCents = normalizedPlanType === 'yearly' ? 149900 : 15000;
            const questionnaireRedirectUrl = `https://www.fishtownwebdesign.com/questionnaire?email=${encodeURIComponent(client_email)}&payment=success`;

            await connection.execute(
              `INSERT INTO square_payments 
                (contract_submission_id, payment_link_id, payment_link_url, order_id, client_email, client_name, plan_type, amount_cents, redirect_url, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
              [
                contractSubmissionId,
                squareCheckoutData.paymentLinkId,
                squareCheckoutData.url,
                squareCheckoutData.orderId || null,
                client_email,
                client_name || null,
                normalizedPlanType,
                amountCents,
                questionnaireRedirectUrl
              ]
            );
            
            logger.info('Square payment record created', {
              requestId,
              paymentLinkId: squareCheckoutData.paymentLinkId,
              contractSubmissionId
            });
          } catch (squareDbError) {
            logger.warn('Failed to store Square payment record', {
              requestId,
              error: squareDbError.message
            });
          }
        }
      } catch (dbError) {
        connection.release();
        
        // If table does not exist yet, initialize schema then retry once
        if (dbError && (dbError.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(dbError.message))) {
          try {
            await initializeDatabase();
            const connection = await pool.getConnection();
            await connection.execute(
              `INSERT INTO contract_submissions 
                (subscription_id, client_name, client_email, client_phone, business_name, business_address, plan_type, start_date, docuseal_submission_id, signing_url, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
              [
                String(subscriptionId).trim(),
                String(client_name).trim(),
                String(client_email).trim(),
                String(client_phone).trim(),
                business_name ? String(business_name).trim() : null,
                business_address ? String(business_address).trim() : null,
                plan_type,
                start_date || null,
                String(submissionId).trim(),
                signingUrl
              ]
            );
            connection.release();
            
            logger.info('Contract submission created successfully after schema init', {
              subscriptionId,
              client_email,
              docusealSubmissionId: submissionId
            });
          } catch (retryError) {
            logger.warn('Database storage failed (non-blocking for testing)', {
              error: retryError.message,
              errorCode: retryError.code,
              subscriptionId,
              client_email
            });
          }
        } else {
          // Log database error but don't fail the request
          logger.warn('Database storage failed (non-blocking for testing)', {
            error: dbError.message,
            errorCode: dbError.code,
            subscriptionId,
            client_email
          });
        }
      }
    } catch (connectionError) {
      // Connection pool error - log but don't fail the request
      logger.warn('Database connection failed (non-blocking for testing)', {
        error: connectionError.message,
        errorCode: connectionError.code,
        subscriptionId,
        client_email
      });
    }

    // Always return success response with signing URL, even if DB storage failed
    return res.json({
      success: true,
      submissionId: submissionId,
      signingUrl: signingUrl,
      paymentUrl: squarePaymentUrl,
      squareCheckout: squareCheckoutData ? {
        paymentLinkId: squareCheckoutData.paymentLinkId,
        orderId: squareCheckoutData.orderId,
        redirectsToQuestionnaire: true
      } : null,
      status: 'sent'
    });
  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    logger.error('Error creating contract submission', {
      requestId,
      totalDuration: totalDuration + 'ms',
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack?.substring(0, 1000),
      bodyKeys: Object.keys(req.body || {})
    });
    return res.status(500).json({
      success: false,
      message: 'There was an error creating your contract submission. Please try again later.',
      requestId: process.env.NODE_ENV === 'development' ? requestId : undefined
    });
  }
};

// Register the route for both paths - MUST be before proxy middleware
app.post('/api/purchase/create-contract', handleCreateContractRoute);
app.post('/purchase/create-contract', handleCreateContractRoute);

// Proxy API requests to Strapi running at localhost:1337
// Exclude /api/purchase routes (handled by our Express routes)
const strapiProxy = createProxyMiddleware({
  target: 'http://localhost:1337',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  filter: (pathname, req) => {
    // Don't proxy /api/purchase routes
    // pathname includes the full path like '/api/purchase/create-contract'
    const shouldProxy = !pathname.startsWith('/api/purchase');
    if (!shouldProxy) {
      logger.info('Skipping proxy for purchase route', { pathname });
    }
    return shouldProxy;
  },
});
app.use('/api', strapiProxy);
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

const STRAPI_URL = 'https://fishtownwebdesign.com';

// Fetch all posts from Strapi, sorted by publishedDate descending
async function getPosts(categoryFilter = null) {
  try {
    let url = 'http://127.0.0.1:1337/api/posts?populate=categories&populate=featuredImage&sort=publishedDate:desc&publicationState=live';
    if (categoryFilter) {
      url += `&filters[categories][name][$eq]=${encodeURIComponent(categoryFilter)}`;
    }
    logger.info('Fetching posts from Strapi', { url, categoryFilter });
    
    const response = await axios.get(url);
    if (!response.data || !Array.isArray(response.data.data)) {
      logger.error('Invalid posts response from Strapi', { 
        responseData: response.data,
        status: response.status,
        headers: response.headers
      });
      return [];
    }

    const posts = response.data.data.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      publishedDate: post.publishedDate,
      excerpt: post.excerpt,
      categories: post.categories?.map(cat => cat.name) || [],
      featuredImage: post.featuredImage ? {
        mobile: post.featuredImage.formats?.small?.url
          ? STRAPI_URL + post.featuredImage.formats.small.url
          : STRAPI_URL + post.featuredImage.url,
        desktop: post.featuredImage.formats?.medium?.url
          ? STRAPI_URL + post.featuredImage.formats.medium.url
          : STRAPI_URL + post.featuredImage.url,
        default: STRAPI_URL + post.featuredImage.url
      } : null
    }));

    logger.info('Successfully processed posts', { 
      postCount: posts.length,
      hasImages: posts.some(post => post.featuredImage !== null)
    });
    
    return posts;
  } catch (error) {
    logger.error('Error fetching posts from Strapi', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      categoryFilter
    });
    return [];
  }
}

// Fetch unique categories from Strapi
async function getCategories() {
  try {
    logger.info('Fetching categories from Strapi');
    const response = await axios.get('http://127.0.0.1:1337/api/categories');
    
    if (!response.data || !Array.isArray(response.data.data)) {
      logger.error('Invalid categories response from Strapi', {
        responseData: response.data,
        status: response.status,
        headers: response.headers
      });
      return [];
    }

    const categories = response.data.data.map(category => category.name);
    logger.info('Successfully fetched categories', { categoryCount: categories.length });
    return categories;
  } catch (error) {
    logger.error('Error fetching categories from Strapi', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    return [];
  }
}

// Blog category route with clean URLs
app.get('/blog/category/:categorySlug', async (req, res) => {
  try {
    const { categorySlug } = req.params;
    logger.info('Blog category request received', { categorySlug });
    
    // Check if category is allowed
    if (!ALLOWED_CATEGORIES.includes(categorySlug)) {
      logger.warn('Unauthorized category access attempt', { categorySlug });
      res.set('X-Robots-Tag', 'noindex');
      return res.status(404).send('Category not found.');
    }
    
    // Convert slug back to category name for filtering
    const categoryName = categorySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const posts = await getPosts(categoryName);
    const categories = await getCategories();
    
    logger.info('Rendering blog category', {
      postCount: posts.length,
      categoryCount: categories.length,
      selectedCategory: categoryName
    });
    
    res.render('blog-index', { 
      posts, 
      categories, 
      selectedCategory: categoryName,
      categorySlug: categorySlug,
      md: md 
    });
  } catch (error) {
    logger.error('Blog category route error', {
      error: error.message,
      stack: error.stack,
      categorySlug: req.params.categorySlug
    });
    res.status(500).send('Something went wrong.');
  }
});

// Blog index route with redirect for old query-based category URLs
app.get('/blog', async (req, res) => {
  try {
    // Redirect old query-based category URLs to new clean URLs
    if (req.query.category) {
      const categorySlug = req.query.category
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[()]/g, '')
        .replace(/&/g, 'and');
      
      // Only redirect to allowed categories
      if (ALLOWED_CATEGORIES.includes(categorySlug)) {
        logger.info('Redirecting old category URL', { 
          oldCategory: req.query.category, 
          newSlug: categorySlug 
        });
        return res.redirect(301, `/blog/category/${categorySlug}`);
      } else {
        // Redirect disallowed categories to blog index
        logger.info('Redirecting disallowed category to blog index', { 
          oldCategory: req.query.category, 
          categorySlug 
        });
        return res.redirect(301, '/blog');
      }
    }
    
    const categoryFilter = null;
    logger.info('Blog index request received', { categoryFilter });
    
    const posts = await getPosts(categoryFilter);
    const categories = await getCategories();
    
    logger.info('Rendering blog index', {
      postCount: posts.length,
      categoryCount: categories.length,
      selectedCategory: categoryFilter
    });
    
    res.render('blog-index', { posts, categories, selectedCategory: categoryFilter, md: md });
  } catch (error) {
    logger.error('Blog index route error', {
      error: error.message,
      stack: error.stack,
      categoryFilter: req.query.category
    });
    res.status(500).send('Something went wrong.');
  }
});

// Single post route
app.get('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    logger.info('Single post request received', { slug });
    
    // Check if post is allowed
    if (!ALLOWED_BLOG_POSTS.includes(slug)) {
      logger.warn('Unauthorized blog post access attempt', { slug });
      res.set('X-Robots-Tag', 'noindex');
      return res.status(404).send('Post not found');
    }
    
    const url = `http://127.0.0.1:1337/api/posts?filters[slug][$eq]=${slug}&populate=categories&populate=featuredImage`;
    const response = await axios.get(url);
    
    if (!response.data.data || response.data.data.length === 0) {
      logger.warn('Post not found', { slug });
      res.set('X-Robots-Tag', 'noindex');
      return res.status(404).send('Post not found');
    }
    
    const post = response.data.data[0];
    
    // Process the post data to match the structure used in getPosts
    const processedPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content, // Keep the original content field
      contents: post.contents, // Also keep contents for backward compatibility
      publishedDate: post.publishedDate,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      excerpt: post.excerpt,
      categories: post.categories?.map(cat => cat.name) || []
    };
    
    // Process the featured image like we do in getPosts
    if (post.featuredImage) {
      processedPost.featuredImage = {
        mobile: post.featuredImage.formats?.small?.url
          ? STRAPI_URL + post.featuredImage.formats.small.url
          : STRAPI_URL + post.featuredImage.url,
        desktop: post.featuredImage.formats?.medium?.url
          ? STRAPI_URL + post.featuredImage.formats.medium.url
          : STRAPI_URL + post.featuredImage.url,
        default: STRAPI_URL + post.featuredImage.url
      };
    }
    
    logger.info('Successfully fetched post', { 
      slug,
      hasCategories: processedPost.categories?.length > 0,
      hasContent: !!processedPost.content,
      hasContents: !!processedPost.contents,
      hasFeaturedImage: !!processedPost.featuredImage,
      contentType: typeof processedPost.content,
      contentsType: typeof processedPost.contents,
      contentIsArray: Array.isArray(processedPost.content),
      contentsIsArray: Array.isArray(processedPost.contents)
    });
    
    res.render('blog-post', { post: processedPost, md: md });
  } catch (error) {
    logger.error('Single post route error', {
      error: error.message,
      stack: error.stack,
      slug: req.params.slug,
      response: error.response?.data
    });
    res.status(500).send('Something went wrong.');
  }
});


// Redirects
const redirects = {
    '/public/home.html': '/',
    '/public/contact.html': '/contact',
    '/public/about.html': '/about',
    '/public/pricing.html': '/pricing',
    '/public/terms-of-service.html': '/terms-of-service',
    '/public/pp.html': '/privacy-policy',
    '/public/faq.html': '/faq',
    '/public/web-design.html': '/web-design',
    '/public/seo.html': '/seo'
};

Object.keys(redirects).forEach((oldPath) => {
    app.get(oldPath, (req, res) => {
        res.redirect(301, redirects[oldPath]);
    });
});

app.get('/home', (req, res) => {
  res.redirect(301, '/'); // 301 is for a permanent redirect
});

// Note: /tos route is defined below with other page routes

// High-value page redirects (301 permanent redirects to preserve SEO value)
// These pages were deleted but still get significant traffic from Google
app.get('/philadelphia-web-design', (req, res) => {
  logger.info('301 redirect: philadelphia-web-design to web-design', { url: req.url });
  res.redirect(301, '/web-design');
});

app.get('/internet-marketing-fishtown', (req, res) => {
  logger.info('301 redirect: internet-marketing-fishtown to seo', { url: req.url });
  res.redirect(301, '/seo');
});

app.get('/web-designer-philadelphia', (req, res) => {
  logger.info('301 redirect: web-designer-philadelphia to web-design', { url: req.url });
  res.redirect(301, '/web-design');
});

app.get('/philadelphia-web-design-firm', (req, res) => {
  logger.info('301 redirect: philadelphia-web-design-firm to web-design', { url: req.url });
  res.redirect(301, '/web-design');
});

app.get('/web-design-near-me', (req, res) => {
  logger.info('301 redirect: web-design-near-me to web-design', { url: req.url });
  res.redirect(301, '/web-design');
});

app.get('/affordable-website-design-philadelphia', (req, res) => {
  logger.info('301 redirect: affordable-website-design-philadelphia to pricing', { url: req.url });
  res.redirect(301, '/pricing');
});

// Return 410 Gone for old /public/*.html direct access attempts (not covered by redirects above)
app.get('/public/*.html', (req, res) => {
  logger.info('410 Gone returned for old public URL', { url: req.url });
  res.set('X-Robots-Tag', 'noindex');
  res.status(410).send('This page has permanently moved. Please visit our <a href="/">homepage</a>.');
});

// Return 410 Gone for old/deleted pages (low-value pages that should be removed from index)
const deletedPages = [
  '/blog/philly-site-speed-hacks',
  '/blog/fishtownwebdesign.com',
  '/blog/seo-blog-',
  '/services',
  '/blog/link',
  '/subscribe-newsletter',
  '/blog/building-a-blog-with-strapi-and-node-js',
  '/blog/why-trade-business-owners-need-a-blog-seo-tips-for-painters-contractors',
  '/blog/discover-fishtown-philadelphia-a-vibrant-neighborhood-and-the-evil-genius-block-party-experience',
  '/views/blog',
  '/blog/best-website-builders-small-businesses-2025',
  '/blog/seo-blog-writing-philadelphia-business',
  '/blog/philly-business-online-presence-tips'
];

deletedPages.forEach((path) => {
  app.get(path, (req, res) => {
    logger.info('410 Gone returned for deleted page', { url: req.url });
    res.set('X-Robots-Tag', 'noindex');
    res.status(410).send('This page has been permanently removed.');
  });
});

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, 'public/pricing.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public/contact.html')));
// Terms of Service and Privacy Policy routes
app.get('/tos', (req, res) => res.sendFile(path.join(__dirname, 'public/tos.html')));
app.get('/pp', (req, res) => res.sendFile(path.join(__dirname, 'public/pp.html')));
// Redirect old URLs to new canonical URLs
app.get('/terms-of-service', (req, res) => res.redirect(301, '/tos'));
app.get('/privacy-policy', (req, res) => res.redirect(301, '/pp'));
app.get('/faq', (req, res) => res.sendFile(path.join(__dirname, 'public/faq.html')));
app.get('/web-design', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design.html')));
app.get('/seo', (req, res) => res.sendFile(path.join(__dirname, 'public/seo.html')));
app.get('/saas-development', (req, res) => res.sendFile(path.join(__dirname, 'public/saas-development.html')));
app.get('/charity', (req, res) => res.sendFile(path.join(__dirname, 'public/charity.html')));
app.get('/unsubscribe', (req, res) => res.sendFile(path.join(__dirname, 'public/unsubscribe.html')));

// Industry-specific landing pages
app.get('/contractor-web-design', (req, res) => res.sendFile(path.join(__dirname, 'public/contractor-web-design.html')));
app.get('/venue-web-design', (req, res) => res.sendFile(path.join(__dirname, 'public/venue-web-design.html')));
app.get('/ecommerce-web-design', (req, res) => res.sendFile(path.join(__dirname, 'public/ecommerce-web-design.html')));
app.get('/startup-product-development', (req, res) => res.sendFile(path.join(__dirname, 'public/startup-product-development.html')));

// Location-specific landing pages
app.get('/web-design-lancaster-pa', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design-lancaster-pa.html')));
app.get('/web-design-fishtown', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design-fishtown.html')));
app.get('/web-design-center-city', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design-center-city.html')));
app.get('/web-design-old-city', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design-old-city.html')));
app.get('/web-design-northern-liberties', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design-northern-liberties.html')));
app.get('/web-design-university-city', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design-university-city.html')));

// Contract form route - users fill out contract here
app.get('/contract', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public/contract-template.html'));
});

// Questionnaire route
app.get('/questionnaire', (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  return res.sendFile(path.join(__dirname, 'public/questionnaire.html'));
});

// Handle questionnaire submission
app.post('/submit-questionnaire', async (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  try {
    const {
      name,
      email,
      primary_services,
      top_revenue_services,
      about_business,
      why_choose_you,
      essential_info,
      design_inspiration,
      primary_cta,
      branding,
      features,
      requested_pages,
      experience_feedback,
      botcheck
    } = req.body || {};

    // Honeypot check
    if (botcheck) {
      logger.warn('Bot submission blocked on questionnaire');
      return res.status(200).json({ success: true, message: 'OK' });
    }

    // Basic validation
    const requiredFields = [
      name,
      email,
      primary_services,
      top_revenue_services,
      about_business,
      why_choose_you,
      design_inspiration,
      primary_cta,
      branding,
      features,
      requested_pages
    ];
    if (requiredFields.some(v => !v || String(v).trim() === '')) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      `INSERT INTO questionnaire_submissions 
        (name, email, primary_services, top_revenue_services, about_business, why_choose_you, essential_info, design_inspiration, primary_cta, branding, features, requested_pages, experience_feedback)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        String(name).trim(),
        String(email).trim(),
        String(primary_services).trim(),
        String(top_revenue_services).trim(),
        String(about_business).trim(),
        String(why_choose_you).trim(),
        essential_info ? String(essential_info).trim() : null,
        String(design_inspiration).trim(),
        String(primary_cta).trim(),
        String(branding).trim(),
        String(features).trim(),
        String(requested_pages).trim(),
        experience_feedback ? String(experience_feedback).trim() : null
      ]
    );
    connection.release();

    logger.info('Questionnaire submission saved', { email });
    return res.json({ success: true, message: 'Your questionnaire has been submitted successfully! We will review it and follow up within 1 business day.' });
  } catch (error) {
    // If table does not exist yet, initialize schema then retry once
    if (error && (error.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(error.message))) {
      try {
        await initializeDatabase();
        const {
          name,
          email,
          primary_services,
          top_revenue_services,
          about_business,
          why_choose_you,
          essential_info,
          design_inspiration,
          primary_cta,
          branding,
          features,
          requested_pages,
          experience_feedback
        } = req.body || {};
        const connection = await pool.getConnection();
        await connection.execute(
          `INSERT INTO questionnaire_submissions 
            (name, email, primary_services, top_revenue_services, about_business, why_choose_you, essential_info, design_inspiration, primary_cta, branding, features, requested_pages, experience_feedback)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            String(name).trim(),
            String(email).trim(),
            String(primary_services).trim(),
            String(top_revenue_services).trim(),
            String(about_business).trim(),
            String(why_choose_you).trim(),
            essential_info ? String(essential_info).trim() : null,
            String(design_inspiration).trim(),
            String(primary_cta).trim(),
            String(branding).trim(),
            String(features).trim(),
            String(requested_pages).trim(),
            experience_feedback ? String(experience_feedback).trim() : null
          ]
        );
        connection.release();
        logger.info('Questionnaire submission saved after schema init', { email });
        return res.json({ success: true, message: 'Your questionnaire has been submitted successfully! We will review it and follow up within 1 business day.' });
      } catch (retryError) {
        logger.error('Retry after schema init failed for questionnaire submission', {
          error: retryError.message,
          stack: retryError.stack
        });
      }
    }

    logger.error('Error handling questionnaire submission', {
      error: error.message,
      stack: error.stack,
      bodyKeys: Object.keys(req.body || {})
    });
    return res.status(500).json({ success: false, message: 'There was an error submitting your questionnaire. Please try again later.' });
  }
});

// Test endpoint to verify DocuSeal API connection (remove in production)
app.get('/api/test/docuseal', async (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  
  const docusealApiKey = process.env.DOCUSEAL_API_KEY;
  const docusealApiUrl = process.env.DOCUSEAL_API_URL || 'https://api.docuseal.co';
  
  if (!docusealApiKey) {
    return res.status(500).json({
      success: false,
      message: 'DOCUSEAL_API_KEY not configured in environment variables'
    });
  }
  
  try {
    // Test API connection by fetching submissions list
    const testResponse = await axios.get(`${docusealApiUrl}/submissions?limit=1`, {
      headers: {
        'X-Auth-Token': docusealApiKey
      }
    });
    
    return res.json({
      success: true,
      message: 'DocuSeal API connection successful',
      apiUrl: docusealApiUrl,
      hasApiKey: !!docusealApiKey,
      testResponse: {
        status: testResponse.status,
        hasData: !!testResponse.data
      }
    });
  } catch (error) {
    logger.error('DocuSeal API test failed', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return res.status(500).json({
      success: false,
      message: 'DocuSeal API test failed',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
});

// Route to handle newsletter subscriptions
app.post('/subscribe-newsletter', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email address is required.' 
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid email address.' 
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Check if email already exists
    const [existingRows] = await connection.execute(
      'SELECT id, status FROM newsletter_subscriptions WHERE email = ?',
      [email]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      
      if (existing.status === 'active') {
        connection.release();
        return res.status(400).json({ 
          success: false, 
          message: 'This email is already subscribed to our newsletter.' 
        });
      } else {
        // Reactivate subscription
        await connection.execute(
          'UPDATE newsletter_subscriptions SET status = "active", subscribed_at = CURRENT_TIMESTAMP WHERE email = ?',
          [email]
        );
        connection.release();
        
        logger.info('Newsletter subscription reactivated', { email });
        return res.json({ 
          success: true, 
          message: 'Welcome back! Your subscription has been reactivated.' 
        });
      }
    }

    // Insert new subscription
    await connection.execute(
      'INSERT INTO newsletter_subscriptions (email) VALUES (?)',
      [email]
    );
    
    connection.release();
    
    logger.info('New newsletter subscription added', { email });
    res.json({ 
      success: true, 
      message: 'Thank you for subscribing to our newsletter!' 
    });
    
  } catch (error) {
    logger.error('Error handling newsletter subscription', {
      error: error.message,
      stack: error.stack,
      email: email
    });
    res.status(500).json({ 
      success: false, 
      message: 'There was an error processing your subscription. Please try again later.' 
    });
  }
});

// Route to handle newsletter unsubscriptions
app.post('/unsubscribe-newsletter', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email address is required.' 
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid email address.' 
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Check if email exists and is currently subscribed
    const [existingRows] = await connection.execute(
      'SELECT id, status FROM newsletter_subscriptions WHERE email = ?',
      [email]
    );

    if (existingRows.length === 0) {
      connection.release();
      return res.status(404).json({ 
        success: false, 
        message: 'This email address is not subscribed to our newsletter.' 
      });
    }

    const existing = existingRows[0];
    
    if (existing.status === 'unsubscribed') {
      connection.release();
      return res.status(400).json({ 
        success: false, 
        message: 'This email address has already been unsubscribed from our newsletter.' 
      });
    }

    // Update subscription status to unsubscribed
    await connection.execute(
      'UPDATE newsletter_subscriptions SET status = "unsubscribed" WHERE email = ?',
      [email]
    );
    
    connection.release();
    
    logger.info('Newsletter subscription cancelled', { email });
    res.json({ 
      success: true, 
      message: 'You have been successfully unsubscribed from our newsletter. We\'re sorry to see you go!' 
    });
    
  } catch (error) {
    logger.error('Error handling newsletter unsubscription', {
      error: error.message,
      stack: error.stack,
      email: email
    });
    res.status(500).json({ 
      success: false, 
      message: 'There was an error processing your unsubscription. Please try again later.' 
    });
  }
});

/**
 * Route to send newsletter to all active subscribers
 * 
 * POST /send-newsletter
 * Headers: Authorization: Bearer <NEWSLETTER_SECRET_TOKEN>
 * Body: {
 *   newsletterFile: "July2025.html",  // Filename in public/newsletter/
 *   subject: "Fishtown Web Design Newsletter - July 2025",
 *   testMode: true  // Optional: If true, sends only to test email (NEWSLETTER_TEST_EMAIL)
 * }
 * 
 * Example usage (production):
 * curl -X POST http://localhost:7000/send-newsletter \
 *   -H "Authorization: Bearer your-secret-token" \
 *   -H "Content-Type: application/json" \
 *   -d '{"newsletterFile": "July2025.html", "subject": "July Newsletter"}'
 * 
 * Example usage (test mode):
 * curl -X POST http://localhost:7000/send-newsletter \
 *   -H "Authorization: Bearer your-secret-token" \
 *   -H "Content-Type: application/json" \
 *   -d '{"newsletterFile": "July2025.html", "subject": "July Newsletter", "testMode": true}'
 */
app.post('/send-newsletter', async (req, res) => {
  const { newsletterFile, subject, testMode } = req.body;

  // Validate required fields
  if (!newsletterFile || !subject) {
    return res.status(400).json({
      success: false,
      message: 'Newsletter file path and subject are required.'
    });
  }

  // Optional: Add authentication/authorization check here
  // For example, check for API key or admin session
  const authHeader = req.headers['authorization'];
  const expectedToken = `Bearer ${process.env.NEWSLETTER_SECRET_TOKEN}`;
  if (!authHeader || authHeader !== expectedToken) {
    logger.warn('Unauthorized newsletter send attempt');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Valid authorization token required.'
    });
  }

  try {
    // Read newsletter HTML file
    const newsletterPath = path.join(__dirname, 'public', 'newsletter', newsletterFile);
    let newsletterHtml = await fs.readFile(newsletterPath, 'utf8');

    let subscribers;
    let isTestMode = testMode === true;

    if (isTestMode) {
      // Test mode: Use test email instead of querying database
      const testEmail = process.env.NEWSLETTER_TEST_EMAIL;
      if (!testEmail) {
        return res.status(400).json({
          success: false,
          message: 'Test mode enabled but NEWSLETTER_TEST_EMAIL is not configured in .env file.'
        });
      }
      subscribers = [{ email: testEmail }];
      logger.info('Newsletter sending in TEST MODE', { testEmail });
    } else {
      // Production mode: Get all active subscribers from database
      const connection = await pool.getConnection();
      const [subscriberRows] = await connection.execute(
        'SELECT email FROM newsletter_subscriptions WHERE status = "active"'
      );
      connection.release();
      subscribers = subscriberRows;

      if (subscribers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active subscribers found.'
        });
      }
    }

    // Send newsletter to each subscriber
    const results = {
      total: subscribers.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const subscriber of subscribers) {
      try {
        // Replace unsubscribe placeholder with actual unsubscribe link
        const unsubscribeLink = `https://www.fishtownwebdesign.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
        let personalizedHtml = newsletterHtml;
        
        // Replace both Zoho Campaigns format and template format
        personalizedHtml = personalizedHtml.replace(
          /\$\[LI:UNSUBSCRIBE\]\$/g,
          unsubscribeLink
        );
        // Replace {{SUBSCRIBER_EMAIL}} placeholder in unsubscribe links
        personalizedHtml = personalizedHtml.replace(
          /unsubscribe\?email=\{\{SUBSCRIBER_EMAIL\}\}/g,
          `unsubscribe?email=${encodeURIComponent(subscriber.email)}`
        );
        // Also replace standalone {{SUBSCRIBER_EMAIL}} if used elsewhere
        personalizedHtml = personalizedHtml.replace(
          /\{\{SUBSCRIBER_EMAIL\}\}/g,
          subscriber.email
        );

        // Send email via Zoho
        await zohoMailService.sendEmail(
          subscriber.email,
          subject,
          personalizedHtml
        );

        results.successful++;
        logger.info('Newsletter sent successfully', { email: subscriber.email });
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: subscriber.email,
          error: error.message
        });
        logger.error('Error sending newsletter to subscriber', {
          email: subscriber.email,
          error: error.message
        });
      }
    }

    logger.info('Newsletter sending completed', {
      total: results.total,
      successful: results.successful,
      failed: results.failed,
      testMode: isTestMode
    });

    const message = isTestMode 
      ? `Newsletter sent in TEST MODE to ${process.env.NEWSLETTER_TEST_EMAIL}.`
      : `Newsletter sent to ${results.successful} of ${results.total} subscribers.`;

    res.json({
      success: true,
      message: message,
      testMode: isTestMode,
      results: results
    });

  } catch (error) {
    logger.error('Error sending newsletter', {
      error: error.message,
      stack: error.stack,
      newsletterFile: newsletterFile
    });
    res.status(500).json({
      success: false,
      message: 'There was an error sending the newsletter. Please try again later.'
    });
  }
});

// Start the server and listen on the specified port
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  
  // Initialize database connection and tables
  await testConnection();
  await initializeDatabase();
});

// Add error handling middleware at the end of the file
app.use((err, req, res, next) => {
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body
  });
  
  res.status(500).send('An unexpected error occurred');
});
