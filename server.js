const express = require('express');
const path = require('path');
const app = express(); // library building web apps for node js 


// Define a port number
const port = process.env.PORT || 7000;

app.use(express.json());

// Define the public directory to serve static files
app.use(express.static(path.join(__dirname, '/')));

// Serve node_modules as static files
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));


// Define a route for the root URL
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// route for about page
app.get('/kaili', (req, res) => {
  res.sendFile(__dirname + '/public/kaili.html');
});

// route for booking page
app.get('/camille', (req, res) => {
  res.sendFile(__dirname + '/public/camille.html');
});

// route for about page
app.get('/about', (req, res) => {
  res.sendFile(__dirname + '/public/kaili.html');
});



// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
