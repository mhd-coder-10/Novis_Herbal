import { ShippingService } from '../services/shippingService.js';
import { realtimeService } from '../services/realtimeService.js';

// @route POST /api/shipping/update-tracking/:orderId (Admin)
// Update manual courier tracking consignment details (India Post, etc.)
export const updateTrackingDetails = async (req, res) => {
  try {
    const result = await ShippingService.updateTrackingDetails(req.params.orderId, req.body, req.user);
    if (result?.order) {
      realtimeService.broadcast('ORDER_UPDATED', { 
        orderId: result.order.orderId, 
        mongoId: result.order._id, 
        order: result.order 
      });
    }
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route POST /api/shipping/book/:orderId (Admin - backward compatible alias)
export const bookShipment = async (req, res) => {
  try {
    const result = await ShippingService.bookShipmentForOrder(req.params.orderId, req.user);
    if (result?.order) {
      realtimeService.broadcast('ORDER_UPDATED', { 
        orderId: result.order.orderId, 
        mongoId: result.order._id, 
        order: result.order 
      });
    }
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route POST /api/shipping/manual-override/:orderId (Admin)
export const manualOverrideStatus = async (req, res) => {
  try {
    const order = await ShippingService.manualOverrideStatus(req.params.orderId, req.body, req.user);
    realtimeService.broadcast('ORDER_UPDATED', { 
      orderId: order.orderId, 
      mongoId: order._id, 
      order 
    });
    res.json({ success: true, message: 'Status manually updated with audit log record', order });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/shipping/config
// Returns system default logistics configuration (courier name & tracking portal URL from .env)
export const getShippingConfig = async (req, res) => {
  try {
    const defaultCourierName = process.env.DEFAULT_COURIER_NAME || 'India Post';
    const defaultTrackingPortal = process.env.DEFAULT_TRACKING_PORTAL || 'https://www.indiapost.gov.in/';
    res.json({
      success: true,
      defaultCourierName,
      defaultTrackingPortal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/shipping/label/:orderId
export const getShippingLabel = async (req, res) => {
  try {
    const html = await ShippingService.getShippingLabelHTML(req.params.orderId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(error.statusCode || 500).send(error.message);
  }
};
