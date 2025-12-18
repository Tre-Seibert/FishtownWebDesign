require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');
const { pool, testConnection, initializeDatabase } = require('./public/scripts/database');

// Define a port number
const port = 7000;

app.use(express.json());

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
      { url: '/seo', changefreq: 'monthly', priority: 0.8 }
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

// Proxy API requests to Strapi running at localhost:1337
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:1337', // Strapi API URL
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove '/api' from the URL before sending to Strapi
  },
}));

const axios = require('axios');
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

// Redirect /tos to /terms-of-service
app.get('/tos', (req, res) => {
  res.redirect(301, '/terms-of-service');
});

// Return 410 Gone for old /public/*.html direct access attempts (not covered by redirects above)
app.get('/public/*.html', (req, res) => {
  logger.info('410 Gone returned for old public URL', { url: req.url });
  res.set('X-Robots-Tag', 'noindex');
  res.status(410).send('This page has permanently moved. Please visit our <a href="/">homepage</a>.');
});

// Return 410 Gone for old/deleted pages
const deletedPages = [
  '/blog/philly-site-speed-hacks',
  '/blog/fishtownwebdesign.com',
  '/blog/seo-blog-',
  '/services',
  '/blog/link',
  '/subscribe-newsletter',
  '/affordable-website-design-philadelphia',
  '/blog/building-a-blog-with-strapi-and-node-js',
  '/blog/why-trade-business-owners-need-a-blog-seo-tips-for-painters-contractors',
  '/blog/discover-fishtown-philadelphia-a-vibrant-neighborhood-and-the-evil-genius-block-party-experience',
  '/philadelphia-web-design-firm',
  '/internet-marketing-fishtown',
  '/web-designer-philadelphia',
  '/views/blog',
  '/philadelphia-web-design',
  '/web-design-near-me',
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
app.get('/terms-of-service', (req, res) => res.sendFile(path.join(__dirname, 'public/tos.html')));
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(__dirname, 'public/pp.html')));
app.get('/faq', (req, res) => res.sendFile(path.join(__dirname, 'public/faq.html')));
app.get('/web-design', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design.html')));
app.get('/seo', (req, res) => res.sendFile(path.join(__dirname, 'public/seo.html')));
app.get('/unsubscribe', (req, res) => res.sendFile(path.join(__dirname, 'public/unsubscribe.html')));

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
      return res.status(200).send('OK');
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
    // Redirect to success so the modal opens
    return res.redirect(303, '/questionnaire#success');
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
        return res.redirect(303, '/questionnaire#success');
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
    return res.status(500).json({ success: false, message: 'There was an error submitting your questionnaire.' });
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
