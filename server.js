const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const axios = require('axios');

// Define a port number
const port = 7000;

app.use(express.json());

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Define the public directory to serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));


// Serve node_modules as static files
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));


app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/home.html'));
});



const redirects = {
  '/public/home.html': '/',
  '/public/contact.html': '/contact',
  '/public/about.html': '/about',
  '/public/pricing.html': '/pricing',
  '/public/terms-of-service.html': '/terms-of-service',
  '/public/pp.html': '/privacy-policy',
  '/public/philadelphia-web-design.html': '/philadelphia-web-design',
  '/public/web-design-near-me.html': '/web-design-near-me',
  '/public/affordable-website-design-philadelphia.html': '/affordable-website-design-philadelphia',
  '/public/philadelphia-web-design-firm.html': '/philadelphia-web-design-firm',
  '/public/web-designer-philadelphia.html': '/web-designer-philadelphia',
};

Object.keys(redirects).forEach((oldPath) => {
  app.get(oldPath, (req, res) => {
      res.redirect(301, redirects[oldPath]);
  });
});


// Define a route for the root URL
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});


// route for about page
app.get('/about', (req, res) => {
  res.sendFile(__dirname + '/public/about.html');
});

// route for pricing page
app.get('/pricing', (req, res) => {
  res.sendFile(__dirname + '/public/pricing.html');
});

// route for contact page
app.get('/contact', (req, res) => {
  res.sendFile(__dirname + '/public/contact.html');
});

// route for tos page
app.get('/terms-of-service', (req, res) => {
  res.sendFile(__dirname + '/public/tos.html');
});

// route for privacy policy page
app.get('/privacy-policy', (req, res) => {
  res.sendFile(__dirname + '/public/pp.html');
});

// route for privacy policy page
app.get('/pp', (req, res) => {
  res.sendFile(__dirname + '/public/pp.html');
});

// route for philadelphia-web-design landing page (SEO)
app.get('/philadelphia-web-design', (req, res) => {
  res.sendFile(__dirname + '/public/philadelphia-web-design.html');
});

// route for web-design-near-me landing page (SEO)
app.get('/web-design-near-me', (req, res) => {
  res.sendFile(__dirname + '/public/web-design-near-me.html');
});


// route for affordable-website-design-philadelphia landing page (SEO)
app.get('/affordable-website-design-philadelphia', (req, res) => {
  res.sendFile(__dirname + '/public/affordable-website-design-philadelphia.html');
});


// route for philadelphia-web-design-firm landing page (SEO)
app.get('/philadelphia-web-design-firm', (req, res) => {
  res.sendFile(__dirname + '/public/philadelphia-web-design-firm.html');
});


// route for web-designer-philadelphia landing page (SEO)
app.get('/web-designer-philadelphia', (req, res) => {
  res.sendFile(__dirname + '/public/web-designer-philadelphia.html');
});

// Route to fetch blog posts
app.get('/blogs', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:1337/api/blogs'); // Use await to handle the async call
    res.json(response.data);  // Send the data as a JSON response
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching blog posts');
  }
});


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
      from: '"Fishtown Web Designs" <sales@fishtownwebdesign.com>',
      to: 'sales@fishtownwebdesign.com',
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
