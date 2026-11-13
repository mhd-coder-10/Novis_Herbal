import express from 'express';
import { 
  updateTrackingDetails,
  bookShipment, 
  manualOverrideStatus, 
  getShippingLabel,
  getShippingConfig
} from '../controllers/shippingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Logistics & Courier Dispatch Config
router.get('/config', getShippingConfig);

// Logistics & Courier Dispatch Admin
router.post('/update-tracking/:orderId', protect, authorize('admin', 'staff'), updateTrackingDetails);
router.post('/book/:orderId', protect, authorize('admin', 'staff'), bookShipment);
router.post('/manual-override/:orderId', protect, authorize('admin'), manualOverrideStatus);
router.get('/label/:orderId', getShippingLabel);

export default router;
