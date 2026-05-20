const nodemailer = require('nodemailer');

/**
 * Reusable email transporter — Gmail SMTP
 */
const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.MAIL_HOST  || 'smtp.gmail.com',
    port:   Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

/**
 * Send a generic email
 * @param {object} options - { to, subject, html, attachments? }
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from:        process.env.MAIL_FROM || `"InventoSmart" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
  return info;
};

/**
 * Send invoice email with PDF attachment
 * @param {string} to           - customer email
 * @param {string} customerName
 * @param {string} invoiceNo
 * @param {number} amount
 * @param {string} businessName
 * @param {Buffer} pdfBuffer
 */
const sendInvoiceEmail = async (to, customerName, invoiceNo, amount, businessName, pdfBuffer) => {
  return sendEmail({
    to,
    subject: `Invoice ${invoiceNo} from ${businessName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px">
        <div style="background:#1e40af;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
          <h2 style="margin:0;font-size:20px">${businessName}</h2>
          <p style="margin:4px 0 0;font-size:13px;opacity:.8">Tax Invoice</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
          <p style="font-size:15px;color:#334155">Dear <strong>${customerName}</strong>,</p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Please find your invoice <strong>${invoiceNo}</strong> attached to this email.<br/>
            Total Amount: <strong style="color:#1e40af;font-size:16px">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px">
            This is an auto-generated email from InventoSmart. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename:    `${invoiceNo}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

/**
 * Send low-stock alert email to admin
 */
const sendLowStockAlert = async (adminEmail, products) => {
  const rows = products
    .map(p => `<tr>
      <td style="padding:8px;border-bottom:1px solid #f1f5f9">${p.name}</td>
      <td style="padding:8px;border-bottom:1px solid #f1f5f9;color:#ef4444">${p.stock_qty}</td>
      <td style="padding:8px;border-bottom:1px solid #f1f5f9">${p.min_threshold}</td>
    </tr>`)
    .join('');

  return sendEmail({
    to:      adminEmail,
    subject: `⚠️ Low Stock Alert — ${products.length} products need reorder`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px">
        <h2 style="color:#1e40af">Low Stock Alert</h2>
        <p style="color:#475569">${products.length} products are below minimum threshold:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:8px;text-align:left">Product</th>
              <th style="padding:8px;text-align:left">Current Stock</th>
              <th style="padding:8px;text-align:left">Min Required</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px">Sent by InventoSmart</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendInvoiceEmail, sendLowStockAlert };