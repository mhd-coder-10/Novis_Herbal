import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import { sendOrderDispatchedEmail } from './emailService.js';

export class ShippingService {
  /**
   * Update manual courier consignment tracking details (India Post / Local Couriers)
   * Dispatches tracking ID, tracking link, and marks order as DISPATCHED
   */
  static async updateTrackingDetails(orderId, { courierName, trackingNumber, trackingUrl, dispatchedAt, notes, updateStatusToDispatched = true }, adminUser) {
    const order = await Order.findOne({ orderId: String(orderId).trim().toUpperCase() });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (['CANCELLED'].includes(order.orderStatus)) {
      const error = new Error(`Cannot dispatch or assign tracking to a CANCELLED order`);
      error.statusCode = 400;
      throw error;
    }

    if (!trackingNumber || !trackingNumber.trim()) {
      const error = new Error('Consignment Tracking Number is required');
      error.statusCode = 400;
      throw error;
    }

    const assignedCourier = (courierName || 'India Post').trim();
    const cleanTrackingNo = trackingNumber.trim();
    const finalTrackingUrl = (trackingUrl && trackingUrl.trim()) 
      ? trackingUrl.trim() 
      : (process.env.DEFAULT_TRACKING_PORTAL || 'https://www.indiapost.gov.in/');
    const dispatchTime = dispatchedAt ? new Date(dispatchedAt) : new Date();

    if (!order.shipment) {
      order.shipment = {};
    }

    order.shipment.provider = 'MANUAL_COURIER';
    order.shipment.courierName = assignedCourier;
    order.shipment.trackingNumber = cleanTrackingNo;
    order.shipment.awbCode = cleanTrackingNo; // Kept as alias for UI compatibility
    order.shipment.trackingUrl = finalTrackingUrl;
    order.shipment.dispatchedAt = dispatchTime;
    order.shipment.labelUrl = `/api/shipping/label/${order.orderId}`;
    if (notes) {
      order.shipment.notes = notes.trim();
    }

    // Automatically transition forward fulfillment to DISPATCHED if placed or packed
    if (updateStatusToDispatched || ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(order.orderStatus)) {
      order.orderStatus = 'DISPATCHED';
    }

    order.trackingTimeline.push({
      status: order.orderStatus,
      title: `Dispatched via ${assignedCourier}`,
      description: `Consignment / Tracking Number: ${cleanTrackingNo}. Track portal: ${finalTrackingUrl}`,
      location: 'Primary Fulfillment Hub, Mumbai',
      timestamp: dispatchTime,
      updatedBy: adminUser ? adminUser.email : 'ADMIN'
    });

    await order.save();

    // Send Dispatched Email to Customer with Courier Partner & Tracking Details
    sendOrderDispatchedEmail(order).catch(err => console.error('[Dispatch Email Error]:', err.message));

    await AuditLog.create({
      action: 'ORDER_DISPATCHED',
      entityType: 'ORDER',
      entityId: order.orderId,
      performedBy: {
        userId: adminUser?._id,
        email: adminUser?.email,
        role: adminUser?.role
      },
      details: { 
        trackingNumber: cleanTrackingNo, 
        courier: assignedCourier, 
        trackingUrl: finalTrackingUrl,
        dispatchedAt: dispatchTime
      }
    });

    return {
      success: true,
      message: `Tracking details saved. Parcel dispatched via ${assignedCourier} (Tracking No: ${cleanTrackingNo})`,
      shipment: order.shipment,
      order
    };
  }

  // Alias for backward compatibility with existing route callers
  static async bookShipmentForOrder(orderId, adminUser) {
    return this.updateTrackingDetails(orderId, {
      courierName: 'India Post',
      trackingNumber: `IP${Date.now().toString().slice(-8)}IN`,
      trackingUrl: process.env.DEFAULT_TRACKING_PORTAL || 'https://www.indiapost.gov.in/'
    }, adminUser);
  }

