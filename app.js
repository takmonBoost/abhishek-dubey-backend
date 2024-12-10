const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ['GET', 'POST'],
  })
);

// Environment Variables
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
  PORT,
} = process.env;

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Helper function to send emails
async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error.message);
  }
}
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

  console.log('Received Form Data:', req.body);

  if (!name || !phone || !email || !amount) {
    return res.status(400).json({ error: 'Invalid input data.' });
  }

  const orderId = uuidv4();  // Generate unique order ID
  const merchantTransactionId = uuidv4(); // Generate merchant transaction ID

  const paymentPayload = {
    merchantId: MERCHANT_ID,
    merchantUserId: name,
    mobileNumber: phone,
    amount: amount * 100,
    merchantTransactionId: merchantTransactionId, // Use merchantTransactionId here
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
  const hash = crypto
    .createHash('sha256')
    .update(payload + '/pg/v1/pay' + MERCHANT_KEY)
    .digest('hex');
  const checksum = `${hash}###1`;

  try {
    const response = await axios.post(PROD_URL, { request: payload }, {
      headers: {
        'X-VERIFY': checksum,
        'Content-Type': 'application/json',
      },
    });

    const redirectUrl = response.data.data?.instrumentResponse?.redirectInfo?.url;
    console.log("MERCHANT_ID:", MERCHANT_ID);
console.log("MERCHANT_KEY:", MERCHANT_KEY);
console.log("cheksum value:" , checksum);


    if (redirectUrl) {
      console.log(`Generated Transaction ID: ${orderId}`);
      console.log(`Redirect URL: ${redirectUrl}`);

      // Send back orderId and merchantTransactionId in response
      res.status(200).json({
        orderId: orderId,
        merchantTransactionId: merchantTransactionId,  // Add merchantTransactionId here
        url: redirectUrl,
      });
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
    amount,
  } = req.body;

  if (!merchantTransactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  // Construct the checksum string and hash it
  const checksumString = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}${MERCHANT_KEY}`;
  console.log('Checksum String:', checksumString);

  const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
  const checksum = sha256 + '###1';
  console.log('Generated Checksum:', checksum);

  // Construct the request options for the status API
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

  console.log('Request Options:', options);

  try {
    const response = await axios.request(options);
    console.log('API Response:', response.data);

    if (response.data.success) {
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

      // Send email to admin (owner)
      await sendEmail({
        to: OWNER_EMAIL,
        subject: 'New Successful Payment Received',
        html: `<h3>New Payment Details</h3>${userDetails}`,
      });

      // Send email to the user (customer)
      await sendEmail({
        to: email,
        subject: 'Payment Successful',
        html: `<p>Dear ${name},</p><p>Your payment of ₹${amount} was successful. Thank you!</p>`,
      });

      // Redirect user to the success page
      res.redirect(SUCCESS_URL);
    } else {
      res.redirect(FAILURE_URL);
    }
  } catch (error) {
    console.error('Status error:', error.message);
    res.redirect(FAILURE_URL);
  }
});


// Default Route
app.get('/', (req, res) => res.send('Welcome to the Payment API!'));

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



