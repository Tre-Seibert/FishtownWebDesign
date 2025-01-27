const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();

// Define a port number
const port = 7000;

app.use(express.json());

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the /public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve node_modules as static files (if needed)
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// server site map
app.use('/sitemap.xml', express.static(path.join(__dirname, 'sitemap.xml')));


// Redirects
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
    '/public/internet-marketing-fishtown.html': '/internet-marketing-fishtown',
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
app.get('/philadelphia-web-design', (req, res) => res.sendFile(path.join(__dirname, 'public/philadelphia-web-design.html')));
app.get('/web-design-near-me', (req, res) => res.sendFile(path.join(__dirname, 'public/web-design-near-me.html')));
app.get('/affordable-website-design-philadelphia', (req, res) => res.sendFile(path.join(__dirname, 'public/affordable-website-design-philadelphia.html')));
app.get('/philadelphia-web-design-firm', (req, res) => res.sendFile(path.join(__dirname, 'public/philadelphia-web-design-firm.html')));
app.get('/web-designer-philadelphia', (req, res) => res.sendFile(path.join(__dirname, 'public/web-designer-philadelphia.html')));
app.get('/internet-marketing-fishtown', (req, res) => res.sendFile(path.join(__dirname, 'public/internet-marketing-fishtown.html')))
app.get('/faq', (req, res) => res.sendFile(path.join(__dirname, 'public/faq.html')))


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