  static async manualOverrideStatus(orderId, { status, reason, note, location }, adminUser) {
    if (!reason) {
      const error = new Error('Reason is mandatory for manual shipping overrides');
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.findOne({ orderId: String(orderId).trim().toUpperCase() });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const prevStatus = order.orderStatus;
    order.orderStatus = status;

    order.trackingTimeline.push({
      status,
      title: `Status: ${status}`,
      description: `[Manual Update]: ${reason}. Note: ${note || 'None'}`,
      location: location || 'Warehouse Dispatch',
      timestamp: new Date(),
      updatedBy: adminUser?.email || 'ADMIN'
    });

    if (status === 'DELIVERED') {
      if (!order.shipment) order.shipment = {};
      order.shipment.deliveredAt = new Date();
      if (order.paymentInfo?.method === 'COD') {
        order.paymentInfo.status = 'PAID';
        if (!order.paymentInfo.paidAt) {
          order.paymentInfo.paidAt = new Date();
        }
      }
    }

    await order.save();

    if (status === 'DISPATCHED') {
      sendOrderDispatchedEmail(order).catch(err => console.error('[Dispatch Email Error]:', err.message));
    }

    await AuditLog.create({
      action: 'MANUAL_STATUS_OVERRIDE',
      entityType: 'ORDER',
      entityId: order.orderId,
      performedBy: {
        userId: adminUser?._id,
        email: adminUser?.email,
        role: adminUser?.role
      },
      reason,
      previousState: { status: prevStatus },
      newState: { status: order.orderStatus }
    });

    return order;
  }

  static async getShippingLabelHTML(orderId) {
    const order = await Order.findOne({ orderId: String(orderId).trim().toUpperCase() });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const trackingNumber = order.shipment?.trackingNumber || order.shipment?.awbCode || 'PENDING-DISPATCH';
    const courierName = order.shipment?.courierName || 'India Post';
    const isCod = order.paymentInfo?.method === 'COD';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Shipping Dispatch Label - ${order.orderId}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; max-width: 520px; margin: auto; border: 2px dashed #0B3B24; border-radius: 8px; }
          .header { text-align: center; border-bottom: 2px solid #0B3B24; padding-bottom: 12px; }
          .brand { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #0B3B24; margin: 0; }
          .sub { font-size: 11px; text-transform: uppercase; color: #666; margin-top: 4px; letter-spacing: 1px; }
          .barcode-box { font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; letter-spacing: 3px; text-align: center; margin: 16px 0; background: #f4f6f4; border: 1px solid #dcdcdc; padding: 10px; border-radius: 4px; }
          .section { margin: 12px 0; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px; font-size: 13px; line-height: 1.5; }
          .bold { font-weight: bold; color: #111; }
          .payment-pill { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 12px; margin-top: 4px; }
          .prepaid { background: #e6f4ea; color: #137333; border: 1px solid #ceead6; }
          .cod { background: #fef7e0; color: #b06000; border: 1px solid #fdd663; }
          .print-btn { background: #0B3B24; color: #fff; font-weight: bold; border: none; padding: 10px 20px; cursor: pointer; border-radius: 6px; font-size: 13px; width: 100%; margin-top: 16px; }
          @media print { .print-btn { display: none; } body { border: 1px solid #000; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">NOVIS HERBAL</div>
          <div class="sub">100% Pure Botanical Ayurveda • Delivery Dispatch Label</div>
        </div>

        <div class="barcode-box">
          * ${trackingNumber} *
        </div>

        <div class="section">
          <div><span class="bold">Consignment / Tracking No:</span> ${trackingNumber}</div>
          <div><span class="bold">Courier Partner:</span> ${courierName}</div>
          <div><span class="bold">Order ID:</span> #${order.orderId}</div>
          <div><span class="bold">Order Date:</span> ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div>
            <span class="bold">Payment Mode:</span>
            <span class="payment-pill ${isCod ? 'cod' : 'prepaid'}">
              ${isCod ? `CASH ON DELIVERY — COLLECT ₹${order.pricing.totalAmount}` : 'PREPAID — DO NOT COLLECT CASH'}
            </span>
          </div>
        </div>

        <div class="section">
          <div class="bold" style="text-transform: uppercase; color: #0B3B24; margin-bottom: 4px;">Deliver To (Recipient):</div>
          <div class="bold" style="font-size: 14px;">${order.shippingAddress.fullName}</div>
          <div>${order.shippingAddress.addressLine1}</div>
          ${order.shippingAddress.addressLine2 ? `<div>${order.shippingAddress.addressLine2}</div>` : ''}
          ${order.shippingAddress.landmark ? `<div>Landmark: ${order.shippingAddress.landmark}</div>` : ''}
          <div><span class="bold">${order.shippingAddress.city}, ${order.shippingAddress.state}</span> — <span class="bold" style="font-size: 15px;">PIN: ${order.shippingAddress.pincode}</span></div>
          <div>Phone: <span class="bold">${order.shippingAddress.phone}</span></div>
        </div>

        <div class="section">
          <div class="bold" style="text-transform: uppercase; color: #0B3B24; margin-bottom: 4px;">Sender / Shipper (Return Address):</div>
          <div class="bold">Novis Herbal Care Center</div>
          <div>Shop No 203, Market Yard, Near BOB Bank, Patan, Gujarat - 384151</div>
          <div>Email: care@novise.in | Contact: +91 9316515672</div>
        </div>

        <div class="section">
          <div class="bold">Enclosed Contents:</div>
          <div>${order.items.map(i => `${i.name} (Qty: ${i.quantity})`).join(', ')}</div>
          <div>Approx Weight: ${order.shipment?.packageWeightGrams || 500}g</div>
        </div>

        <button class="print-btn" onclick="window.print()">Print Shipping Label</button>
      </body>
      </html>
    `;
  }
}
