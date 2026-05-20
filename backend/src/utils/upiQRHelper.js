/**
 * upiQRHelper.js — InventoSmart
 * UPI Payment QR code generate karo
 * 
 * Install: npm install qrcode
 */

const QRCode = require('qrcode');

/**
 * UPI Payment URL banavo (NPCI standard format)
 * @param {object} params
 * @param {string} params.upiId      - Business UPI VPA e.g. "krutik@upi" or "9099731627@paytm"
 * @param {string} params.payeeName  - Business name
 * @param {number} params.amount     - Invoice total
 * @param {string} params.invoiceNo  - Invoice number (transaction note)
 * @param {string} params.currency   - Default: INR
 * @returns {string} UPI deep link URL
 */
const buildUPIString = ({ upiId, payeeName, amount, invoiceNo, currency = 'INR' }) => {
  const params = new URLSearchParams({
    pa: upiId,                                    // payee address (UPI ID)
    pn: payeeName,                                // payee name
    am: Number(amount).toFixed(2),                // amount
    cu: currency,                                 // currency
    tn: `Payment for ${invoiceNo}`,               // transaction note
    tr: invoiceNo,                                // transaction ref
  });
  return `upi://pay?${params.toString()}`;
};

/**
 * UPI QR code generate karo — PNG Buffer return karo
 * @param {object} params - same as buildUPIString
 * @param {object} options - QR options (size, margin)
 * @returns {Promise<Buffer>} PNG image buffer
 */
const generateUPIQR = async (params, options = {}) => {
  const upiString = buildUPIString(params);
  
  const qrBuffer = await QRCode.toBuffer(upiString, {
    type:              'png',
    width:             options.width   || 200,
    margin:            options.margin  || 1,
    color: {
      dark:  options.dark  || '#000000',
      light: options.light || '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  return qrBuffer;
};

/**
 * UPI QR as Base64 Data URL — frontend ma <img src={...}> use karo
 * @param {object} params
 * @returns {Promise<string>} data:image/png;base64,...
 */
const generateUPIQRBase64 = async (params) => {
  const upiString = buildUPIString(params);
  const dataUrl   = await QRCode.toDataURL(upiString, {
    width:  200,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  return dataUrl;
};

/**
 * UPI QR as SVG string — PDF ma embed karo
 * @param {object} params
 * @returns {Promise<string>} SVG string
 */
const generateUPIQRSVG = async (params) => {
  const upiString = buildUPIString(params);
  return QRCode.toString(upiString, { type: 'svg', width: 150, margin: 1 });
};

module.exports = {
  buildUPIString,
  generateUPIQR,
  generateUPIQRBase64,
  generateUPIQRSVG,
};