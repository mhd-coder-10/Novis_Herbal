import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import CMS from '../models/CMS.js';
import { realtimeService } from './realtimeService.js';
import { CloudinaryService } from './cloudinaryService.js';
import { createRazorpayOrder, verifyRazorpaySignature } from './razorpayService.js';
import {
  sendOrderConfirmationEmail,
  sendAdminOrderNotificationEmail,
  sendOrderDispatchedEmail
} from './emailService.js';
import { NotificationService } from './notificationService.js';
import { sanitizePhoneNumber, isValidIndianPhone } from '../utils/phoneValidation.js';

export class OrderService {
  static async generateOrderId() {
    const year = new Date().getFullYear();
    const prefix = `NOV-${year}-`;

    // 1. Find the highest existing sequential orderId for the current year
    const lastOrder = await Order.findOne(
      { orderId: new RegExp(`^${prefix}\\d+$`) },
      { orderId: 1 },
      { sort: { orderId: -1 } }
    ).lean();

    let nextNumber = 1001;
    if (lastOrder && lastOrder.orderId) {
      const match = lastOrder.orderId.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match && match[1]) {
        const lastNum = parseInt(match[1], 10);
        if (!isNaN(lastNum)) {
          nextNumber = Math.max(nextNumber, lastNum + 1);
        }
      }
    }

    // 2. Ensure candidate ID is completely unique (prevents race condition collisions)
    let candidate = `${prefix}${String(nextNumber).padStart(5, '0')}`;
    while (await Order.exists({ orderId: candidate })) {
      nextNumber++;
      candidate = `${prefix}${String(nextNumber).padStart(5, '0')}`;
    }

