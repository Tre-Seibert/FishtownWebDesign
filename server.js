const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');

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

    // Add blog posts
    posts.forEach(post => {
      sitemap.write({
        url: `/blog/${post.slug}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: post.publishedDate || new Date().toISOString(),
      });
    });
    logger.info('Added blog posts to sitemap', { postCount: posts.length });

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

// Blog index route
app.get('/blog', async (req, res) => {
  try {
    const categoryFilter = req.query.category || null;
    logger.info('Blog index request received', { categoryFilter });
    
    const posts = await getPosts(categoryFilter);
    const categories = await getCategories();
    
    logger.info('Rendering blog index', {
      postCount: posts.length,
      categoryCount: categories.length,
      selectedCategory: categoryFilter
    });
    
    res.render('blog-index', { posts, categories, selectedCategory: categoryFilter });
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
    
    const url = `http://127.0.0.1:1337/api/posts?filters[slug][$eq]=${slug}&populate=categories&populate=featuredImage`;
    const response = await axios.get(url);
    
    if (!response.data.data || response.data.data.length === 0) {
      logger.warn('Post not found', { slug });
      return res.status(404).send('Post not found');
    }
    
    const post = response.data.data[0];
    // Process the featured image like we do in getPosts
    if (post.featuredImage) {
      post.featuredImage = {
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
      hasCategories: post.categories?.length > 0,
      hasContent: !!post.content,
      hasFeaturedImage: !!post.featuredImage
    });
    
    res.render('blog-post', { post });
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

// Filter Posts by Category Route using category slug
app.get('/blog/category/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    // Fetch posts filtered by the category slug
    const response = await axios.get(`http://127.0.0.1:1337/api/posts?filters[category][slug][$eq]=${slug}&populate=categories`);
    const posts = response.data.data;

    // Fetch the category data for display
    const categoryResponse = await axios.get(`http://127.0.0.1:1337/api/categories?filters[slug][$eq]=${slug}`);
    const category = categoryResponse.data.data[0];

    if (category) {
      res.render('blog-index', { category, posts });
    } else {
      res.status(404).send('Category not found.');
    }
  } catch (error) {
    console.error('Error fetching category or posts:', error);
    res.status(500).send('Error fetching category or posts from Strapi.');
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

require('dotenv').config(); // Loads environment variables from .env file
//// Configure Nodemailer with Zoho SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com', // For paid organization users
  port: 465,               // SSL port
  secure: true,            // Use SSL
  auth: {
    user: process.env.EMAIL_USER, // Fetch the email address from .env
    pass: process.env.EMAIL_PASS, // Fetch the app password from .env
  },
});

// Route to handle form submissions
app.post('/submit-appointment', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !phone || !message) {
      return res.status(400).send('All fields are required.');
  }

  const mailOptions = {
      from: '"Fishtown Web Designs" <info@fishtownwebdesign.com>',
      to: 'info@fishtownwebdesign.com',
      subject: 'New Appointment Request',
      text: `
      You have received a new appointment request:
      Name: ${name}
      Email: ${email}
      Phone: ${phone}
      Message: ${message}
      `,
  };

  try {
      await transporter.sendMail(mailOptions);
      res.send('Your appointment request has been submitted successfully!');
  } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).send('There was an error submitting your appointment request.');
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
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
