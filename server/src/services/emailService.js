import nodemailer from 'nodemailer';
import CMS from '../models/CMS.js';

/**
 * Novise Professional Nodemailer Email Service
 * High-converting luxury botanical templates for:
 * 1. Customer OTP Email Verification
 * 2. Customer Order Confirmation
 * 3. Store Admin Order Alert
 * 4. Customer Order Status & Delivery Updates
 */

/**
 * Helper to dynamically resolve Store Support Email from Admin Settings
 */
export const getDynamicSupportEmail = async () => {
  try {
    const cms = await CMS.findOne({ key: 'global_cms' }).lean();
    if (cms?.storeSettings?.supportEmail) return cms.storeSettings.supportEmail.trim();
    if (cms?.policies?.contactUs?.email) return cms.policies.contactUs.email.trim();
  } catch (err) {
    // fallback
  }
  return process.env.SUPPORT_EMAIL || 'support@novise.in';
};

/**
 * Helper to dynamically resolve Store Admin Alert Email from Admin Settings
 */
export const getDynamicAdminAlertEmail = async () => {
  try {
    const cms = await CMS.findOne({ key: 'global_cms' }).lean();
    if (cms?.storeSettings?.supportEmail) return cms.storeSettings.supportEmail.trim();
    if (cms?.policies?.contactUs?.email) return cms.policies.contactUs.email.trim();
  } catch (err) {
    // fallback
  }
  return process.env.ADMIN_EMAIL || 'admin@novise.in';
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Verify whether SMTP credentials are valid and not placeholders
  if (user && pass && !user.includes('sample') && !pass.includes('sample')) {
    if (user.endsWith('@gmail.com') || host.includes('gmail')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
};

// Generic mail sender with fallback console logging & dynamic reply-to
export const sendEmail = async ({ to, subject, htmlContent, replyTo }) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || '"Novis Herbal" <support@novise.in>';
  const dynamicReplyTo = replyTo || await getDynamicSupportEmail();

  if (!transporter) {
    console.log(`Email simulated: To=${to}, ReplyTo=${dynamicReplyTo}, Subject="${subject}"`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: dynamicReplyTo,
      subject,
      html: htmlContent
    });
    console.log(`Email sent: ID ${info.messageId} to ${to} (Reply-To: ${dynamicReplyTo})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email delivery failed to ${to}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// 1. OTP Verification Email
export const sendOtpEmail = async (email, name, otp) => {
  console.log(`Signup OTP for ${email}: ${otp}`);

  const subject = `Your Novis Herbal Verification Code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Novis Herbal Email Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 20px; color: #2C3E50; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ECE7E1; box-shadow: 0 4px 20px rgba(11, 59, 36, 0.05); }
        .header { background: #0B3B24; padding: 32px 24px; text-align: center; }
        .logo { font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #D4AF37; margin: 0; }
        .tagline { color: #E0E7E2; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 18px; font-weight: 700; color: #0B3B24; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #555555; margin-bottom: 24px; }
        .otp-box { background: #F6F4EE; border: 2px dashed #0B3B24; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #666666; font-weight: 600; margin-bottom: 8px; }
        .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0B3B24; font-family: 'Courier New', monospace; }
        .validity { font-size: 12px; color: #888888; margin-top: 8px; }
        .security-note { background: #FFF8E7; border-left: 4px solid #D4AF37; padding: 12px 16px; font-size: 12px; color: #7A5E0B; border-radius: 4px; margin-top: 24px; }
        .footer { background: #FAF8F5; padding: 24px; text-align: center; border-top: 1px solid #ECE7E1; font-size: 12px; color: #888888; }
        .footer a { color: #0B3B24; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">NOVIS</h1>
          <div class="tagline">Pure Botanical Scalp & Hair Care</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'Valued Customer'},</div>
          <p class="message">
            Thank you for choosing Novis Herbal. To verify your email address and secure your new account against unauthorized activity, please use the One-Time Password (OTP) below:
          </p>
          <div class="otp-box">
            <div class="otp-label">Your One-Time Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="validity">⏳ Valid for 10 minutes only</div>
          </div>
          <div class="security-note">
            <strong>Security Notice:</strong> Please never share this OTP with anyone. Novis Herbal representatives will never ask for your password or verification code.
          </div>
          <p class="message" style="margin-top: 24px; font-size: 13px;">
            If you did not request this account creation, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Novis Herbal. 100% Ayurvedic & Herbal Care.</p>
          <p>Need assistance? Contact us at <a href="mailto:support@novise.in">support@novise.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: email, subject, htmlContent });
};

// 1.1 Password Reset OTP Email
export const sendPasswordResetOtpEmail = async (email, name, otp) => {
  console.log(`Password Reset OTP for ${email}: ${otp}`);

  const subject = `Your Novis Herbal Password Reset Code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Novis Herbal Password Recovery</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 20px; color: #2C3E50; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ECE7E1; box-shadow: 0 4px 20px rgba(11, 59, 36, 0.05); }
        .header { background: #0B3B24; padding: 32px 24px; text-align: center; }
        .logo { font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #D4AF37; margin: 0; }
        .tagline { color: #E0E7E2; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 18px; font-weight: 700; color: #0B3B24; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #555555; margin-bottom: 24px; }
        .otp-box { background: #FFF9EE; border: 2px dashed #D4AF37; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8C6D1F; font-weight: 700; margin-bottom: 8px; }
        .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0B3B24; font-family: 'Courier New', monospace; }
        .validity { font-size: 12px; color: #888888; margin-top: 8px; }
        .security-note { background: #FFF8E7; border-left: 4px solid #D4AF37; padding: 12px 16px; font-size: 12px; color: #7A5E0B; border-radius: 4px; margin-top: 24px; }
        .footer { background: #FAF8F5; padding: 24px; text-align: center; border-top: 1px solid #ECE7E1; font-size: 12px; color: #888888; }
        .footer a { color: #0B3B24; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">NOVIS</h1>
          <div class="tagline">Pure Botanical Scalp & Hair Care</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'Valued Customer'},</div>
          <p class="message">
            We received a request to reset the password for your Novis Herbal account. To create a new password, please use the One-Time Password (OTP) verification code below:
          </p>
          <div class="otp-box">
            <div class="otp-label">Password Reset Security Code</div>
            <div class="otp-code">${otp}</div>
            <div class="validity">⏳ Valid for 10 minutes only</div>
          </div>
          <div class="security-note">
            <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your existing password remains secure and unchanged.
          </div>
          <p class="message" style="margin-top: 24px; font-size: 13px;">
            For your security, never share this code with anyone.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Novis Herbal. 100% Ayurvedic & Herbal Care.</p>
          <p>Need assistance? Contact us at <a href="mailto:support@novise.in">support@novise.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: email, subject, htmlContent });
};

// 2. Customer Order Confirmation Email
export const sendOrderConfirmationEmail = async (order) => {
  const cms = await CMS.findOne({ key: 'global_cms' }).lean();
  if (cms?.storeSettings?.enableOrderEmails === false) {
    console.log('[EmailService] Order confirmation email skipped: disabled in Store Settings');
    return { success: true, skipped: true };
  }

  const storeName = cms?.storeSettings?.storeName || 'Novis Herbal';
  const supportEmail = cms?.storeSettings?.supportEmail || 'support@novise.in';
  const currencySymbol = cms?.storeSettings?.currencySymbol || '₹';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const subject = `Order Confirmed: ${order.orderId} - ${storeName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Novise Order Confirmation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 20px; color: #2C3E50; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ECE7E1; }
        .header { background: #0B3B24; padding: 32px 24px; text-align: center; }
        .logo { font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #D4AF37; margin: 0; }
        .content { padding: 32px 28px; }
        .status-badge { display: inline-block; background: #E8F5E9; color: #1B5E20; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
        .card { background: #FAF8F5; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #ECE7E1; }
        .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #EFEAE3; font-size: 13px; }
        .item-row:last-child { border-bottom: none; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; color: #0B3B24; padding-top: 12px; border-top: 2px solid #0B3B24; margin-top: 8px; }
        .btn { display: inline-block; background: #0B3B24; color: #D4AF37; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; text-align: center; font-size: 14px; margin-top: 20px; }
        .footer { background: #FAF8F5; padding: 20px; text-align: center; border-top: 1px solid #ECE7E1; font-size: 12px; color: #888888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">NOVISE</h1>
          <p style="color: #E0E7E2; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Botanical Hair Care</p>
        </div>
        <div class="content">
          <div class="status-badge">✅ ORDER PLACED SUCCESSFULLY</div>
          <h2 style="color: #0B3B24; margin-top: 0;">Thank you for your order, ${order.customerDetails.fullName}!</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            We have received your order <strong>#${order.orderId}</strong>. Our ayurvedic master blenders are now preparing your fresh botanical batch.
          </p>

          <div class="card">
            <h3 style="margin-top: 0; color: #0B3B24; font-size: 15px; border-bottom: 1px solid #ECE7E1; padding-bottom: 8px;">Order Details (${order.orderId})</h3>
            <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
              ${order.items.map(item => `
                <tr>
                  <td><strong>${item.name}</strong> x ${item.quantity}</td>
                  <td align="right">₹${item.price * item.quantity}</td>
                </tr>
              `).join('')}
              <tr style="border-top: 1px dashed #ccc;">
                <td>Subtotal</td>
                <td align="right">₹${order.pricing.subtotal}</td>
              </tr>
              ${order.pricing.discountAmount > 0 ? `
                <tr style="color: #2E7D32;">
                  <td>Discount</td>
                  <td align="right">-₹${order.pricing.discountAmount}</td>
                </tr>
              ` : ''}
              <tr>
                <td>Express Shipping</td>
                <td align="right">${order.pricing.shippingFee === 0 ? '<span style="color:#2E7D32;">FREE</span>' : '₹' + order.pricing.shippingFee}</td>
              </tr>
              <tr style="font-weight: bold; font-size: 15px; color: #0B3B24; border-top: 2px solid #0B3B24;">
                <td>Total Amount</td>
                <td align="right">₹${order.pricing.totalAmount}</td>
              </tr>
            </table>
          </div>

          <div style="font-size: 13px; color: #555; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #ECE7E1;">
            <p style="margin: 0 0 6px 0;"><strong>Payment Method:</strong> ${order.paymentInfo.method} (${order.paymentInfo.status})</p>
            <p style="margin: 0;"><strong>Delivery Address:</strong> ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
          </div>

          <div style="text-align: center; margin-top: 28px;">
            <a href="${clientUrl}/track-order/${order.orderId}" class="btn" style="color: #D4AF37;">
              TRACK YOUR ORDER LIVE ➔
            </a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Novis Herbal. Pure Nature, Proven Results.</p>
          <p>Questions? Reach out directly via <a href="mailto:support@novise.in" style="color:#0B3B24; font-weight:bold;">support@novise.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: order.customerDetails.email, subject, htmlContent });
};

// 3. Admin New Order Notification Email
export const sendAdminOrderNotificationEmail = async (order) => {
  const cms = await CMS.findOne({ key: 'global_cms' }).lean();
  if (cms?.storeSettings?.enableAdminAlerts === false) {
    console.log('[EmailService] Admin order notification email skipped: disabled in Store Settings');
    return { success: true, skipped: true };
  }

  const storeName = cms?.storeSettings?.storeName || 'Novis Herbal';
  const currencySymbol = cms?.storeSettings?.currencySymbol || '₹';
  const adminEmail = await getDynamicAdminAlertEmail();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const subject = `[New Order Alert] ${order.orderId} - ${currencySymbol}${order.pricing.totalAmount} (${order.paymentInfo.method})`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order Alert - Novise Admin</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #F4F6F8; margin: 0; padding: 20px; color: #2C3E50; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #DCE2E6; }
        .header { background: #1A2530; padding: 20px 24px; color: #ffffff; }
        .title { font-size: 18px; font-weight: bold; margin: 0; }
        .content { padding: 24px; font-size: 14px; }
        .box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .btn { display: inline-block; background: #0B3B24; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">NOVISE STORE ADMIN • NEW ORDER RECEIVED</div>
        </div>
        <div class="content">
          <h2 style="color: #0B3B24; margin-top: 0;">Order #${order.orderId}</h2>
          <p>A customer has just placed an order on the Novise Storefront.</p>
          
          <div class="box">
            <strong>Customer Information:</strong><br>
            Name: ${order.customerDetails.fullName}<br>
            Phone: ${order.customerDetails.phone}<br>
            Email: ${order.customerDetails.email}<br>
            Address: ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.pincode}
          </div>

          <div class="box">
            <strong>Payment & Total:</strong><br>
            Method: <strong>${order.paymentInfo.method}</strong><br>
            Payment Status: <strong>${order.paymentInfo.status}</strong><br>
            Total Order Value: <strong style="color: #0B3B24; font-size: 16px;">₹${order.pricing.totalAmount}</strong>
          </div>

          <div class="box">
            <strong>Items Ordered:</strong>
            <ul>
              ${order.items.map(item => `<li>${item.name} x ${item.quantity} (₹${item.price * item.quantity})</li>`).join('')}
            </ul>
          </div>

          <p style="text-align: center; margin-top: 24px;">
            <a href="${clientUrl}/admin" class="btn" style="color: #ffffff;">Open Admin Dashboard</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: adminEmail, subject, htmlContent });
};

// 4. Order Status and Delivery Update Email
export const sendOrderStatusUpdateEmail = async (order, newStatus, note = '') => {
  const cms = await CMS.findOne({ key: 'global_cms' }).lean();
  if (cms?.storeSettings?.enableStatusUpdateEmails === false) {
    console.log('[EmailService] Order status update email skipped: disabled in Store Settings');
    return { success: true, skipped: true };
  }

  const storeName = cms?.storeSettings?.storeName || 'Novis Herbal';
  const supportEmail = cms?.storeSettings?.supportEmail || 'support@novise.in';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const formattedStatus = newStatus.replace(/_/g, ' ');
  const subject = `Order Update: #${order.orderId} is ${formattedStatus} - ${storeName}`;

  const statusDescriptions = {
    CONFIRMED: 'Your order has been verified and confirmed by our fulfillment team.',
    PROCESSING: 'Your herbal hair formulation is currently being hand-packed with care.',
    SHIPPED: `Your package has been dispatched via express courier.${order.shipment?.awbCode ? ' AWB: ' + order.shipment.awbCode : ''}`,
    OUT_FOR_DELIVERY: 'Your package is out for delivery today! Please keep your phone reachable.',
    DELIVERED: 'Your package has been successfully delivered! We hope you love your Novise botanical products.',
    CANCELLED: 'Your order has been cancelled.'
  };

  const statusDesc = statusDescriptions[newStatus] || note || `Your order status has been updated to ${formattedStatus}.`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Status Update</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 20px; color: #2C3E50; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ECE7E1; }
        .header { background: #0B3B24; padding: 28px 24px; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; letter-spacing: 4px; color: #D4AF37; margin: 0; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; background: #0B3B24; color: #D4AF37; padding: 8px 18px; border-radius: 20px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
        .box { background: #FAF8F5; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #ECE7E1; font-size: 14px; line-height: 1.6; }
        .btn { display: inline-block; background: #0B3B24; color: #D4AF37; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; text-align: center; font-size: 14px; margin-top: 16px; }
        .footer { background: #FAF8F5; padding: 20px; text-align: center; border-top: 1px solid #ECE7E1; font-size: 12px; color: #888888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">NOVISE</h1>
          <p style="color: #E0E7E2; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Botanical Hair Care</p>
        </div>
        <div class="content">
          <div class="badge">${formattedStatus}</div>
          <h2 style="color: #0B3B24; margin-top: 0;">Order #${order.orderId} Update</h2>
          <p style="font-size: 15px; color: #333; line-height: 1.6;">
            Hello <strong>${order.customerDetails.fullName}</strong>,
          </p>
          <div class="box">
            <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #0B3B24;">
              ${statusDesc}
            </p>
            ${order.shipment?.awbCode ? `
              <p style="margin: 8px 0; font-size: 13px; color: #555;">
                <strong>Courier Partner:</strong> ${order.shipment.courierName || 'Express Courier'}<br>
                <strong>Tracking / AWB Number:</strong> <span style="font-family: monospace; font-weight: bold;">${order.shipment.awbCode}</span>
              </p>
            ` : ''}
            ${note ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #666; font-style: italic;">"${note}"</p>` : ''}
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${clientUrl}/track-order/${order.orderId}" class="btn" style="color: #D4AF37;">
              VIEW LIVE ORDER STATUS ➔
            </a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Novis Herbal. All Rights Reserved.</p>
          <p>For support, reach out to <a href="mailto:support@novise.in" style="color:#0B3B24; font-weight:bold;">support@novise.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: order.customerDetails.email, subject, htmlContent });
};