    return candidate;
  }

  static async processCheckout({
    items,
    shippingAddress,
    customerDetails,
    paymentMethod,
    user
  }) {
    if (!items || items.length === 0) {
      const error = new Error('Cart items cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    if (!shippingAddress || !shippingAddress.addressLine1 || !shippingAddress.pincode || !shippingAddress.city) {
      const error = new Error('Complete delivery address is required');
      error.statusCode = 400;
      throw error;
    }

    const rawPhone = customerDetails?.phone || shippingAddress?.phone || '';
    const cleanPhone = sanitizePhoneNumber(rawPhone);
    if (!isValidIndianPhone(cleanPhone)) {
      const error = new Error('A valid 10-digit mobile number starting with 6, 7, 8, or 9 is required for shipping and delivery updates');
      error.statusCode = 400;
      throw error;
    }

    // 1. Strict Server-Side Price & Stock Verification
    let calculatedSubtotal = 0;
    const validatedItems = [];
    let totalPackageWeight = 0;

    for (const item of items) {
      const dbProduct = await Product.findById(item.productId || item.product);
      if (!dbProduct) {
        const error = new Error(`Product not found: ${item.name || item.productId}`);
        error.statusCode = 404;
        throw error;
      }

      if (dbProduct.stock < item.quantity) {
        const error = new Error(`Insufficient stock for "${dbProduct.name}". Only ${dbProduct.stock} units remaining.`);
        error.statusCode = 400;
        throw error;
      }

      const itemTotal = dbProduct.sellingPrice * item.quantity;
      calculatedSubtotal += itemTotal;
      totalPackageWeight += (dbProduct.weightGrams || 250) * item.quantity;

      validatedItems.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.sellingPrice,
        quantity: item.quantity,
        image: dbProduct.images?.[0] || '',
        sku: dbProduct.sku,
        weightGrams: dbProduct.weightGrams || 250
      });
    }

    const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
    const storeSettings = cmsConfig?.storeSettings || {};
    const isFreeShipping = storeSettings.isFreeShippingEnabled !== false;
    const freeShippingThreshold = storeSettings.freeShippingThreshold !== undefined ? Number(storeSettings.freeShippingThreshold) : 0;
    const standardShippingFee = storeSettings.standardShippingFee !== undefined ? Number(storeSettings.standardShippingFee) : 0;
    const codFee = (paymentMethod === 'COD' && storeSettings.codFee !== undefined) ? Number(storeSettings.codFee) : 0;

    const discountAmount = 0;
    let baseShippingFee = 0;
    if (!isFreeShipping && standardShippingFee > 0) {
      baseShippingFee = standardShippingFee;
    }
    const shippingFee = baseShippingFee + codFee;
    const taxableSubtotal = Math.max(0, calculatedSubtotal - discountAmount);
    const gstRate = storeSettings.gstPercentage !== undefined ? Number(storeSettings.gstPercentage) : 5;
    const taxAmount = gstRate > 0 ? Math.round(taxableSubtotal * (gstRate / 100)) : 0;
    const totalAmount = taxableSubtotal + shippingFee + taxAmount;

    const orderId = await this.generateOrderId();
    const invoiceNumber = `INV-${orderId}`;

    const newOrder = new Order({
      orderId,
      user: user ? user._id : null,
      customerDetails: {
        fullName: customerDetails?.fullName || shippingAddress.fullName,
        email: customerDetails?.email || user?.email || 'customer@novise.in',
        phone: cleanPhone
      },
      items: validatedItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: cleanPhone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        landmark: shippingAddress.landmark,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: 'India'
      },
      pricing: {
        subtotal: calculatedSubtotal,
        discountAmount,
        shippingFee,
        taxAmount,
        totalAmount
      },
      paymentInfo: {
        method: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
        status: 'PENDING'
      },
      orderStatus: 'PLACED',
      shipment: {
        packageWeightGrams: totalPackageWeight,
        dimensionsCm: { length: 18, width: 12, height: 10 }
      },
      trackingTimeline: [{
        status: 'PLACED',
        title: 'Order Placed',
        description: 'We have received your order details.',
        timestamp: new Date(),
        updatedBy: 'SYSTEM'
      }],
      invoiceNumber,
      invoiceDate: new Date()
    });

    if (paymentMethod === 'ONLINE') {
      const razorpayRes = await createRazorpayOrder(totalAmount, orderId);
      newOrder.paymentInfo.razorpayOrderId = razorpayRes.order.id;

      // Save order with duplicate key retry safety
      let saveAttempts = 0;
      while (saveAttempts < 3) {
        try {
          await newOrder.save();
          break;
        } catch (saveErr) {
          if (saveErr.code === 11000 && saveErr.keyPattern?.orderId) {
            saveAttempts++;
            const freshOrderId = await this.generateOrderId();
            newOrder.orderId = freshOrderId;
            newOrder.invoiceNumber = `INV-${freshOrderId}`;
          } else {
            throw saveErr;
          }
        }
      }

      return {
        orderId: newOrder.orderId,
        totalAmount,
        razorpayOrder: razorpayRes.order,
        mode: razorpayRes.mode
      };
    }

    // COD: Save order first with duplicate key retry safety, then deduct stock
    let saveAttempts = 0;
    while (saveAttempts < 3) {
      try {
        await newOrder.save();
        break;
      } catch (saveErr) {
        if (saveErr.code === 11000 && saveErr.keyPattern?.orderId) {
          saveAttempts++;
          const freshOrderId = await this.generateOrderId();
          newOrder.orderId = freshOrderId;
          newOrder.invoiceNumber = `INV-${freshOrderId}`;
        } else {
          throw saveErr;
        }
      }
    }

    // Deduct stock after order is safely saved if automatic inventory sync is enabled
    const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;

    if (autoManageStock) {
      for (const item of validatedItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        }).catch(err => console.error('[Stock decrement error]:', err));
      }
      newOrder.isStockDeducted = true;
      await newOrder.save();
      realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_deducted' });
    }

    // 1. Send Order Confirmation Email to Customer via Nodemailer
    sendOrderConfirmationEmail(newOrder).catch(err => console.error('[Customer Email Dispatch Error]:', err.message));

    // 2. Send New Order Alert Email to Store Admin via Nodemailer
    sendAdminOrderNotificationEmail(newOrder).catch(err => console.error('[Admin Email Dispatch Error]:', err.message));

    // 3. In-App Notification to Admin
    NotificationService.notifyAdmin({
      type: 'NEW_ORDER',
      title: `New Order Placed: #${newOrder.orderId}`,
      message: `${newOrder.customerDetails?.fullName || 'Customer'} placed an order worth ₹${newOrder.pricing.totalAmount} (${newOrder.paymentInfo.method}).`,
      priority: 'HIGH',
      data: {
        orderId: newOrder.orderId,
        amount: newOrder.pricing.totalAmount,
        method: newOrder.paymentInfo.method,
        customerName: newOrder.customerDetails?.fullName
      },
      actionUrl: `/admin?tab=orders&orderId=${newOrder.orderId}`
    }).catch(err => console.error('[Admin Notification Error]:', err.message));

    // 4. In-App Notification to Customer
    NotificationService.notifyUser({
      userId: newOrder.user,
      userEmail: newOrder.customerDetails?.email,
      type: 'ORDER_PLACED',
      title: `Order Placed Successfully (#${newOrder.orderId})`,
      message: `Thank you for ordering with Novis Herbal! Your order #${newOrder.orderId} for ₹${newOrder.pricing.totalAmount} has been placed.`,
      priority: 'HIGH',
      data: { orderId: newOrder.orderId, totalAmount: newOrder.pricing.totalAmount },
      actionUrl: '/my-orders'
    }).catch(err => console.error('[Customer Notification Error]:', err.message));

    return {
      orderId: newOrder.orderId,
      order: newOrder
    };
  }

  static async verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      const error = new Error('Invalid payment signature. Transaction failed.');
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.findOne({ 'paymentInfo.razorpayOrderId': razorpayOrderId });
    if (!order) {
      const error = new Error('Matching order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.paymentInfo.status === 'PAID') {
      return { message: 'Payment already processed', orderId: order.orderId, order };
    }

    order.paymentInfo.status = 'PAID';
    order.paymentInfo.razorpayPaymentId = razorpayPaymentId;
    order.paymentInfo.razorpaySignature = razorpaySignature;
    order.paymentInfo.paidAt = new Date();

    const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
    const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;

    if (autoManageStock && !order.isStockDeducted) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        }).catch(err => console.error('[Razorpay stock decrement error]:', err));
      }
      order.isStockDeducted = true;
      realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_deducted' });
    }

    await order.save();

    // 1. Send Order Confirmation Email to Customer via Nodemailer
    sendOrderConfirmationEmail(order).catch(err => console.error('[Customer Email Dispatch Error]:', err.message));

    // 2. Send New Order Alert Email to Store Admin via Nodemailer
    sendAdminOrderNotificationEmail(order).catch(err => console.error('[Admin Email Dispatch Error]:', err.message));

    // 3. In-App Notification to Admin
    NotificationService.notifyAdmin({
      type: 'NEW_ORDER',
      title: `Prepaid Order Confirmed: #${order.orderId}`,
      message: `${order.customerDetails?.fullName || 'Customer'} paid ₹${order.pricing?.totalAmount} via Razorpay Online.`,
      priority: 'HIGH',
      data: {
        orderId: order.orderId,
        amount: order.pricing?.totalAmount,
        method: 'ONLINE_PREPAID'
      },
      actionUrl: `/admin?tab=orders&orderId=${order.orderId}`
    }).catch(err => console.error('[Admin Notification Error]:', err.message));

    // 4. In-App Notification to Customer
    NotificationService.notifyUser({
      userId: order.user,
      userEmail: order.customerDetails?.email,
      type: 'ORDER_PLACED',
      title: `Payment Received & Order Confirmed (#${order.orderId})`,
      message: `Your payment of ₹${order.pricing?.totalAmount} was successful. We are preparing your order!`,
      priority: 'HIGH',
      data: { orderId: order.orderId, totalAmount: order.pricing?.totalAmount },
      actionUrl: '/my-orders'
    }).catch(err => console.error('[Customer Notification Error]:', err.message));

    return {
      message: 'Payment verified successfully and order confirmed',
      orderId: order.orderId,
      order
    };
  }

  static async trackOrder(orderId) {
    const order = await Order.findOne({ orderId: orderId.toUpperCase() })
      .populate('items.product', 'name images volumeText');

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const isCod = order.paymentInfo?.method === 'COD';
    let effectivePaymentStatus = order.paymentInfo?.status || 'PENDING';
    if (isCod) {
      if (['CANCELLED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(order.orderStatus)) {
        effectivePaymentStatus = 'NOT_APPLICABLE';
      } else if (order.orderStatus !== 'DELIVERED') {
        effectivePaymentStatus = 'PENDING';
      }
    }

    return {
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      paymentStatus: effectivePaymentStatus,
      paymentMethod: order.paymentInfo?.method || 'ONLINE',
      paymentInfo: {
        method: order.paymentInfo?.method || 'ONLINE',
        status: effectivePaymentStatus
      },
      createdAt: order.createdAt,
      items: order.items,
      shippingAddress: order.shippingAddress,
      shipment: order.shipment,
      trackingTimeline: order.trackingTimeline,
      pricing: order.pricing
    };
  }

  static normalizeOrderPricing(order) {
    if (!order || !order.pricing) return order;
    const subtotal = Number(order.pricing.subtotal) || 0;
    const discountAmount = Number(order.pricing.discountAmount) || 0;
    const shippingFee = Number(order.pricing.shippingFee) || 0;
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);

    let taxAmount = order.pricing.taxAmount;
    if (taxAmount === undefined || taxAmount === null || taxAmount === 0) {
      taxAmount = taxableSubtotal > 0 ? Math.round(taxableSubtotal * 0.05) : 0;
      order.pricing.taxAmount = taxAmount;
    }

    const calculatedTotal = taxableSubtotal + shippingFee + taxAmount;
    if (order.pricing.totalAmount !== calculatedTotal) {
      order.pricing.totalAmount = calculatedTotal;
      if (order._id) {
        Order.updateOne(
          { _id: order._id },
          { $set: { 'pricing.taxAmount': taxAmount, 'pricing.totalAmount': calculatedTotal } }
        ).catch(() => { });
      }
    }
    return order;
  }

  static async getMyOrders(userId) {
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    for (const order of orders) {
      this.normalizeOrderPricing(order);
    }
    return orders;
  }

  static async getAllOrdersAdmin({ status, search, paymentMethod, period, startDate, endDate, page = 1, limit = 200 }) {
    const query = {};

    if (status && status !== 'ALL') query.orderStatus = status;
    if (paymentMethod && paymentMethod !== 'ALL') query['paymentInfo.method'] = paymentMethod;

    // Date Range Filtering (Today, This Week, This Month, This Year, Custom)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    } else if (period && period !== 'ALL') {
      const now = new Date();
      if (period === 'TODAY') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      } else if (period === 'THIS_WEEK') {
        const dayOfWeek = now.getDay(); // 0 is Sunday
        const start = new Date(now);
        start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        start.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: start, $lte: now };
      } else if (period === 'THIS_MONTH') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        query.createdAt = { $gte: start, $lte: now };
      } else if (period === 'THIS_YEAR') {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        query.createdAt = { $gte: start, $lte: now };
      }
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customerDetails.fullName': { $regex: search, $options: 'i' } },
        { 'customerDetails.phone': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } },
        { 'shipment.awbCode': { $regex: search, $options: 'i' } }
      ];
    }

    const effectiveLimit = Math.min(Number(limit) || 200, 1000);
    const skip = (Number(page) - 1) * effectiveLimit;

    // Auto-normalize undelivered COD orders: payment status MUST be PENDING (cash is only collected upon delivery)
    await Order.updateMany(
      {
        'paymentInfo.method': 'COD',
        orderStatus: { $nin: ['DELIVERED', 'CANCELLED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER', 'CANCELLATION_REQUESTED'] },
        'paymentInfo.status': { $ne: 'PENDING' }
      },
      {
        $set: {
          'paymentInfo.status': 'PENDING',
          'paymentInfo.paidAt': null
        }
      }
    ).catch(() => { });

    // Auto-normalize cancelled / RTO COD orders to NOT_APPLICABLE payment status
    await Order.updateMany(
      {
        'paymentInfo.method': 'COD',
        orderStatus: { $in: ['CANCELLED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'] },
        'paymentInfo.status': { $ne: 'NOT_APPLICABLE' }
      },
      {
        $set: {
          'paymentInfo.status': 'NOT_APPLICABLE',
          'refundInfo.status': 'NOT_APPLICABLE',
          'refundInfo.amount': 0
        }
      }
    ).catch(() => { });

    const [orders, total, allMatching] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(effectiveLimit),
      Order.countDocuments(query),
      Order.find(query).select('orderStatus pricing paymentInfo')
    ]);

    for (const order of orders) {
      this.normalizeOrderPricing(order);
    }

    const summary = {
      totalOrders: allMatching.length,
      totalRevenue: allMatching.reduce((acc, o) => {
        const sub = Number(o.pricing?.subtotal) || 0;
        const disc = Number(o.pricing?.discountAmount) || 0;
        const ship = Number(o.pricing?.shippingFee) || 0;
        const tax = Number(o.pricing?.taxAmount) || (sub > 0 ? Math.round((sub - disc) * 0.05) : 0);
        const tot = (o.pricing?.totalAmount && o.pricing.totalAmount > (sub - disc)) ? o.pricing.totalAmount : (sub - disc + ship + tax);
        return acc + tot;
      }, 0),
      deliveredCount: allMatching.filter(o => o.orderStatus === 'DELIVERED').length,
      inTransitCount: allMatching.filter(o => ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'SHIPMENT_BOOKED', 'PACKED', 'CONFIRMED', 'PICKED_UP'].includes(o.orderStatus)).length,
      cancelledCount: allMatching.filter(o => ['CANCELLED', 'CANCELLATION_REQUESTED'].includes(o.orderStatus)).length,
      rtoCount: allMatching.filter(o => ['RTO_INITIATED', 'IN_TRANSIT_TO_SELLER', 'RTO_IN_TRANSIT', 'RETURNED_TO_SELLER', 'RTO_COMPLETED'].includes(o.orderStatus)).length,
      codCount: allMatching.filter(o => o.paymentInfo?.method === 'COD').length,
      onlineCount: allMatching.filter(o => o.paymentInfo?.method === 'ONLINE').length
    };

    return {
      orders,
      page: Number(page),
      pages: Math.ceil(total / effectiveLimit),
      total,
      summary
    };
  }

  static async updateOrderStatus(orderMongoId, { status, note, location, reason }, adminUser) {
    const order = await Order.findById(orderMongoId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = status;

    order.trackingTimeline.push({
      status,
      title: `Status: ${status.replace(/_/g, ' ')}`,
      description: note || `Order updated to ${status} by admin`,
      location: location || 'Main Fulfillment Hub',
      timestamp: new Date(),
      updatedBy: adminUser ? adminUser.email : 'ADMIN'
    });

    if (status === 'DELIVERED') {
      order.shipment.deliveredAt = new Date();
      if (order.paymentInfo.method === 'COD') {
        order.paymentInfo.status = 'PAID';
        if (!order.paymentInfo.paidAt) {
          order.paymentInfo.paidAt = new Date();
        }
      }
      // Ensure stock deduction on delivery if not already deducted and auto-management is enabled
      const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
      const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;
      if (autoManageStock && !order.isStockDeducted) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity }
          }).catch(err => console.error('[Delivery stock decrement error]:', err));
        }
        order.isStockDeducted = true;
        realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_deducted' });
      }
    }

    if (status === 'CANCELLED' && !order.cancellation?.isCancelled) {
      order.cancellation = {
        isCancelled: true,
        status: 'CANCELLED',
        reason: reason || 'Cancelled by Store Administrator',
        cancelledBy: adminUser ? adminUser.email : 'ADMIN',
        cancelledAt: new Date()
      };

      const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
      const autoRestockOnCancellation = cmsConfig?.orderSettings?.autoRestockOnCancellation !== false;
      const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;

      // Restore inventory once if stock was deducted and auto-restock policy is active
      if (order.isStockDeducted && autoRestockOnCancellation && autoManageStock) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity }
          }).catch(err => console.error('[Restock error]:', err));
        }
        order.isStockDeducted = false;
        realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_restored' });
      }
      // If paid online, set refund status to PROCESSING; if COD, NOT_APPLICABLE
      if (order.paymentInfo?.status === 'PAID') {
        order.refundInfo = {
          status: 'PROCESSING',
          amount: order.pricing.totalAmount,
          method: 'ORIGINAL_SOURCE',
          initiatedAt: new Date()
        };
      } else {
        order.refundInfo = {
          status: 'NOT_APPLICABLE',
          amount: 0,
          method: 'ORIGINAL_SOURCE'
        };
        if (order.paymentInfo?.method === 'COD') {
          order.paymentInfo.status = 'NOT_APPLICABLE';
        }
      }
    }

    await order.save();

    await AuditLog.create({
      action: 'STATUS_UPDATE',
      entityType: 'ORDER',
      entityId: order.orderId,
      performedBy: {
        userId: adminUser?._id,
        email: adminUser?.email,
        role: adminUser?.role
      },
      reason: reason || note,
      previousState: { status: previousStatus },
      newState: { status: order.orderStatus }
    });

    // Send Courier Dispatch Email with tracking details to Customer via Nodemailer ONLY when DISPATCHED
    if (status === 'DISPATCHED') {
      sendOrderDispatchedEmail(order, note).catch(err => console.error('[Dispatch Email Error]:', err.message));
      NotificationService.notifyUser({
        userId: order.user,
        userEmail: order.customerDetails?.email,
        type: 'ORDER_DISPATCHED',
        title: `Order #${order.orderId} Dispatched!`,
        message: `Your package has been dispatched via ${order.shipment?.courierName || 'Courier Partner'}.${order.shipment?.awbCode || order.shipment?.trackingNumber ? ' Consignment No: ' + (order.shipment?.awbCode || order.shipment?.trackingNumber) : ''}`,
        priority: 'HIGH',
        data: {
          orderId: order.orderId,
          courier: order.shipment?.courierName,
          trackingNumber: order.shipment?.awbCode || order.shipment?.trackingNumber,
          trackingUrl: order.shipment?.trackingUrl
        },
        actionUrl: '/my-orders'
      }).catch(err => console.error('[Customer Notification Error]:', err.message));
    } else if (status === 'DELIVERED') {
      NotificationService.notifyUser({
        userId: order.user,
        userEmail: order.customerDetails?.email,
        type: 'ORDER_DELIVERED',
        title: `Order #${order.orderId} Delivered!`,
        message: `Your package has been successfully delivered. We hope you love your Novis Herbal products!`,
        priority: 'NORMAL',
        data: { orderId: order.orderId },
        actionUrl: '/my-orders'
      }).catch(err => console.error('[Customer Notification Error]:', err.message));
    }

    return order;
  }

  static async updatePaymentStatus(orderMongoId, { paymentStatus, note }, adminUser) {
    const order = await Order.findById(orderMongoId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const validStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'NOT_APPLICABLE', 'CANCELLED'];
    if (!validStatuses.includes(paymentStatus)) {
      const error = new Error('Invalid payment status provided');
      error.statusCode = 400;
      throw error;
    }

    // Guard: Prevent illegal payment status transitions for Cash on Delivery (COD)
    if (order.paymentInfo?.method === 'COD') {
      const isCancelledOrRTO = ['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED', 'RETURNED_TO_SELLER'].includes(order.orderStatus);
      if (isCancelledOrRTO) {
        if (paymentStatus === 'REFUNDED') {
          const error = new Error('Cannot set payment status to REFUNDED for COD order cancelled before delivery. Zero payment was collected from customer.');
          error.statusCode = 400;
          throw error;
        }
        if (paymentStatus === 'PAID') {
          const error = new Error('Cannot mark cancelled COD order as PAID because no doorstep delivery or cash collection took place.');
          error.statusCode = 400;
          throw error;
        }
      } else if (order.orderStatus !== 'DELIVERED') {
        if (paymentStatus === 'REFUNDED') {
          const error = new Error('Cannot set payment status to REFUNDED for COD order before delivery. Customer has not paid yet.');
          error.statusCode = 400;
          throw error;
        }
        if (paymentStatus === 'PAID') {
          const error = new Error('Cannot set payment status to PAID for Cash on Delivery (COD) order before delivery. Cash is only collected upon doorstep delivery.');
          error.statusCode = 400;
          throw error;
        }
      }
    }

    const previousPaymentStatus = order.paymentInfo?.status || 'PENDING';
    if (!order.paymentInfo) {
      order.paymentInfo = { method: 'COD', status: paymentStatus };
    } else {
      order.paymentInfo.status = paymentStatus;
    }

    if (paymentStatus === 'PAID' && !order.paymentInfo.paidAt) {
      order.paymentInfo.paidAt = new Date();
    }

    if (paymentStatus === 'REFUNDED') {
      if (!order.refundInfo) order.refundInfo = {};
      order.refundInfo.status = 'REFUNDED';
      order.refundInfo.isRefunded = true;
      order.refundInfo.refundedAt = new Date();
      order.refundInfo.amount = order.pricing?.totalAmount || 0;
      if (!order.refundInfo.gatewayRefundId) {
        order.refundInfo.gatewayRefundId = `REF-SETTLE-${Date.now()}`;
      }
    }

    order.trackingTimeline.push({
      status: order.orderStatus,
      title: `Payment: ${paymentStatus}`,
      description: note || `Payment status updated from ${previousPaymentStatus} to ${paymentStatus}`,
      timestamp: new Date(),
      updatedBy: adminUser ? adminUser.email : 'ADMIN'
    });

    await order.save();

    await AuditLog.create({
      action: 'PAYMENT_STATUS_UPDATE',
      entityType: 'ORDER',
      entityId: order.orderId,
      performedBy: {
        userId: adminUser?._id,
        email: adminUser?.email,
        role: adminUser?.role
      },
      reason: note || `Payment status changed to ${paymentStatus}`,
      previousState: { paymentStatus: previousPaymentStatus },
      newState: { paymentStatus }
    });

    return order;
  }

  // =========================================================================
  // 1. CUSTOMER CANCELLATION FLOW (Placed/Confirmed: Instant; Packed/Shipment Booked: Approval)
  // =========================================================================
  static async cancelOrderByCustomer(orderIdOrMongoId, { reason, description }, user) {
    const order = await Order.findOne({
      $or: [
        { _id: orderIdOrMongoId.match(/^[0-9a-fA-F]{24}$/) ? orderIdOrMongoId : null },
        { orderId: orderIdOrMongoId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    // Ownership check (unless admin)
    if (user && user.role !== 'admin') {
      const isOwner = (order.user && order.user.toString() === user._id.toString()) ||
        (order.customerDetails?.email && order.customerDetails.email.toLowerCase() === user.email.toLowerCase());
      if (!isOwner) {
        const error = new Error('Unauthorized access to this order');
        error.statusCode = 403;
        throw error;
      }
    }

    const currentStatus = order.orderStatus;
    const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
    const allowCancellationAfterPacking = cmsConfig?.orderSettings?.allowCancellationAfterPacking !== false;
    const autoRestockOnCancellation = cmsConfig?.orderSettings?.autoRestockOnCancellation !== false;

    // Rule 1: Placed / Confirmed -> Direct Instant Cancellation
    if (currentStatus === 'PLACED' || currentStatus === 'CONFIRMED') {
      order.orderStatus = 'CANCELLED';
      order.cancellation = {
        status: 'CANCELLED',
        isCancelled: true,
        reason: reason || 'Customer Cancelled',
        description: description || '',
        cancelledBy: 'CUSTOMER',
        cancelledAt: new Date()
      };

      const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;
      // Restore inventory if stock was deducted and auto-restock policy is enabled
      if (order.isStockDeducted && autoRestockOnCancellation && autoManageStock) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
        order.isStockDeducted = false;
        realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_restored' });
      }

      // If prepaid, process refund; if COD, mark not applicable
      if (order.paymentInfo?.status === 'PAID') {
        order.refundInfo = {
          status: 'PROCESSING',
          amount: order.pricing.totalAmount,
          method: 'ORIGINAL_SOURCE',
          initiatedAt: new Date()
        };
      } else {
        order.refundInfo = {
          status: 'NOT_APPLICABLE',
          amount: 0,
          method: 'ORIGINAL_SOURCE'
        };
        if (order.paymentInfo?.method === 'COD') {
          order.paymentInfo.status = 'NOT_APPLICABLE';
        }
      }

      order.trackingTimeline.push({
        status: 'CANCELLED',
        title: 'Order Cancelled by Customer',
        description: `Reason: ${reason || 'Customer requested'}${description ? ` (${description})` : ''}`,
        timestamp: new Date(),
        updatedBy: user ? user.email : 'CUSTOMER'
      });

      await order.save();

      // Notify Admin of Instant Cancellation
      NotificationService.notifyAdmin({
        type: 'ORDER_CANCELLED',
        title: `Order Cancelled: #${order.orderId}`,
        message: `Order #${order.orderId} was cancelled by ${user?.name || order.customerDetails?.fullName || 'Customer'}. Stock restored.`,
        priority: 'NORMAL',
        data: { orderId: order.orderId, reason },
        actionUrl: `/admin?tab=orders&orderId=${order.orderId}`
      }).catch(err => console.error('[Admin Notification Error]:', err.message));

      // Notify Customer
      NotificationService.notifyUser({
        userId: order.user,
        userEmail: order.customerDetails?.email,
        type: 'ORDER_CANCELLED',
        title: `Order #${order.orderId} Cancelled`,
        message: `Your order #${order.orderId} has been successfully cancelled.${order.paymentInfo?.status === 'PAID' ? ' Refund has been initiated to your original payment method.' : ''}`,
        priority: 'NORMAL',
        data: { orderId: order.orderId },
        actionUrl: '/my-orders'
      }).catch(err => console.error('[Customer Notification Error]:', err.message));

      return {
        success: true,
        instant: true,
        message: 'Order cancelled successfully. If paid online, your refund has been initiated.',
        order
      };
    }

    // Rule 2: Packed / Shipment Booked -> Governed by allowCancellationAfterPacking Store Policy
    if (currentStatus === 'PACKED' || currentStatus === 'SHIPMENT_BOOKED') {
      if (!allowCancellationAfterPacking) {
        const error = new Error('Cancellation is not permitted once your parcel has been packed for dispatch according to current store policy.');
        error.statusCode = 400;
        throw error;
      }

      order.orderStatus = 'CANCELLATION_REQUESTED';
      order.cancellation = {
        status: 'REQUESTED',
        isCancelled: false,
        reason: reason || 'Customer Requested Cancellation',
        description: description || '',
        requestedAt: new Date(),
        cancelledBy: 'CUSTOMER'
      };

      order.trackingTimeline.push({
        status: 'CANCELLATION_REQUESTED',
        title: 'Cancellation Requested by Customer',
        description: `Reason: ${reason || 'Customer requested'}${description ? ` (${description})` : ''} - Awaiting seller/admin approval`,
        timestamp: new Date(),
        updatedBy: user ? user.email : 'CUSTOMER'
      });

      await order.save();

      // Notify Admin of Cancellation Request
      NotificationService.notifyAdmin({
        type: 'CANCELLATION_REQUESTED',
        title: `Cancellation Requested: #${order.orderId}`,
        message: `${order.customerDetails?.fullName || 'Customer'} requested cancellation for #${order.orderId}. Reason: "${reason || 'Customer request'}".`,
        priority: 'HIGH',
        data: { orderId: order.orderId, reason },
        actionUrl: `/admin?tab=orders&orderId=${order.orderId}`
      }).catch(err => console.error('[Admin Notification Error]:', err.message));

      // Notify Customer
      NotificationService.notifyUser({
        userId: order.user,
        userEmail: order.customerDetails?.email,
        type: 'CANCELLATION_REQUESTED',
        title: `Cancellation Request Received (#${order.orderId})`,
        message: `We received your cancellation request for order #${order.orderId}. Our fulfillment team will review it shortly.`,
        priority: 'NORMAL',
        data: { orderId: order.orderId },
        actionUrl: '/my-orders'
      }).catch(err => console.error('[Customer Notification Error]:', err.message));

      return {
        success: true,
        instant: false,
        message: 'Cancellation request submitted. As your parcel is already packed/booked, our fulfillment team will verify and approve it shortly.',
        order
      };
    }

    // Rule 3: In Transit -> Not allowed
    if (['IN_TRANSIT', 'PICKED_UP'].includes(currentStatus)) {
      const error = new Error('Order is already in transit with courier. It cannot normally be cancelled after courier pickup.');
      error.statusCode = 400;
      throw error;
    }

    // Rule 4: Out for Delivery -> Refuse delivery for RTO
    if (currentStatus === 'OUT_FOR_DELIVERY') {
      const error = new Error('Order is out for delivery. You can refuse delivery upon courier arrival, and the parcel will automatically follow the RTO process.');
      error.statusCode = 400;
      throw error;
    }

    // Rule 5: Delivered -> Strictly Non-Returnable
    if (currentStatus === 'DELIVERED') {
      const error = new Error('Delivered orders cannot be cancelled. All Novise Ayurvedic products are strictly non-returnable. If your order arrived damaged, defective, or missing items, you can raise an issue complaint.');
      error.statusCode = 400;
      throw error;
    }

    // Already cancelled or closed
    if (currentStatus === 'CANCELLED' || currentStatus === 'RTO_COMPLETED') {
      const error = new Error(`Order is already ${currentStatus.toLowerCase()} and cannot be cancelled.`);
      error.statusCode = 400;
      throw error;
    }

    const error = new Error(`Cannot cancel order in status ${currentStatus}`);
    error.statusCode = 400;
    throw error;
  }

  // =========================================================================
  // 2. ADMIN CANCELLATION APPROVAL / REJECTION
  // =========================================================================
  static async reviewCancellationRequest(orderIdOrMongoId, { action, rejectionReason }, adminUser) {
    const order = await Order.findOne({
      $or: [
        { _id: orderIdOrMongoId.match(/^[0-9a-fA-F]{24}$/) ? orderIdOrMongoId : null },
        { orderId: orderIdOrMongoId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.orderStatus !== 'CANCELLATION_REQUESTED') {
      const error = new Error('No pending cancellation request found for this order.');
      error.statusCode = 400;
      throw error;
    }

    if (action === 'APPROVE') {
      const cmsConfig = await CMS.findOne({ key: 'global_cms' }).lean();
      const autoRestockOnCancellation = cmsConfig?.orderSettings?.autoRestockOnCancellation !== false;

      order.orderStatus = 'CANCELLED';
      order.cancellation.status = 'APPROVED';
      order.cancellation.isCancelled = true;
      order.cancellation.cancelledAt = new Date();
      order.cancellation.reviewedBy = adminUser ? adminUser.email : 'ADMIN';
      order.cancellation.reviewedAt = new Date();

      const autoManageStock = cmsConfig?.orderSettings?.autoManageStock !== false;
      // Restore inventory if stock was deducted and auto-restock policy is enabled
      if (order.isStockDeducted && autoRestockOnCancellation && autoManageStock) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
        order.isStockDeducted = false;
        realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_restored' });
      }

      // If prepaid, process refund; if COD, mark not applicable
      if (order.paymentInfo?.status === 'PAID') {
        order.refundInfo = {
          status: 'PROCESSING',
          amount: order.pricing.totalAmount,
          method: 'ORIGINAL_SOURCE',
          initiatedAt: new Date()
        };
      } else {
        order.refundInfo = {
          status: 'NOT_APPLICABLE',
          amount: 0,
          method: 'ORIGINAL_SOURCE'
        };
        if (order.paymentInfo?.method === 'COD') {
          order.paymentInfo.status = 'NOT_APPLICABLE';
        }
      }

      order.trackingTimeline.push({
        status: 'CANCELLED',
        title: 'Cancellation Request Approved',
        description: 'Order cancelled by admin upon customer request. Product stock restored.',
        timestamp: new Date(),
        updatedBy: adminUser ? adminUser.email : 'ADMIN'
      });

      await order.save();

      // Notify Customer of Approval
      NotificationService.notifyUser({
        userId: order.user,
        userEmail: order.customerDetails?.email,
        type: 'CANCELLATION_APPROVED',
        title: `Cancellation Request Approved (#${order.orderId})`,
        message: `Your cancellation request for order #${order.orderId} was approved. Stock restored.${order.paymentInfo?.status === 'PAID' ? ' Refund will be credited within 3-5 business days.' : ''}`,
        priority: 'HIGH',
        data: { orderId: order.orderId },
        actionUrl: '/my-orders'
      }).catch(err => console.error('[Customer Notification Error]:', err.message));

      return { success: true, message: 'Cancellation approved. Order is now cancelled and stock restored.', order };
    }

    if (action === 'REJECT') {
      // Revert status: if AWB exists, SHIPMENT_BOOKED; else PACKED
      const revertStatus = order.shipment?.awbCode ? 'SHIPMENT_BOOKED' : 'PACKED';
      order.orderStatus = revertStatus;
      order.cancellation.status = 'REJECTED';
      order.cancellation.rejectionReason = rejectionReason || 'Cancellation request rejected by store administrator';
      order.cancellation.reviewedBy = adminUser ? adminUser.email : 'ADMIN';
      order.cancellation.reviewedAt = new Date();

      order.trackingTimeline.push({
        status: revertStatus,
        title: 'Cancellation Request Rejected',
        description: `Reason: ${order.cancellation.rejectionReason}. Resuming standard fulfillment.`,
        timestamp: new Date(),
        updatedBy: adminUser ? adminUser.email : 'ADMIN'
      });

      await order.save();

      // Notify Customer of Rejection
      NotificationService.notifyUser({
        userId: order.user,
        userEmail: order.customerDetails?.email,
        type: 'CANCELLATION_REJECTED',
        title: `Cancellation Request Rejected (#${order.orderId})`,
        message: `Your cancellation request for order #${order.orderId} was rejected: ${order.cancellation.rejectionReason}`,
        priority: 'HIGH',
        data: { orderId: order.orderId, reason: order.cancellation.rejectionReason },
        actionUrl: '/my-orders'
      }).catch(err => console.error('[Customer Notification Error]:', err.message));

      return { success: true, message: 'Cancellation request rejected. Order reverted to active fulfillment.', order };
    }

    const error = new Error('Invalid review action. Use APPROVE or REJECT.');
    error.statusCode = 400;
    throw error;
  }

  // =========================================================================
  // 3. EXCEPTIONAL COMPLAINT WORKFLOW (Damaged/Defective/Leakage Claims - Non-Returnable Products)
  // Workflow: Complaint Submitted -> Under Review -> Approved / Rejected -> Resolution Completed
  // =========================================================================
  static async submitOrderComplaint(orderIdOrMongoId, { reason, description, customerPhone, videoUrl, videoPublicId, videoDuration, images = [], bankDetails }, user) {
    const order = await Order.findOne({
      $or: [
        { _id: orderIdOrMongoId.match(/^[0-9a-fA-F]{24}$/) ? orderIdOrMongoId : null },
        { orderId: orderIdOrMongoId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (user && user.role !== 'admin') {
      const isOwner = (order.user && order.user.toString() === user._id.toString()) ||
        (order.customerDetails?.email && order.customerDetails.email.toLowerCase() === user.email.toLowerCase());
      if (!isOwner) {
        const error = new Error('Unauthorized access to this order');
        error.statusCode = 403;
        throw error;
      }
    }

    if (order.orderStatus !== 'DELIVERED') {
      const error = new Error('Issue complaints can only be submitted after the order has been delivered.');
      error.statusCode = 400;
      throw error;
    }

    // Dynamic Delivery Report Window check (from Store Settings / CMS)
    const cms = await CMS.findOne({ key: 'global_cms' }).lean();
    const windowHours = cms?.orderSettings?.damagedReportWindowHours ?? 2;
    const deliveredAt = order.shipment?.deliveredAt || order.updatedAt;
    const windowMs = windowHours * 60 * 60 * 1000;
    const elapsedMs = Date.now() - new Date(deliveredAt).getTime();

    if (elapsedMs > windowMs) {
      if (videoPublicId) {
        await CloudinaryService.deleteVideoByPublicId(videoPublicId).catch(() => { });
      }
      const error = new Error(`The damage report window has expired. Reports must be submitted within ${windowHours} hours of delivery.`);
      error.statusCode = 400;
      throw error;
    }

    // Mandatory Phone validation
    if (!customerPhone || !customerPhone.trim()) {
      const error = new Error('Customer mobile number is required to process your report.');
      error.statusCode = 400;
      throw error;
    }
    const cleanPhone = sanitizePhoneNumber(customerPhone);
    if (!isValidIndianPhone(cleanPhone)) {
      const error = new Error('Please enter a valid 10-digit Indian mobile number.');
      error.statusCode = 400;
      throw error;
    }

    // Mandatory Video Proof validation (1 to 2 minutes)
    if (!videoUrl || !videoUrl.trim()) {
      const error = new Error('Parcel and product unboxing/condition video proof is mandatory for report verification.');
      error.statusCode = 400;
      throw error;
    }

    // Mandatory Reason
    if (!reason || !reason.trim()) {
      const error = new Error('Please select an issue category.');
      error.statusCode = 400;
      throw error;
    }

    order.complaint = {
      hasComplaint: true,
      status: 'SUBMITTED',
      reason: reason.trim(),
      customerPhone: cleanPhone,
      description: description ? description.trim() : '',
      videoUrl: videoUrl.trim(),
      videoPublicId: videoPublicId || '',
      videoDuration: Number(videoDuration) || 0,
      images: Array.isArray(images) ? images : [],
      submittedAt: new Date(),
      bankDetails: (order.paymentInfo?.method === 'COD' || order.paymentMethod === 'COD') ? bankDetails : undefined
    };

    order.trackingTimeline.push({
      status: order.orderStatus,
      title: 'Customer Complaint Submitted',
      description: `Reason: ${reason}. Mobile: +91 ${cleanPhone}. Video proof attached (${videoDuration ? `${Math.round(videoDuration)}s` : '1-2 mins'}). Awaiting store review.`,
      timestamp: new Date(),
      updatedBy: user ? user.email : 'CUSTOMER'
    });

    await order.save();
    realtimeService.broadcast('ORDER_UPDATED', { orderId: order.orderId, complaint: order.complaint });

    // Notify Admin of Customer Damage Claim
    NotificationService.notifyAdmin({
      type: 'CUSTOMER_CLAIM',
      title: `Damage Claim Reported: #${order.orderId}`,
      message: `${order.customerDetails?.fullName || 'Customer'} reported an issue (${reason}) with uploaded video verification proof.`,
      priority: 'URGENT',
      data: { orderId: order.orderId, reason },
      actionUrl: `/admin?tab=orders&orderId=${order.orderId}`
    }).catch(err => console.error('[Admin Notification Error]:', err.message));

    // Notify Customer that claim was received
    NotificationService.notifyUser({
      userId: order.user,
      userEmail: order.customerDetails?.email,
      type: 'CLAIM_SUBMITTED',
      title: `Damage Claim Submitted (#${order.orderId})`,
      message: `Your issue report with video proof for order #${order.orderId} was received and is under store review.`,
      priority: 'NORMAL',
      data: { orderId: order.orderId },
      actionUrl: '/my-orders'
    }).catch(err => console.error('[Customer Notification Error]:', err.message));

    return {
      success: true,
      message: 'Complaint submitted successfully with video proof. Our team will review your video and details within 24 hours.',
      order
    };
  }

  static async deleteComplaintVideo(orderIdOrMongoId, adminUser) {
    const order = await Order.findOne({
      $or: [
        { _id: orderIdOrMongoId.match(/^[0-9a-fA-F]{24}$/) ? orderIdOrMongoId : null },
        { orderId: orderIdOrMongoId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (!order.complaint?.videoUrl && !order.complaint?.videoPublicId) {
      const error = new Error('No video attached to this complaint');
      error.statusCode = 400;
      throw error;
    }

    const publicId = order.complaint.videoPublicId;
    const url = order.complaint.videoUrl;

    if (publicId) {
      await CloudinaryService.deleteVideoByPublicId(publicId);
    } else if (url) {
      await CloudinaryService.deleteMediaByUrl(url);
    }

    order.complaint.videoUrl = '';
    order.complaint.videoPublicId = '';
    order.complaint.videoDuration = 0;
    order.complaint.videoDeletedByAdmin = true;
    order.complaint.videoDeletedAt = new Date();
    order.complaint.videoDeletedBy = adminUser?.email || 'ADMIN';

    order.trackingTimeline.push({
      status: order.orderStatus,
      title: 'Complaint Video Removed',
      description: `Report verification video was permanently deleted from Cloudinary folder Order_Report_Videos by ${adminUser?.email || 'ADMIN'}`,
      timestamp: new Date(),
      updatedBy: adminUser?.email || 'ADMIN'
    });

    await order.save();
    realtimeService.broadcast('ORDER_UPDATED', { orderId: order.orderId, complaint: order.complaint });
    return { success: true, message: 'Video permanently deleted from Cloudinary and order record.', order };
  }

  static async reviewOrderComplaint(orderIdOrMongoId, { action, resolutionType, resolutionNotes, rejectionReason }, adminUser) {
    const order = await Order.findOne({
      $or: [
        { _id: orderIdOrMongoId.match(/^[0-9a-fA-F]{24}$/) ? orderIdOrMongoId : null },
        { orderId: orderIdOrMongoId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (!order.complaint?.hasComplaint) {
      const error = new Error('No complaint recorded for this order.');
      error.statusCode = 400;
      throw error;
    }

    if (action === 'UNDER_REVIEW') {
      order.complaint.status = 'UNDER_REVIEW';
      order.complaint.reviewedBy = adminUser?.email || 'ADMIN';
      order.complaint.reviewedAt = new Date();
    } else if (action === 'REJECT') {
      order.complaint.status = 'REJECTED';
      order.complaint.rejectionReason = rejectionReason || 'Complaint does not meet exception policy';
      order.complaint.reviewedBy = adminUser?.email || 'ADMIN';
      order.complaint.reviewedAt = new Date();
    } else if (action === 'RESOLVE' || action === 'APPROVE') {
      order.complaint.status = 'RESOLVED';
      order.complaint.resolutionType = resolutionType || 'REFUND';
      order.complaint.resolutionNotes = resolutionNotes || 'Resolved by admin';
      order.complaint.resolvedAt = new Date();

      if (resolutionType === 'REFUND') {
        order.refundInfo = {
          status: 'PROCESSING',
          amount: order.pricing.totalAmount,
          method: order.paymentInfo?.method === 'COD' ? 'BANK_TRANSFER' : 'ORIGINAL_SOURCE',
          initiatedAt: new Date()
        };
      }
    }

    order.trackingTimeline.push({
      status: order.orderStatus,
      title: `Complaint Status: ${order.complaint.status}`,
      description: resolutionNotes || rejectionReason || 'Complaint reviewed by store team',
      timestamp: new Date(),
      updatedBy: adminUser?.email || 'ADMIN'
    });

    await order.save();

    // Notify Customer of Complaint Resolution
    if (['RESOLVED', 'REJECTED', 'UNDER_REVIEW'].includes(order.complaint.status)) {
      const isResolved = order.complaint.status === 'RESOLVED';
      const isRejected = order.complaint.status === 'REJECTED';
      NotificationService.notifyUser({
        userId: order.user,
        userEmail: order.customerDetails?.email,
        type: isResolved ? 'CLAIM_RESOLVED' : (isRejected ? 'CLAIM_REJECTED' : 'CLAIM_UPDATED'),
        title: isResolved
          ? `Damage Claim Resolved (#${order.orderId})`
          : (isRejected ? `Damage Claim Update (#${order.orderId})` : `Claim Under Review (#${order.orderId})`),
        message: isResolved
          ? `Your claim for order #${order.orderId} was approved! Resolution: ${resolutionNotes || 'Refund/Replacement processed'}.`
          : (isRejected ? `Your claim for order #${order.orderId} was not approved: ${rejectionReason || 'Policy criteria not met'}.` : `Your claim for order #${order.orderId} is being reviewed by our specialists.`),
        priority: isResolved ? 'HIGH' : 'NORMAL',
        data: { orderId: order.orderId, status: order.complaint.status },
        actionUrl: '/my-orders'
      }).catch(err => console.error('[Customer Notification Error]:', err.message));
    }

    return { success: true, message: `Complaint updated to ${order.complaint.status}`, order };
  }

  // =========================================================================
  // 4. REFUND LIFECYCLE MANAGEMENT (Not Applicable -> Pending Approval -> Processing -> Refunded / Failed)
  // =========================================================================
  static async processRefund(orderIdOrMongoId, { action, refundMethod, amount, gatewayRefundId, failureReason, notes }, adminUser) {
    const order = await Order.findOne({
      $or: [
        { _id: orderIdOrMongoId.match(/^[0-9a-fA-F]{24}$/) ? orderIdOrMongoId : null },
        { orderId: orderIdOrMongoId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    // Strict Guard: Cash on Delivery (COD) orders cancelled before delivery collected ₹0
    if (order.paymentInfo?.method === 'COD' && order.paymentInfo?.status !== 'PAID' && action !== 'NOT_APPLICABLE') {
      const error = new Error('Refund cannot be processed for Cash on Delivery (COD) order before delivery because zero payment was collected from the customer.');
      error.statusCode = 400;
      throw error;
    }
    if (['CANCELLED', 'CANCELLATION_REQUESTED', 'RTO_COMPLETED'].includes(order.orderStatus) && order.paymentInfo?.method === 'COD' && action !== 'NOT_APPLICABLE') {
      const error = new Error('Refund cannot be processed for a cancelled Cash on Delivery (COD) order. Zero payment was collected.');
      error.statusCode = 400;
      throw error;
    }

    const refundAmount = amount !== undefined ? amount : order.pricing.totalAmount;

    switch (action) {
      case 'NOT_APPLICABLE':
        order.refundInfo.status = 'NOT_APPLICABLE';
        order.refundInfo.amount = 0;
        break;

      case 'PENDING_APPROVAL':
        order.refundInfo.status = 'PENDING_APPROVAL';
        order.refundInfo.amount = refundAmount;
        order.refundInfo.method = refundMethod || (order.paymentInfo?.method === 'COD' ? 'BANK_TRANSFER' : 'ORIGINAL_SOURCE');
        order.refundInfo.initiatedAt = new Date();
        break;

      case 'PROCESSING':
        order.refundInfo.status = 'PROCESSING';
        order.refundInfo.amount = refundAmount;
        order.refundInfo.method = refundMethod || (order.paymentInfo?.method === 'COD' ? 'BANK_TRANSFER' : 'ORIGINAL_SOURCE');
        break;

      case 'COMPLETE':
      case 'REFUNDED':
        order.refundInfo.status = 'REFUNDED';
        order.refundInfo.isRefunded = true;
        order.refundInfo.amount = refundAmount;
        order.refundInfo.refundedAt = new Date();
        order.refundInfo.gatewayRefundId = gatewayRefundId || `REF-${Date.now()}`;
        order.paymentInfo.status = 'REFUNDED';
        order.trackingTimeline.push({
          status: order.orderStatus,
          title: `Refund Completed: ₹${refundAmount}`,
          description: `Processed via ${order.refundInfo.method || 'payment gateway'}. Ref ID: ${order.refundInfo.gatewayRefundId}`,
          timestamp: new Date(),
          updatedBy: adminUser ? adminUser.email : 'ADMIN'
        });
        break;

      case 'FAIL':
      case 'FAILED':
        order.refundInfo.status = 'FAILED';
        order.refundInfo.failureReason = failureReason || 'Gateway timeout or incorrect bank credentials';
        order.refundInfo.manualResolutionNotes = notes || '';
        order.trackingTimeline.push({
          status: order.orderStatus,
          title: 'Refund Attempt Failed',
          description: `Reason: ${order.refundInfo.failureReason}. Manual resolution or retry required.`,
          timestamp: new Date(),
          updatedBy: adminUser ? adminUser.email : 'ADMIN'
        });
        break;

      default:
        throw new Error(`Invalid refund action: ${action}`);
    }

    await order.save();
    return { success: true, message: `Refund status updated to ${order.refundInfo.status}`, order };
  }

  // =========================================================================
  // 7. RTO (RETURN TO ORIGIN) LIFECYCLE (Non-Returnable Products)
  // Workflow: RTO Initiated -> In Transit to Seller -> Returned to Seller -> RTO Completed
  // =========================================================================
  static async processRTO(orderIdOrMongoId, { action, reason, condition = 'SELLABLE', notes }, adminUser) {
    const order = await Order.findOne({
      $or: [
        { _id: orderIdOrMongoId.match(/^[0-9a-fA-F]{24}$/) ? orderIdOrMongoId : null },
        { orderId: orderIdOrMongoId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    switch (action) {
      case 'INITIATE':
        order.orderStatus = 'RTO_INITIATED';
        order.rtoDetails = {
          isRTO: true,
          status: 'INITIATED',
          reason: reason || 'Customer Refused Delivery / Unreachable at Doorstep',
          initiatedAt: new Date()
        };
        order.trackingTimeline.push({
          status: 'RTO_INITIATED',
          title: 'RTO Initiated',
          description: `Reason: ${order.rtoDetails.reason}. Parcel returning to seller warehouse.`,
          timestamp: new Date(),
          updatedBy: adminUser ? adminUser.email : 'ADMIN'
        });
        break;

      case 'IN_TRANSIT':
        order.orderStatus = 'IN_TRANSIT_TO_SELLER';
        order.rtoDetails.status = 'IN_TRANSIT_TO_SELLER';
        order.trackingTimeline.push({
          status: 'IN_TRANSIT_TO_SELLER',
          title: 'RTO: In Transit to Seller',
          description: 'Parcel is travelling back via courier to warehouse.',
          timestamp: new Date(),
          updatedBy: adminUser ? adminUser.email : 'ADMIN'
        });
        break;

      case 'RETURNED_TO_SELLER':
        order.orderStatus = 'RETURNED_TO_SELLER';
        order.rtoDetails.status = 'RETURNED_TO_SELLER';
        order.rtoDetails.returnedToSellerAt = new Date();
        order.trackingTimeline.push({
          status: 'RETURNED_TO_SELLER',
          title: 'RTO: Returned to Seller',
          description: 'Parcel arrived at warehouse. Pending condition inspection.',
          timestamp: new Date(),
          updatedBy: adminUser ? adminUser.email : 'ADMIN'
        });
        break;

      case 'COMPLETE':
        order.orderStatus = 'RTO_COMPLETED';
        order.rtoDetails.status = 'COMPLETED';
        order.rtoDetails.completedAt = new Date();
        order.rtoDetails.condition = condition;
        order.rtoDetails.inspectionNotes = notes || '';

        // Restore stock ONLY if product is in sellable condition
        if (condition === 'SELLABLE') {
          if (!order.rtoDetails.isRestocked) {
            for (const item of order.items) {
              await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
            order.rtoDetails.isRestocked = true;
          }
        } else {
          // Damaged or unsellable products MUST NOT be restored to stock
          order.rtoDetails.isRestocked = false;
        }

        // If prepaid online, move refund to PROCESSING
        if (order.paymentInfo?.status === 'PAID') {
          order.refundInfo = {
            status: 'PROCESSING',
            amount: order.pricing.totalAmount,
            method: 'ORIGINAL_SOURCE',
            initiatedAt: new Date()
          };
        } else {
          order.refundInfo = {
            status: 'NOT_APPLICABLE',
            amount: 0,
            method: 'ORIGINAL_SOURCE'
          };
          if (order.paymentInfo?.method === 'COD') {
            order.paymentInfo.status = 'NOT_APPLICABLE';
          }
        }

        order.trackingTimeline.push({
          status: 'RTO_COMPLETED',
          title: 'RTO Completed',
          description: `Inspection: ${condition === 'SELLABLE' ? 'Product Sellable (Stock Restored)' : 'Product Damaged/Unsellable (Stock Not Restored)'}. Order closed.`,
          timestamp: new Date(),
          updatedBy: adminUser ? adminUser.email : 'ADMIN'
        });
        break;

      default:
        throw new Error(`Invalid RTO action: ${action}`);
    }

    await order.save();
    return { success: true, message: `RTO status updated to ${order.orderStatus}`, order };
  }

  // =========================================================================
  // 8. CONFIGURABLE RETURN WINDOW DAYS (Per Order & Global Settings)
  // =========================================================================
  static async getGlobalOrderSettings() {
    const cms = await CMS.findOne({ key: 'global_cms' }).lean();
    return {
      orderSettings: {
        allowCancellationAfterPacking: cms?.orderSettings?.allowCancellationAfterPacking !== false,
        autoRestockOnCancellation: cms?.orderSettings?.autoRestockOnCancellation !== false,
        autoManageStock: cms?.orderSettings?.autoManageStock !== false,
        damagedReportWindowHours: cms?.orderSettings?.damagedReportWindowHours ?? 2,
        maxReportVideoMinutes: cms?.orderSettings?.maxReportVideoMinutes ?? 3
      },
      storeSettings: {
        storeName: cms?.storeSettings?.storeName || 'Novise Herbal',
        legalEntityName: cms?.storeSettings?.legalEntityName || 'Novis Herbal Naturals',
        sellerState: cms?.storeSettings?.sellerState || 'Gujarat',
        gstPercentage: cms?.storeSettings?.gstPercentage !== undefined ? Number(cms.storeSettings.gstPercentage) : 5,
        supportEmail: cms?.storeSettings?.supportEmail || 'support@novise.in',
        supportPhone: cms?.storeSettings?.supportPhone || '+91 98765 43210',
        supportWhatsApp: cms?.storeSettings?.supportWhatsApp || '+91 98765 43210',
        businessAddress: cms?.storeSettings?.businessAddress || 'Novise Naturals, Mumbai, Maharashtra, India',
        gstNumber: cms?.storeSettings?.gstNumber || '27AAAAA0000A1Z5',
        invoiceTerms: cms?.storeSettings?.invoiceTerms || '• Authentic Ayurvedic personal-care formulation with tamper-evident seal.\n• All items once delivered are strictly Non-Returnable and Non-Replaceable for hygiene & safety.\n• This is a computer-generated tax invoice and requires no physical signature.',
        currencySymbol: cms?.storeSettings?.currencySymbol || '₹',
        isFreeShippingEnabled: cms?.storeSettings?.isFreeShippingEnabled !== false,
        freeShippingThreshold: cms?.storeSettings?.freeShippingThreshold ?? 0,
        standardShippingFee: cms?.storeSettings?.standardShippingFee ?? 0,
        codFee: cms?.storeSettings?.codFee ?? 0,
        estimatedDeliveryText: cms?.storeSettings?.estimatedDeliveryText || '3-5 Business Days',
        enableOrderEmails: cms?.storeSettings?.enableOrderEmails !== false,
        enableStatusUpdateEmails: cms?.storeSettings?.enableStatusUpdateEmails !== false,
        enableAdminAlerts: cms?.storeSettings?.enableAdminAlerts !== false,
        ...(cms?.storeSettings || {})
      }
    };
  }

  static async updateGlobalOrderSettings(payload) {
    const updateFields = {};
    if (payload.orderSettings) {
      if (payload.orderSettings.allowCancellationAfterPacking !== undefined) {
        updateFields['orderSettings.allowCancellationAfterPacking'] = Boolean(payload.orderSettings.allowCancellationAfterPacking);
      }
      if (payload.orderSettings.autoRestockOnCancellation !== undefined) {
        updateFields['orderSettings.autoRestockOnCancellation'] = Boolean(payload.orderSettings.autoRestockOnCancellation);
      }
      if (payload.orderSettings.autoManageStock !== undefined) {
        updateFields['orderSettings.autoManageStock'] = Boolean(payload.orderSettings.autoManageStock);
      }
      if (payload.orderSettings.damagedReportWindowHours !== undefined) {
        updateFields['orderSettings.damagedReportWindowHours'] = Math.max(1, Math.min(72, Number(payload.orderSettings.damagedReportWindowHours) || 2));
      }
      if (payload.orderSettings.maxReportVideoMinutes !== undefined) {
        updateFields['orderSettings.maxReportVideoMinutes'] = Math.max(1, Math.min(10, Number(payload.orderSettings.maxReportVideoMinutes) || 3));
      }
    }

    if (payload.storeSettings) {
      for (const [key, value] of Object.entries(payload.storeSettings)) {
        updateFields[`storeSettings.${key}`] = value;
      }
      // Keep policies.contactUs fully synchronized so no legacy/fallback code ever sees stale data
      if (payload.storeSettings.supportPhone) {
        updateFields['policies.contactUs.phone'] = payload.storeSettings.supportPhone;
      }
      if (payload.storeSettings.supportWhatsApp) {
        updateFields['policies.contactUs.whatsapp'] = payload.storeSettings.supportWhatsApp;
      }
      if (payload.storeSettings.supportEmail) {
        updateFields['policies.contactUs.email'] = payload.storeSettings.supportEmail;
      }
      if (payload.storeSettings.businessAddress) {
        updateFields['policies.contactUs.address'] = payload.storeSettings.businessAddress;
      }
    }

    const cms = await CMS.findOneAndUpdate(
      { key: 'global_cms' },
      { $set: updateFields },
      { upsert: true, new: true }
    );
    realtimeService.broadcast('SETTINGS_UPDATED', { cms });
    return {
      orderSettings: cms.orderSettings,
      storeSettings: cms.storeSettings,
      cms
    };
  }

  static async getInvoiceData(idOrOrderId) {
    const order = await Order.findOne({
      $or: [
        { _id: idOrOrderId.match(/^[0-9a-fA-F]{24}$/) ? idOrOrderId : null },
        { orderId: idOrOrderId }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    return this.normalizeOrderPricing(order);
  }

  static async deleteOrder(orderId, adminUser) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    // If order had its stock deducted and was not already cancelled or refunded, restore inventory stock
    const isCancelledOrRefunded = ['CANCELLED', 'REFUNDED'].includes(order.orderStatus);
    if (order.isStockDeducted && !isCancelledOrRefunded && order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity }
          }).catch(err => console.error('[Restock delete error]:', err));
        }
      }
      realtimeService.broadcast('PRODUCT_UPDATED', { action: 'stock_restored' });
    }

    // If order had an attached complaint video in Cloudinary, permanently remove it
    if (order.complaint?.videoPublicId) {
      try {
        await CloudinaryService.deleteVideoByPublicId(order.complaint.videoPublicId);
      } catch (vidErr) {
        console.error('Failed to delete complaint video from Cloudinary during order deletion:', vidErr);
      }
    } else if (order.complaint?.videoUrl) {
      try {
        await CloudinaryService.deleteMediaByUrl(order.complaint.videoUrl);
      } catch (vidErr) {
        console.error('Failed to delete complaint video from Cloudinary during order deletion:', vidErr);
      }
    }

    // Also clean up any complaint proof images
    if (order.complaint?.images && order.complaint.images.length > 0) {
      for (const imgUrl of order.complaint.images) {
        if (imgUrl && imgUrl.includes('cloudinary.com')) {
          await CloudinaryService.deleteMediaByUrl(imgUrl).catch(() => { });
        }
      }
    }

    await Order.findByIdAndDelete(orderId);

    // Audit Log for deletion
    try {
      await AuditLog.create({
        action: 'DELETED',
        entityType: 'ONLINE_ORDER',
        entityId: order.orderReferenceId || order.orderId,
        entityTitle: `Order #${order.orderReferenceId || order.orderId} - ${order.customerDetails?.fullName || 'Online Customer'}`,
        amount: order.pricing?.totalAmount || order.totalAmount || 0,
        performedBy: {
          userId: adminUser?._id || adminUser?.id,
          name: adminUser?.name || 'Administrator',
          email: adminUser?.email,
          role: adminUser?.role || 'admin'
        },
        reason: 'Deleted by administrator from Orders Management. Product stock restored.',
        snapshot: order.toObject()
      });
    } catch (auditErr) {
      console.error('Failed to log audit for order deletion:', auditErr);
    }

    return {
      success: true,
      message: `Order ${order.orderReferenceId || order.orderId} deleted successfully.`
    };
  }
}

export default OrderService;
