import { OrderService } from '../services/orderService.js';
import { realtimeService } from '../services/realtimeService.js';
import CMS from '../models/CMS.js';

// @route POST /api/orders/checkout
export const checkout = async (req, res) => {
  try {
    const result = await OrderService.processCheckout({
      ...req.body,
      user: req.user
    });
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route POST /api/orders/verify-payment
export const verifyPayment = async (req, res) => {
  try {
    const result = await OrderService.verifyPayment(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/orders/track/:orderId
export const trackOrder = async (req, res) => {
  try {
    const result = await OrderService.trackOrder(req.params.orderId);
    res.json({ success: true, order: result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/orders/my-orders (Protected)
export const getMyOrders = async (req, res) => {
  try {
    const orders = await OrderService.getMyOrders(req.user._id);
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/orders/admin/all (Admin)
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const result = await OrderService.getAllOrdersAdmin(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/orders/admin/:id/status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const order = await OrderService.updateOrderStatus(req.params.id, req.body, req.user);
    realtimeService.broadcast('ORDER_UPDATED', { orderId: order.orderId, mongoId: order._id, order });
    res.json({ success: true, order });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/orders/admin/:id/payment-status (Admin)
export const updatePaymentStatus = async (req, res) => {
  try {
    const order = await OrderService.updatePaymentStatus(req.params.id, req.body, req.user);
    realtimeService.broadcast('ORDER_UPDATED', { orderId: order.orderId, mongoId: order._id, order });
    res.json({ success: true, order });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/orders/:id/invoice
export const getInvoice = async (req, res) => {
  try {
    const order = await OrderService.getInvoiceData(req.params.id);

    // If client requested JSON explicitly
    if (req.query.format === 'json' || (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html'))) {
      return res.json({ success: true, order });
    }

    const cms = await CMS.findOne({ key: 'global_cms' }).lean();
    const storeSettings = cms?.storeSettings || {};
    const storeName = storeSettings.storeName || 'Novis Herbal';
    const gstNumber = storeSettings.gstNumber || '27AAAAA0000A1Z5';
    const businessAddress = storeSettings.businessAddress || 'Novise Naturals, Mumbai, Maharashtra, India';
    const supportEmail = storeSettings.supportEmail || 'support@novise.in';
    const supportPhone = storeSettings.supportPhone || '+91 98765 43210';
    const currencySymbol = storeSettings.currencySymbol || '₹';

    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const subtotal = order.pricing?.subtotal || 0;
    const discountAmount = order.pricing?.discountAmount || 0;
    const shippingFee = order.pricing?.shippingFee || 0;
    const totalAmount = order.pricing?.totalAmount || 0;
    const taxAmount = order.pricing?.taxAmount || Math.round(totalAmount * 0.05);
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const halfTax = (taxAmount / 2).toFixed(2);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GST Tax Invoice - ${order.orderId} - ${storeName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1e293b;
      background: #f1f5f9;
      font-size: 13px;
      line-height: 1.5;
    }
    .actions-bar {
      max-width: 820px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-print { background: #0b3b24; color: #ffffff; }
    .btn-print:hover { background: #062316; }
    .btn-close { background: #ffffff; color: #475569; border-color: #cbd5e1; }
    .btn-close:hover { background: #f8fafc; }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      padding: 40px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #0b3b24;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #0b3b24;
      margin: 0 0 6px 0;
      letter-spacing: 0.5px;
    }
    .store-meta {
      font-size: 12px;
      color: #475569;
      line-height: 1.6;
    }
    .invoice-tag {
      text-align: right;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 900;
      color: #0b3b24;
      margin: 0 0 4px 0;
      letter-spacing: 1px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      margin-top: 4px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-box h4 {
      margin: 0 0 8px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      font-weight: 800;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #0b3b24;
      color: #ffffff;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    th.num, td.num { text-align: right; }
    td {
      padding: 12px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12.5px;
      color: #334155;
    }
    .summary-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .summary-table {
      width: 340px;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12.5px;
    }
    .grand-total td {
      font-size: 16px !important;
      font-weight: 900 !important;
      color: #0b3b24 !important;
      border-top: 2px solid #0b3b24 !important;
      border-bottom: 2px solid #0b3b24 !important;
      padding: 10px !important;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 18px;
      font-size: 11.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1.6;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .actions-bar { display: none !important; }
      .invoice-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>

  <div class="actions-bar">
    <div style="font-weight: 700; color: #334155;">
      <span>Tax Invoice Preview</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" class="btn btn-print">🖨️ Print Invoice</button>
      <button onclick="window.close()" class="btn btn-close">Close</button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="header-bar">
      <div>
        <h1 class="brand-title">${storeName}</h1>
        <div class="store-meta">
          ${businessAddress}<br>
          <strong>GSTIN:</strong> ${gstNumber}<br>
          <strong>Helpline:</strong> ${supportPhone} | <strong>Email:</strong> ${supportEmail}
        </div>
      </div>
      <div class="invoice-tag">
        <div class="invoice-title">TAX INVOICE</div>
        <div style="font-size: 12px; color: #64748b;">
          <strong>Invoice No:</strong> INV-${order.orderId}<br>
          <strong>Invoice Date:</strong> ${formattedDate}<br>
          <strong>Order ID:</strong> ${order.orderId}<br>
          <span class="badge">${order.paymentInfo?.method === 'COD' 
            ? (order.orderStatus === 'DELIVERED' ? 'COD - PAID (CASH COLLECTED)' : ['CANCELLED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(order.orderStatus) ? 'COD - NOT APPLICABLE' : 'COD - PENDING (COLLECT AT DOORSTEP)')
            : `${order.paymentInfo?.method || 'ONLINE'} - ${order.paymentInfo?.status || 'PAID'}`}</span>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-box">
        <h4>Billed & Shipped To</h4>
        <strong>${order.shippingAddress?.fullName || order.customerDetails?.fullName}</strong><br>
        ${order.shippingAddress?.addressLine1 || ''}
        ${order.shippingAddress?.addressLine2 ? '<br>' + order.shippingAddress.addressLine2 : ''}<br>
        ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}<br>
        <strong>Phone:</strong> ${order.shippingAddress?.phone || order.customerDetails?.phone || 'N/A'}<br>
        <strong>Email:</strong> ${order.customerDetails?.email || 'N/A'}
      </div>

      <div class="info-box">
        <h4>Shipment & Logistics</h4>
        <strong>Courier Partner:</strong> ${order.shipment?.courierName || 'Shiprocket Express'}<br>
        <strong>AWB Tracking:</strong> ${order.shipment?.awbCode || 'Assigned on Dispatch'}<br>
        <strong>Destination:</strong> ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}<br>
        <strong>Order Status:</strong> ${order.orderStatus || 'CONFIRMED'}<br>
        <strong>Policy:</strong> Strictly Non-Returnable & Non-Replaceable
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Item Description</th>
          <th style="width: 120px;">SKU</th>
          <th class="num" style="width: 70px;">Qty</th>
          <th class="num" style="width: 100px;">Unit Price</th>
          <th class="num" style="width: 110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(order.items || []).map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${item.name}</strong>
              ${item.weightGrams ? `<br><span style="font-size: 11px; color: #64748b;">Weight: ${item.weightGrams}g</span>` : ''}
            </td>
            <td><span style="font-family: monospace; font-size: 11.5px;">${item.sku || 'NOV-SKU'}</span></td>
            <td class="num">${item.quantity}</td>
            <td class="num">${currencySymbol}${item.price}</td>
            <td class="num"><strong>${currencySymbol}${item.price * item.quantity}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-wrap">
      <table class="summary-table">
        <tr>
          <td>Item Subtotal</td>
          <td class="num">${currencySymbol}${subtotal}</td>
        </tr>
        ${discountAmount > 0 ? `
          <tr style="color: #166534;">
            <td>Promotional Discount</td>
            <td class="num">-${currencySymbol}${discountAmount}</td>
          </tr>
        ` : ''}
        <tr>
          <td>Shipping & Handling</td>
          <td class="num">${shippingFee === 0 ? '<span style="color: #166534; font-weight: 700;">FREE</span>' : currencySymbol + shippingFee}</td>
        </tr>
        <tr>
          <td>CGST (2.5%)</td>
          <td class="num">${currencySymbol}${halfTax}</td>
        </tr>
        <tr>
          <td>SGST (2.5%)</td>
          <td class="num">${currencySymbol}${halfTax}</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total</td>
          <td class="num">${currencySymbol}${totalAmount}</td>
        </tr>
      </table>
    </div>

    <div class="footer-note">
      <div>
        <strong>Terms & Conditions:</strong><br>
        • Authentic Ayurvedic personal-care formulation with tamper-evident seal.<br>
        • All items once delivered are strictly Non-Returnable and Non-Replaceable for hygiene & safety.<br>
        • This is a computer-generated tax invoice and requires no physical signature.
      </div>
      <div style="text-align: right;">
        <strong>For ${storeName}</strong><br><br>
        <span style="font-size: 11px; color: #64748b;">Authorized Signatory</span>
      </div>
    </div>
  </div>

</body>
</html>`;

    res.type('html').send(html);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ORDER LIFECYCLE WORKFLOW CONTROLLERS
// ==========================================

// @route POST /api/orders/:id/cancel (Customer / Admin)
export const cancelOrder = async (req, res) => {
  try {
    const result = await OrderService.cancelOrderByCustomer(req.params.id, req.body, req.user);
    if (result?.order) {
      realtimeService.broadcast('ORDER_UPDATED', { orderId: result.order.orderId, mongoId: result.order._id, order: result.order });
    }
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/orders/admin/:id/cancellation (Admin)
export const reviewCancellation = async (req, res) => {
  try {
    const result = await OrderService.reviewCancellationRequest(req.params.id, req.body, req.user);
    if (result?.order) {
      realtimeService.broadcast('ORDER_UPDATED', { orderId: result.order.orderId, mongoId: result.order._id, order: result.order });
    }
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/orders/admin/:id/refund (Admin)
export const processRefund = async (req, res) => {
  try {
    const result = await OrderService.processRefund(req.params.id, req.body, req.user);
    if (result?.order) {
      realtimeService.broadcast('ORDER_UPDATED', { orderId: result.order.orderId, mongoId: result.order._id, order: result.order });
    }
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/orders/admin/:id/rto (Admin)
export const processRTO = async (req, res) => {
  try {
    const result = await OrderService.processRTO(req.params.id, req.body, req.user);
    if (result?.order) {
      realtimeService.broadcast('ORDER_UPDATED', { orderId: result.order.orderId, mongoId: result.order._id, order: result.order });
    }
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route POST /api/orders/:id/complaint (Customer)
export const submitComplaint = async (req, res) => {
  try {
    const result = await OrderService.submitOrderComplaint(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/orders/admin/:id/complaint (Admin)
export const reviewComplaint = async (req, res) => {
  try {
    const result = await OrderService.reviewOrderComplaint(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/orders/admin/:id/complaint/video (Admin)
export const deleteComplaintVideo = async (req, res) => {
  try {
    const result = await OrderService.deleteComplaintVideo(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/orders/admin/settings/order-policy (Admin)
export const getOrderPolicySettings = async (req, res) => {
  try {
    const settings = await OrderService.getGlobalOrderSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/orders/admin/settings/order-policy (Admin)
export const updateOrderPolicySettings = async (req, res) => {
  try {
    const settings = await OrderService.updateGlobalOrderSettings(req.body);
    realtimeService.broadcast('CMS_UPDATED', { settings, cms: settings.cms });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/orders/admin/:id (Admin)
export const deleteOrder = async (req, res) => {
  try {
    const result = await OrderService.deleteOrder(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

