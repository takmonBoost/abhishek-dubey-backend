require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST'],
}));

// Environment Variables
const {
  MERCHANT_KEY,
  MERCHANT_ID,
  REDIRECT_URL,
  SUCCESS_URL,
  FAILURE_URL,
  PROD_URL,
  PROD_STATUS_URL,
  MAIL_HOST,
  EMAIL_USER,
  EMAIL_PASS,
  OWNER_EMAIL,
  PORT,
} = process.env;

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host:MAIL_HOST,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Create Order Endpoint
app.post('/create-order', async (req, res) => {
  const {
    name,
    phone,
    email,
    amount,
    dob,
    placeOfBirth,
    timeOfBirth,
    gender,
    language,
    age,
    whatsapp,
    questions,
  } = req.body;

  console.log("Received Form Data: ", req.body);

  // Check for mandatory fields
  if (!name || !phone || !email || !amount) {
    return res.status(400).json({ error: 'Invalid input data.' });
  }

  const orderId = uuidv4();

  // Payment payload including all fields from req.body
  const paymentPayload = {
    merchantId: MERCHANT_ID,
    merchantUserId: name,
    mobileNumber: phone,
    amount: amount * 100,
    merchantTransactionId: orderId,
    redirectUrl: `${REDIRECT_URL}?id=${orderId}`,
    paymentInstrument: { type: 'PAY_PAGE' },
    userDetails: {
      dob,
      placeOfBirth,
      timeOfBirth,
      gender,
      language,
      age,
      whatsapp,
      questions,
    },
  };

  const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  const hash = crypto.createHash('sha256').update(payload + '/pg/v1/pay' + MERCHANT_KEY).digest('hex');
  const checksum = `${hash}###1`;

  try {
    const response = await axios.post(PROD_URL, { request: payload }, {
      headers: {
        'X-VERIFY': checksum,
        'Content-Type': 'application/json',
      },
    });

    const redirectUrl = response.data.data?.instrumentResponse?.redirectInfo?.url;
    if (redirectUrl) {
      res.status(200).json({ url: redirectUrl });
    } else {
      res.status(500).json({ error: 'Failed to generate payment link.' });
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Payment initiation failed.' });
  }
});

// Payment Status Endpoint
 app.post('/status', async (req, res) => {
  const merchantTransactionId = req.query.id;
  const {
    name,
    phone,
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
    console.log("API Response:", response.data);

    if (response.data.success) {
      console.log("Payment Successful:", response.data);
      const userDetails = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
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
        to: OWNER_EMAIL,
        subject: 'New Successful Payment Received',
        html: `<h3>New Payment Details</h3>${userDetails}`,
      }).then(() => {
        console.log('Payment details email sent to owner successfully.');
      }).catch((error) => {
        console.error('Error sending email to owner:', error);
      });

      // Email to user
      await transporter.sendMail({
        from: EMAIL_USER,
        to: email,
        subject: 'Payment Successful',
        html: `<p>Dear ${name},</p><p>Your payment of ₹${amount} was successful. Thank you!</p>`,
      }).then(() => {
        console.log('Payment success email sent to user successfully.');
      }).catch((error) => {
        console.error('Error sending email to user:', error);
      });

      res.redirect(SUCCESS_URL);  // Redirect to success page after successful payment
    } else {
      res.redirect(FAILURE_URL);  // Redirect to failure page if payment not successful
    }
  } catch (error) {
    console.error("Status error:", error);
    res.redirect(FAILURE_URL);  // Redirect to failure page on error
  }
});

// Default Route
app.get('/', (req, res) => res.send('Welcome to the Payment API! yes'));

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
