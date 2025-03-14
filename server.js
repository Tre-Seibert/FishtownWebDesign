const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');

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

// Serve node_modules as static files (if needed)
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// server site map
app.use('/sitemap.xml', express.static(path.join(__dirname, 'sitemap.xml')));

// Proxy API requests to Strapi running at localhost:1337
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:1337', // Strapi API URL
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove '/api' from the URL before sending to Strapi
  },
}));

const axios = require('axios');

// Define a function to fetch posts from Strapi
async function getPosts() {
  try {
    const response = await axios.get('http://127.0.0.1:1337/api/posts'); // Fetch posts
    return response.data.data; // Return array of posts
  } catch (error) {
    console.error('Error fetching posts:', error);
    return []; // Return an empty array on error
  }
}

app.get('/blog', async (req, res) => {
  try {
      const posts = await getPosts(); // Example of fetching posts
      console.log(posts);  // Log the posts to check the structure
      res.render('blog-index', { posts });
  } catch (error) {
      console.error(error);
      res.status(500).send('Something went wrong.');
  }
});


// Individual Post Route using slug
app.get('/blog/:slug', async (req, res) => {
  const slug = req.params.slug;

  try {
      const response = await axios.get(`http://127.0.0.1:1337/api/posts?filters[slug][$eq]=${slug}&populate=*`);
      const post = response.data.data[0]; // Assuming you have a single post with that slug

      console.log(post); // Log the post structure to check the data

      if (!post) {
          return res.status(404).send('Post not found');
      }

      res.render('blog-post', { post });
  } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).send('Error fetching blog post');
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


app.get('/posts', (req, res) => {
  axios.get('http://127.0.0.1:1337/api/posts')
    .then(response => {
      console.log(response.data);  // Log the full response
      res.json(response.data);  // Send the response to the client
    })
    .catch(error => {
      console.error("Error fetching posts:", error);
      res.status(500).send("Error fetching posts from Strapi.");
    });
});




// Redirects
const redirects = {
    '/public/home.html': '/',
    '/public/contact.html': '/contact',
    '/public/about.html': '/about',
    '/public/pricing.html': '/pricing',
    '/public/terms-of-service.html': '/terms-of-service',
    '/public/pp.html': '/privacy-policy',
    '/public/faq.html': '/faq'
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
