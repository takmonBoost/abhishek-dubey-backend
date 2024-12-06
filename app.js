const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173', // Allow only the frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
  credentials: true, // Allow cookies and credentials
}));
// Replace with your actual Merchant Key and ID
const MERCHANT_KEY = "f3524224-f4f7-4b2a-abb6-d94c840ed848";
const MERCHANT_ID = "M22IFFVYCBPTF";

// PhonePe production URLs
const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
const prod_STATUS_URL = "https://api.phonepe.com/apis/hermes/pg/v1/status";

// Redirect URLs for payment results
const redirectUrl="http://localhost:8000/status"

const successUrl="http://localhost:5173/payment-success"
const failureUrl="http://localhost:5173/payment-failure"


app.post('/create-order', async (req, res) => {
  const { name, mobileNumber, amount } = req.body;
  const orderId = uuidv4();


  console.log("Incoming Request:", req.body );

  // Payment payload for PhonePe
  const paymentPayload = {
    merchantId: MERCHANT_ID,
    merchantUserId: name,
    mobileNumber: mobileNumber,
    amount: amount * 100, // Convert to smallest currency unit
    merchantTransactionId: orderId,
    redirectUrl: `${redirectUrl}/?id=${orderId}`,
    redirectMode: 'POST',
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };

  console.log("Constructed Payload:", paymentPayload);
  // Create checksum
  const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  const keyIndex = 1;
  const string = payload + '/pg/v1/pay' + MERCHANT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const checksum = sha256 + '###' + keyIndex;

  // API options
  const option = {
    method: 'POST',
    url: prod_URL,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
    },
    data: {
      request: payload
    }
  };

  try {
    const response = await axios.request(option);
    console.log("PhonePe Response:", response.data);
    console.log(response.data.data.instrumentResponse.redirectInfo.url);
    res.status(200).json({ msg: "OK", url: response.data.data.instrumentResponse.redirectInfo.url });
  } catch (error) {
    console.log("Error in payment", error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

app.post('/status', async (req, res) => {
  const merchantTransactionId = req.query.id;

  // Create checksum for status check
  const keyIndex = 1;
  const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const checksum = sha256 + '###' + keyIndex;

  // Status check API options
  const option = {
    method: 'GET',
    url: `${prod_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': MERCHANT_ID
    },
  };

  try {
    const response = await axios.request(option);
    if (response.data.success === true) {
      return res.redirect(successUrl);
    } else {
      return res.redirect(failureUrl);
    }
  } catch (error) {
    console.log("Error in payment status", error);
    res.redirect(failureUrl);
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to the Payment API!');
});

app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
