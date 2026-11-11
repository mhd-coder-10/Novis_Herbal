import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import { createShiprocketShipment, mapCourierStatusToAppStatus } from './shiprocketService.js';

export class ShippingService {
  static async bookShipmentForOrder(orderId, adminUser) {
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (['CANCELLED', 'DELIVERED', 'RETURNED'].includes(order.orderStatus)) {
      const error = new Error(`Cannot create forward courier shipment for an order with status "${order.orderStatus}"`);
      error.statusCode = 400;
      throw error;
    }

    const shipmentResult = await createShiprocketShipment(order);

    order.shipment.provider = 'SHIPROCKET';
    order.shipment.shiprocketOrderId = shipmentResult.shiprocketOrderId;
    order.shipment.shipmentId = shipmentResult.shipmentId;
    order.shipment.awbCode = shipmentResult.awbCode;
    order.shipment.courierName = shipmentResult.courierName;
    order.shipment.labelUrl = shipmentResult.labelUrl;
    order.shipment.trackingUrl = shipmentResult.trackingUrl;
    order.shipment.pickupScheduledAt = new Date();

    order.orderStatus = 'SHIPMENT_BOOKED';

    order.trackingTimeline.push({
      status: 'SHIPMENT_BOOKED',
      title: 'Shipment Booked & AWB Assigned',
      description: `Assigned Courier: ${shipmentResult.courierName} (AWB: ${shipmentResult.awbCode})`,
      location: 'Primary Fulfillment Hub, Mumbai',
      timestamp: new Date(),
      updatedBy: adminUser ? adminUser.email : 'ADMIN'
    });

    await order.save();

    await AuditLog.create({
      action: 'SHIPMENT_BOOKED',
      entityType: 'ORDER',
      entityId: order.orderId,
      performedBy: {
        userId: adminUser?._id,
        email: adminUser?.email,
        role: adminUser?.role
      },
      details: { awb: shipmentResult.awbCode, courier: shipmentResult.courierName, mode: shipmentResult.mode }
    });

    return {
      message: `Shipment booked successfully with ${shipmentResult.courierName}. AWB: ${shipmentResult.awbCode}`,
      shipment: order.shipment,
      order
    };
  }

  static async handleShiprocketWebhookEvent(payload) {
    const awb = payload.awb || payload.awb_code;
    const currentStatus = payload.current_status || payload.status;
    const location = payload.location || payload.current_hub_name || 'In Transit';

    if (!awb) {
      const error = new Error('AWB code missing in webhook payload');
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.findOne({ 'shipment.awbCode': awb });
    if (!order) {
      const error = new Error('Order with this AWB not found');
      error.statusCode = 404;
      throw error;
    }

    const mappedStatus = mapCourierStatusToAppStatus(currentStatus);

    const isDuplicate = order.trackingTimeline.some(t =>
      t.status === mappedStatus &&
      (new Date().getTime() - new Date(t.timestamp).getTime()) < 15 * 60 * 1000
    );

    if (!isDuplicate) {
      order.orderStatus = mappedStatus;
      order.trackingTimeline.push({
        status: mappedStatus,
        title: `Courier Update: ${currentStatus}`,
        description: payload.activity || 'Parcel status updated by courier partner',
        location: location,
        timestamp: new Date(),
        updatedBy: 'COURIER_WEBHOOK'
      });

      if (mappedStatus === 'DELIVERED') {
        order.shipment.deliveredAt = new Date();
        if (order.paymentInfo.method === 'COD') {
          order.paymentInfo.status = 'PAID';
        }
      }

      await order.save();
    }

    return { message: 'Webhook processed successfully' };
  }

  static async manualOverrideStatus(orderId, { status, reason, note, location }, adminUser) {
    if (!reason) {
      const error = new Error('Reason is mandatory for manual shipping overrides');
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const prevStatus = order.orderStatus;
    order.orderStatus = status;

    order.trackingTimeline.push({
      status,
      title: `Manual Update: ${status}`,
      description: `[Manual Override]: ${reason}. Note: ${note || 'None'}`,
      location: location || 'Warehouse Admin Override',
      timestamp: new Date(),
      updatedBy: adminUser?.email || 'ADMIN'
    });

    if (status === 'DELIVERED') {
      order.shipment.deliveredAt = new Date();
      if (order.paymentInfo.method === 'COD') {
        order.paymentInfo.status = 'PAID';
      }
    }

    await order.save();

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
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Label - ${order.orderId}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 480px; margin: auto; border: 2px dashed #000; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .barcode { font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 15px 0; background: #eee; padding: 10px; }
          .section { margin: 10px 0; border-bottom: 1px solid #ccc; padding-bottom: 8px; font-size: 13px; }
          .bold { font-weight: bold; }
          .print-btn { background: #0B3B24; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>NOVIS HERBAL</h2>
          <p>D2C Premium Hair Care Logistics</p>
        </div>
        <div class="barcode">
          * ${order.shipment?.awbCode || 'AWB-PENDING'} *
        </div>
        <div class="section">
          <div><span class="bold">AWB:</span> ${order.shipment?.awbCode || 'Pending'}</div>
          <div><span class="bold">Courier:</span> ${order.shipment?.courierName || 'Standard Express'}</div>
          <div><span class="bold">Order ID:</span> ${order.orderId}</div>
          <div><span class="bold">Payment Mode:</span> ${order.paymentInfo.method} ${order.paymentInfo.method === 'COD' ? `(Collect ₹${order.pricing.totalAmount})` : '(PREPAID - DO NOT COLLECT)'}</div>
        </div>
        <div class="section">
          <div class="bold">DELIVER TO:</div>
          <div>${order.shippingAddress.fullName}</div>
          <div>${order.shippingAddress.addressLine1}</div>
          ${order.shippingAddress.addressLine2 ? `<div>${order.shippingAddress.addressLine2}</div>` : ''}
          <div>${order.shippingAddress.city}, ${order.shippingAddress.state} - <span class="bold">${order.shippingAddress.pincode}</span></div>
          <div>Phone: ${order.shippingAddress.phone}</div>
        </div>
        <div class="section">
          <div class="bold">RETURN / SHIPPER ADDRESS:</div>
          <div>Novise Fulfillment Center</div>
          <div>Plot 42, Green Valley Industrial Area, Mumbai, MH - 400001</div>
          <div>Contact: support@novise.in | +91 98765 43210</div>
        </div>
        <div class="section">
          <div><span class="bold">Items:</span> ${order.items.map(i => `${i.name} (Qty: ${i.quantity})`).join(', ')}</div>
          <div><span class="bold">Weight:</span> ${order.shipment?.packageWeightGrams || 500}g</div>
        </div>
        <br />
        <button class="print-btn" onclick="window.print()">Print Shipping Label</button>
      </body>
      </html>
    `;
  }
}
