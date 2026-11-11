import express from 'express';
import { 
  checkout, 
  verifyPayment, 
  trackOrder, 
  getMyOrders, 
  getAllOrdersAdmin, 
  updateOrderStatus, 
  updatePaymentStatus,
  getInvoice,
  cancelOrder,
  reviewCancellation,
  processRefund,
  processRTO,
  getOrderPolicySettings,
  updateOrderPolicySettings,
  submitComplaint,
  reviewComplaint,
  deleteComplaintVideo,
  deleteOrder
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Customer Checkout (Authentication Mandatory)
router.post('/checkout', protect, checkout);
router.post('/verify-payment', protect, verifyPayment);
router.get('/track/:orderId', trackOrder);
router.get('/:id/invoice', getInvoice);

// Customer Logged-in Orders & Actions
router.get('/my-orders', protect, getMyOrders);
router.post('/:id/cancel', protect, cancelOrder);
router.post('/:id/complaint', protect, submitComplaint);

// Admin Global Order Policy Settings
router.get('/admin/settings/order-policy', protect, authorize('admin', 'staff'), getOrderPolicySettings);
router.put('/admin/settings/order-policy', protect, authorize('admin', 'staff'), updateOrderPolicySettings);

// Admin Order Management
router.get('/admin/all', protect, authorize('admin', 'staff'), getAllOrdersAdmin);
router.put('/admin/:id/status', protect, authorize('admin', 'staff'), updateOrderStatus);
router.put('/admin/:id/payment-status', protect, authorize('admin', 'staff'), updatePaymentStatus);

// Admin Order Lifecycle & Action Routes
router.put('/admin/:id/cancellation', protect, authorize('admin', 'staff'), reviewCancellation);
router.put('/admin/:id/complaint', protect, authorize('admin', 'staff'), reviewComplaint);
router.delete('/admin/:id/complaint/video', protect, authorize('admin', 'staff'), deleteComplaintVideo);
router.put('/admin/:id/refund', protect, authorize('admin', 'staff'), processRefund);
router.put('/admin/:id/rto', protect, authorize('admin', 'staff'), processRTO);
router.delete('/admin/:id', protect, authorize('admin', 'staff'), deleteOrder);

export default router;

