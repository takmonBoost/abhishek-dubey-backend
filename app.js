// require('dotenv').config();
// const express = require('express');
// const axios = require('axios');
// const crypto = require('crypto');
// const cors = require("cors");
// const { v4: uuidv4 } = require('uuid');

// const app = express();

// app.use(express.json());

// app.use(cors({
//   origin: "*", // No trailing slash
//   methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowing the necessary methods
//   // Allowing necessary headers
//   credentials: true, // Allow cookies and credentials (if needed)
// }));

// // Environment variables from .env file
// const MERCHANT_KEY = process.env.MERCHANT_KEY;
// const MERCHANT_ID = process.env.MERCHANT_ID;
// const redirectUrl = process.env.REDIRECT_URL;
// const successUrl = process.env.SUCCESS_URL;
// const failureUrl = process.env.FAILURE_URL;
// const prod_URL = process.env.PROD_URL;
// const prod_STATUS_URL = process.env.PROD_STATUS_URL;

// app.post('/create-order', async (req, res) => {
//   console.log("Received data:", req.body);
//   const {
//     name,
//     mobileNumber,
//     email,
//     dob,
//     placeOfBirth,
//     timeOfBirth,
//     gender,
//     language,
//     age,
//     whatsapp,
//     questions,
//     amount
//   } = req.body;

//   const orderId = uuidv4();

//   // Log received data for verification
//   console.log("Incoming Data:", req.body);

//   // Payment payload for PhonePe
//   const paymentPayload = {
//     merchantId: MERCHANT_ID,
//     merchantUserId: name,
//     mobileNumber: mobileNumber,
//     amount: amount * 100, // Convert to smallest currency unit
//     merchantTransactionId: orderId,
//     redirectUrl: `${redirectUrl}/?id=${orderId}`,
//     redirectMode: 'POST',
//     paymentInstrument: {
//       type: 'PAY_PAGE'
//     }
//   };

//   const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
//   const string = payload + '/pg/v1/pay' + MERCHANT_KEY;
//   const sha256 = crypto.createHash('sha256').update(string).digest('hex');
//   const checksum = sha256 + '###' + 1;

//   const option = {
//     method: 'POST',
//     url: prod_URL,
//     headers: {
//       accept: 'application/json',
//       'Content-Type': 'application/json',
//       'X-VERIFY': checksum,
//     },
//     data: { request: payload }
//   };

//   try {
//     const response = await axios.request(option);

//     // Optional: Save form data and transaction details to database
//     console.log("PhonePe Response:", response.data);

//     if (response.data.data.instrumentResponse.redirectInfo.url) {
//       res.status(200).json({
//         msg: "OK",
//         url: response.data.data.instrumentResponse.redirectInfo.url,
//       });
//     } else {
//       res.status(500).json({ error: "Failed to initiate payment" });
//     }
//   } catch (error) {
//     console.error("Error in payment:", error);
//     res.status(500).json({ error: "Payment initiation failed" });
//   }
// });


// app.post('/status', async (req, res) => {
//   const merchantTransactionId = req.query.id;

//   // Create checksum for status check
//   const keyIndex = 1;
//   const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
//   const sha256 = crypto.createHash('sha256').update(string).digest('hex');
//   const checksum = sha256 + '###' + keyIndex;

//   // Status check API options
//   const option = {
//     method: 'GET',
//     url: `${prod_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
//     headers: {
//       accept: 'application/json',
//       'Content-Type': 'application/json',
//       'X-VERIFY': checksum,
//       'X-MERCHANT-ID': MERCHANT_ID
//     },
//   };

//   try {
//     const response = await axios.request(option);
//     if (response.data.success === true) {
//       return res.redirect(successUrl);
//     } else {
//       return res.redirect(failureUrl);
//     }
//   } catch (error) {
//     console.log("Error in payment status", error);
//     res.redirect(failureUrl);
//   }
// });

// app.get('/', (req, res) => {
//   res.send('Welcome to the Payment API!');
// });

// app.listen(process.env.PORT, () => {
//   console.log(`Server is running on port ${process.env.PORT}`);
// });



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
  const { name, email, amount } = req.body;

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
      const emailContent = `<p>Dear ${name},</p><p>Payment of ₹${amount} was successful.</p>`;
      await transporter.sendMail({
        from: EMAIL_USER,
        to: email,
        subject: 'Payment Successful',
        html: emailContent,
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

app.get('/', (req, res) => res.send('Welcome to the Payment API!'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
