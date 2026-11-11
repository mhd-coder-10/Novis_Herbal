import express from 'express';
import { 
  bookShipment, 
  handleShiprocketWebhook, 
  manualOverrideStatus, 
  getShippingLabel 
} from '../controllers/shippingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Logistics Admin
router.post('/book/:orderId', protect, authorize('admin', 'staff'), bookShipment);
router.post('/manual-override/:orderId', protect, authorize('admin'), manualOverrideStatus);
router.get('/label/:orderId', getShippingLabel);

// Shiprocket Public Tracking Webhook
router.post('/webhook/shiprocket', handleShiprocketWebhook);

export default router;
