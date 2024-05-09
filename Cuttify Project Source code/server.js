const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');

// Create Express app
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
  secret: 'users',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Note: secure should be true if you are using https
}));

// Create a connection to the database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'myform', // Change to your database name
  port: '3306'
});

// Connect to the database
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database');
});

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Signup operation
app.post('/signup', (req, res) => {
  const { name, number, username, password } = req.body;
  const sql = 'INSERT INTO users (name, number, username, password) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, number, username, password], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Error signing up' });
    } else {
      res.status(200).json({ message: 'Signup successful' });
    }
  });
});

// Create a global variable to store the username
let currentUsername = null;

// Store the username in the global variable after a successful login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Error logging in' });
    } else {
      if (result.length > 0) {
        // Store the username in the global variable
        currentUsername = username;
        // Send the user data if login successful
        res.status(200).json({ message: 'Login successful', user: result[0] });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    }
  });
});


// Profile creation operation
app.post('/profile', upload.single('profilePicture'), (req, res) => {
  const { name, dob, email, phone, gender } = req.body;
  const profilePicture = req.file.filename; // Uploaded profile picture filename

  const sql = 'INSERT INTO profiles (name, dob, email, phone, gender, profile_picture) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [name, dob, email, phone, gender, profilePicture], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Error creating profile' });
    } else {
      res.status(200).json({ message: 'Profile created successfully' });
    }
  });
});

// Signup operation
app.post('/adminsignup', (req, res) => {
  const { name, number, username, password } = req.body;
  const sql = 'INSERT INTO adminusers (name, number, username, password) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, number, username, password], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Error signing up' });
    } else {
      res.status(200).json({ message: 'Signup successful' });
    }
  });
});

// Login operation
app.post('/adminlogin', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM adminusers WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Error logging in' });
    } else {
      if (result.length > 0) {
        // Send the user data if login successful
        res.status(200).json({ message: 'Login successful', user: result[0] });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    }
  });
});

// Profile creation operation
app.post('/adminprofile', (req, res) => {
  const { name, shopname, dob, email, phone, address, gender } = req.body;
  const sql = 'INSERT INTO adminprofiles (name, shopname, dob, email, phone, address, gender) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [name, shopname, dob, email, phone, address, gender], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Error signing up' });
    } else {
      res.status(200).json({ message: 'Signup successful' });
    }
  });
});

var transporter = nodemailer.createTransport({
  service: 'Outlook365',
  auth: {
    user: 'akilsadik.21ads@sonatech.ac.in',
    pass: 'Akil@786'
  },
  tls: { rejectUnauthorized: false }
});

app.post("/book", function (req, res) {
  let service = req.body.service;
  let time = req.body.time;
  let salonName = req.body.salonName;
  let username = currentUsername; // Get the username from the global variable

  // Query the database for the user's details
  const userQuery = 'SELECT * FROM users WHERE username = ?';
  db.query(userQuery, [username], (userErr, userResult) => {
    if (userErr) {
      console.log(userErr);
      return res.status(500).send('Failed to retrieve user details.');
    }
    if (userResult.length === 0) {
      return res.status(404).send('User not found.');
    }

    // Extract user details
    const userDetails = userResult[0];
    let userMessage = `Saloon booked on ${salonName} at ${time} for ${service} by ${userDetails.name} (Contact: ${userDetails.number}).<br><br> 
    User Details:<br>
    Name: ${userDetails.name}<br>
    Number: ${userDetails.number}<br>
    Username: ${userDetails.username}<br>
    Thank you for choosing our service, we hope to see you in saloon.`;

    var userMailOptions = {
      from: 'akilsadik.21ads@sonatech.ac.in',
      to: username,
      subject: 'Saloon Booking Successful',
      html: userMessage
    };

    transporter.sendMail(userMailOptions, function (mailError, info) {
      if (mailError) {
        console.log(mailError);
        res.status(500).send('Failed to book appointment. Please try again later.');
      } else {
        console.log('User email sent: ' + info.response);
        // Reset the global username variable
        currentUsername = null;

        // Query the database for the salon owner's email using salon name
        const adminQuery = 'SELECT email FROM adminprofiles WHERE shopname = ?';
        db.query(adminQuery, [salonName], (adminErr, adminResult) => {
          if (adminErr) {
            console.log(adminErr);
            return res.status(500).send('Failed to retrieve salon owner details.');
          }
          if (adminResult.length === 0) {
            return res.status(404).send('Salon owner not found.');
          }

          // Extract salon owner details
          const adminDetails = adminResult[0];
          const adminEmail = adminDetails.email;

          // Construct email message for salon owner
          let adminMessage = `Saloon booked on ${salonName} at ${time} for ${service} by ${username}.<br><br> 
          User Details:<br>
          Name: ${userDetails.name}<br>
          Number: ${userDetails.number}<br>
          Username: ${userDetails.username}<br>
          Thank you for choosing our service, we hope to see you in saloon.`;

          var adminMailOptions = {
            from: 'akilsadik.21ads@sonatech.ac.in',
            to: adminEmail, // Use salon owner's email
            subject: 'New Saloon Booking',
            html: adminMessage
          };

          // Send email to salon owner
          transporter.sendMail(adminMailOptions, function (mailError, info) {
            if (mailError) {
              console.log(mailError);
              // You might want to handle this error differently
            } else {
              console.log('Email sent to salon owner: ' + info.response);
            }
          });

          // Send response back to the client
          res.status(200).send('Appointment booked successfully!');
        });
      }
    });
  });
});



  var transporter = nodemailer.createTransport({
    service: 'Outlook365',
    auth: {
      user: 'akilsadik.21ads@sonatech.ac.in',
      pass: 'Akil@786'
    },
    tls: { rejectUnauthorized: false }
  });

  // Endpoint to handle booking appointment
  app.post("/bookings", function (req, res) {
    let service = req.body.service;
    let time = req.body.time;
    let salonName = req.body.salonName;

    let message = "Saloon booked on " + salonName + " at " + time + " for " + service + "<br><br> Thank you for choosing our service, we hope to see you in saloon";

    var mailOptions = {
      from: 'akilsadik.21ads@sonatech.ac.in',
      to: 'akilsadik2004@gmail.com',
      subject: 'Saloon Booking Recieved',
      html: message
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        res.status(500).send('Failed to book appointment. Please try again later.');
      } else {
        console.log('Email sent: ' + info.response);
        res.status(200).send('Appointment booked successfully!');
      }
    });
  });

  // Start the server
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
