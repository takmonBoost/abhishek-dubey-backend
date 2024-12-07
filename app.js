


// require('dotenv').config();
// const express = require('express');
// const axios = require('axios');
// const crypto = require('crypto');
// const cors = require("cors");
// const nodemailer = require('nodemailer');
// const { v4: uuidv4 } = require('uuid');

// const app = express();

// // Middleware
// app.use(express.json());
// app.use(cors({
//   origin: "*",
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true,
// }));

// // Environment variables
// const {
//   MERCHANT_KEY,
//   MERCHANT_ID,
//   REDIRECT_URL,
//   SUCCESS_URL,
//   FAILURE_URL,
//   PROD_URL,
//   PROD_STATUS_URL,
//   EMAIL_USER,
//   EMAIL_PASS,
//   PORT
// } = process.env;

// // Email transporter configuration
// const transporter = nodemailer.createTransport({
//   service: 'Gmail',
//   auth: {
//     user: EMAIL_USER,
//     pass: EMAIL_PASS,
//   },
// });

// // Create Order Endpoint
// app.post('/create-order', async (req, res) => {
//   const { name, mobileNumber, email, amount } = req.body;

//   const orderId = uuidv4();
//   const paymentPayload = {
//     merchantId: MERCHANT_ID,
//     merchantUserId: name,
//     mobileNumber,
//     amount: amount * 100,
//     merchantTransactionId: orderId,
//     redirectUrl: `${REDIRECT_URL}/?id=${orderId}`,
//     redirectMode: 'POST',
//     paymentInstrument: { type: 'PAY_PAGE' }
//   };

//   const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
//   const string = payload + '/pg/v1/pay' + MERCHANT_KEY;
//   const sha256 = crypto.createHash('sha256').update(string).digest('hex');
//   const checksum = sha256 + '###1';

//   const options = {
//     method: 'POST',
//     url: PROD_URL,
//     headers: {
//       accept: 'application/json',
//       'Content-Type': 'application/json',
//       'X-VERIFY': checksum,
//     },
//     data: { request: payload },
//   };

//   try {
//     const response = await axios.request(options);
//     const redirectUrl = response.data.data?.instrumentResponse?.redirectInfo?.url;

//     if (redirectUrl) {
//       res.status(200).json({ msg: "OK", url: redirectUrl });
//     } else {
//       res.status(500).json({ error: "Failed to initiate payment" });
//     }
//   } catch (error) {
//     console.error("Payment initiation error:", error);
//     res.status(500).json({ error: "Payment initiation failed" });
//   }
// });

// // Payment Status Endpoint
// app.post('/status', async (req, res) => {
//   const merchantTransactionId = req.query.id;
//   const { name, email, amount } = req.body;
//   console.log( "incoming status code",req.body);

//   const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
//   const sha256 = crypto.createHash('sha256').update(string).digest('hex');
//   const checksum = sha256 + '###1';

//   const options = {
//     method: 'GET',
//     url: `${PROD_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
//     headers: {
//       accept: 'application/json',
//       'Content-Type': 'application/json',
//       'X-VERIFY': checksum,
//       'X-MERCHANT-ID': MERCHANT_ID,
//     },
//   };

//   try {
//     const response = await axios.request(options);

//     if (response.data.success) {
//       const emailContent = `<p>Dear ${name},</p><p>Payment of ₹${amount} was successful.</p>`;
//       await transporter.sendMail({
//         from: EMAIL_USER,
//         to: email,
//         subject: 'Payment Successful',
//         html: emailContent,
//       });
//       res.redirect(SUCCESS_URL);
//     } else {
//       res.redirect(FAILURE_URL);
//     }
//   } catch (error) {
//     console.error("Status error:", error);
//     res.redirect(FAILURE_URL);
//   }
// });

// app.get('/', (req, res) => res.send('Welcome to the Payment API!'));

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require("cors");
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Environment variables
const {
  MERCHANT_KEY,
  MERCHANT_ID,
  REDIRECT_URL,
  SUCCESS_URL,
  FAILURE_URL,
  PROD_URL,
  PROD_STATUS_URL,
  EMAIL_USER,
  EMAIL_PASS,
  OWNER_EMAIL,
  PORT
} = process.env;

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Create Order Endpoint
app.post('/create-order', async (req, res) => {
  console.log("incoming data: " + req.body);
  const { name, mobileNumber, email, amount } = req.body;

  const orderId = uuidv4();
  const paymentPayload = {
    merchantId: MERCHANT_ID,
    merchantUserId: name,
    mobileNumber,
    amount: amount * 100,
    merchantTransactionId: orderId,
    redirectUrl: `${REDIRECT_URL}/?id=${orderId}`,
    redirectMode: 'POST',
    paymentInstrument: { type: 'PAY_PAGE' }
  };

  const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  const string = payload + '/pg/v1/pay' + MERCHANT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const checksum = sha256 + '###1';

  const options = {
    method: 'POST',
    url: PROD_URL,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
    },
    data: { request: payload },
  };

  try {
    const response = await axios.request(options);
    const redirectUrl = response.data.data?.instrumentResponse?.redirectInfo?.url;

    if (redirectUrl) {
      res.status(200).json({ msg: "OK", url: redirectUrl });
    } else {
      res.status(500).json({ error: "Failed to initiate payment" });
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ error: "Payment initiation failed" });
  }
});

// Payment Status Endpoint
app.post('/status', async (req, res) => {
  const merchantTransactionId = req.query.id;
  const {
    name,
    mobileNumber,
    email,
    dob,
    placeOfBirth,
    timeOfBirth,
    gender,
    language,
    age,
    whatsapp,
    questions,
    amount
  } = req.body;

  const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const checksum = sha256 + '###1';

  const options = {
    method: 'GET',
    url: `${PROD_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': MERCHANT_ID,
    },
  };

  try {
    const response = await axios.request(options);

    if (response.data.success) {
      const userDetails = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${mobileNumber}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date of Birth:</strong> ${dob}</p>
        <p><strong>Place of Birth:</strong> ${placeOfBirth}</p>
        <p><strong>Time of Birth:</strong> ${timeOfBirth}</p>
        <p><strong>Gender:</strong> ${gender}</p>
        <p><strong>Language:</strong> ${language}</p>
        <p><strong>Age:</strong> ${age}</p>
        <p><strong>WhatsApp:</strong> ${whatsapp}</p>
        <p><strong>Questions/Requirements:</strong> ${questions}</p>
        <p><strong>Amount Paid:</strong> ₹${amount}</p>
      `;

      // Email to owner
      await transporter.sendMail({
        from: EMAIL_USER,
        to: OWNER_EMAIL, // Now fetched from .env file
        subject: 'New Successful Payment Received',
        html: `<h3>New Payment Details</h3>${userDetails}`,
      });

      // Email to user
      await transporter.sendMail({
        from: EMAIL_USER,
        to: email,
        subject: 'Payment Successful',
        html: `<p>Dear ${name},</p><p>Your payment of ₹${amount} was successful. Thank you!</p>`
      });

      res.redirect(SUCCESS_URL);
    } else {
      res.redirect(FAILURE_URL);
    }
  } catch (error) {
    console.error("Status error:", error);
    res.redirect(FAILURE_URL);
  }
});

// Default Route
app.get('/', (req, res) => res.send('Welcome to the Payment API!'));

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
