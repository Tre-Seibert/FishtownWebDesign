const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');
const compression = require('compression');
const helmet = require('helmet');

// Define a port number
const port = 7000;

// Enable compression
app.use(compression());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://csimg.nyc3.cdn.digitaloceanspaces.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://csimg.nyc3.cdn.digitaloceanspaces.com", "https://fishtownwebdesign.com"],
      connectSrc: ["'self'", "http://127.0.0.1:1337"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Cache control headers
app.use((req, res, next) => {
  // Cache static assets for 1 week
  if (req.path.match(/\.(css|js|jpg|jpeg|png|gif|ico|webp)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
  // Cache HTML pages for 1 hour
  else if (req.path.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  // No cache for dynamic content
  else {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

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

// Function to generate the sitemap
async function generateSitemap() {
  try {
    const posts = await getPosts();
    const sitemap = new SitemapStream({ hostname: 'https://www.fishtownwebdesign.com' });

    // Add static pages with enhanced metadata
    sitemap.write({ 
      url: '/', 
      changefreq: 'monthly', 
      priority: 1.0,
      lastmod: new Date().toISOString()
    });
    sitemap.write({ 
      url: '/about', 
      changefreq: 'monthly', 
      priority: 0.8,
      lastmod: new Date().toISOString()
    });
    sitemap.write({ 
      url: '/pricing', 
      changefreq: 'monthly', 
      priority: 0.8,
      lastmod: new Date().toISOString()
    });
    sitemap.write({ 
      url: '/contact', 
      changefreq: 'monthly', 
      priority: 0.8,
      lastmod: new Date().toISOString()
    });
    sitemap.write({ 
      url: '/terms-of-service', 
      changefreq: 'yearly', 
      priority: 0.5,
      lastmod: new Date().toISOString()
    });
    sitemap.write({ 
      url: '/privacy-policy', 
      changefreq: 'yearly', 
      priority: 0.5,
      lastmod: new Date().toISOString()
    });
    sitemap.write({ 
      url: '/faq', 
      changefreq: 'monthly', 
      priority: 0.7,
      lastmod: new Date().toISOString()
    });
    sitemap.write({ 
      url: '/blog', 
      changefreq: 'weekly', 
      priority: 0.9,
      lastmod: new Date().toISOString()
    });

    // Add blog posts with enhanced metadata
    posts.forEach(post => {
      sitemap.write({
        url: `/blog/${post.slug}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: post.publishedDate || new Date().toISOString(),
        news: {
          publication: {
            name: 'Fishtown Web Design Blog',
            language: 'en'
          },
          publication_date: post.publishedDate || new Date().toISOString(),
          title: post.title,
          keywords: post.categories.join(', ')
        }
      });
    });

    sitemap.end();
    cachedSitemap = await streamToPromise(sitemap).then(data => data.toString());
    return cachedSitemap;
  } catch (error) {
    console.error('Error generating sitemap:', error);
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

// Fetch all posts from Strapi, sorted by publishedDate ascending
// Fetch all posts from Strapi, sorted by publishedDate ascending
async function getPosts(categoryFilter = null) {
  try {
    let url = 'http://127.0.0.1:1337/api/posts?populate=categories&sort=publishedDate:desc&publicationState=live';
    if (categoryFilter) {
      url += `&filters[categories][name][$eq]=${encodeURIComponent(categoryFilter)}`;
    }
    console.log('Fetching posts from:', url);
    const response = await axios.get(url);
    // console.log('Raw posts response:', JSON.stringify(response.data, null, 2));
    if (!response.data || !Array.isArray(response.data.data)) {
      console.error('Invalid posts response:', response.data);
      return [];
    }
    return response.data.data.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      publishedDate: post.publishedDate, // Note: using publishedDate, not publishedAt
      categories: post.categories.map(cat => cat.name) // Direct array of categories
    }));
  } catch (error) {
    console.error('Error fetching posts:', error.response?.data || error.message);
    return [];
  }
}

// Fetch unique categories from Strapi
async function getCategories() {
  try {
    const response = await axios.get('http://127.0.0.1:1337/api/categories');
    // console.log('Raw categories response:', JSON.stringify(response.data, null, 2));
    if (!response.data || !Array.isArray(response.data.data)) {
      console.error('Invalid categories response:', response.data);
      return [];
    }
    return response.data.data.map(category => category.name);
  } catch (error) {
    console.error('Error fetching categories:', error.response?.data || error.message);
    return [];
  }
}

// Blog index route with pagination
app.get('/blog', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // posts per page
    const categoryFilter = req.query.category || null;
    
    // Get all posts for the current category
    const allPosts = await getPosts(categoryFilter);
    
    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalPages = Math.ceil(allPosts.length / limit);
    
    // Get posts for current page
    const posts = allPosts.slice(startIndex, endIndex);
    const categories = await getCategories();
    
    res.render('blog-index', { 
      posts, 
      categories, 
      selectedCategory: categoryFilter,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      }
    });
  } catch (error) {
    console.error('Blog route error:', error);
    res.status(500).send('Something went wrong.');
  }
});

// Single post route with enhanced metadata
app.get('/blog/:slug', async (req, res) => {
  try {
    const url = `http://127.0.0.1:1337/api/posts?filters[slug][$eq]=${req.params.slug}&populate=categories`;
    const response = await axios.get(url);
    const post = response.data.data[0];
    
    if (!post) return res.status(404).send('Post not found');
    
    // Add canonical URL and meta tags
    const canonicalUrl = `https://www.fishtownwebdesign.com/blog/${post.slug}`;
    const metaTags = {
      title: `${post.title} | Fishtown Web Design Blog`,
      description: post.excerpt || post.content.substring(0, 160),
      keywords: post.categories.join(', '),
      canonical: canonicalUrl,
      ogTitle: post.title,
      ogDescription: post.excerpt || post.content.substring(0, 160),
      ogType: 'article',
      articlePublishedTime: post.publishedDate,
      articleModifiedTime: post.updatedAt,
      articleAuthor: 'Fishtown Web Design',
      articleSection: post.categories.join(', ')
    };
    
    res.render('blog-post', { post, metaTags });
  } catch (error) {
    console.error('Single post error:', error.response?.data || error.message);
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
  '/public/philadelphia-web-design.html': '/', // TO DEL in like 2 months 5/18/25
  '/public/web-design-near-me.html': '/',
  '/public/affordable-website-design-philadelphia.html': '/',
  '/public/philadelphia-web-design-firm.html': '/',
  '/public/web-designer-philadelphia.html': '/',
  '/public/internet-marketing-fishtown.html': '/'
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
app.get('/philadelphia-web-design', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')));
app.get('/web-design-near-me', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')));
app.get('/affordable-website-design-philadelphia', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')));
app.get('/philadelphia-web-design-firm', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')));
app.get('/web-designer-philadelphia', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')));
app.get('/internet-marketing-fishtown', (req, res) => res.sendFile(path.join(__dirname, 'public/home.html')));

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
