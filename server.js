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

// Define the public directory to serve static files
app.use(express.static(path.join(__dirname, 'public')));



// Serve node_modules as static files
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));


// Define a route for the root URL
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
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
