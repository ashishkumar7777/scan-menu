const Razorpay = require('razorpay');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

const getRazorpayClient = () => {
  if (!keyId || !keySecret) {
    return null;
  }

  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpay;
};

module.exports = {
  getRazorpayClient,
  keyId,
  keySecret,
};
