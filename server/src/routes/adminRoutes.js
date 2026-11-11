import express from 'express';
import { 
  getAdminCredentials, 
  createAdminCredential, 
  updateAdminCredential, 
  deleteAdminCredential, 
  restoreDefaultAdmin,
  getCustomers,
  getCustomerDetails,
  toggleCustomerStatus,
  deleteCustomer,
  getStoreSystemHealth
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Allow public/bootstrap restore if credentials ever get lost
router.post('/credentials/restore-default', restoreDefaultAdmin);

// Protected Admin Credential Management routes
router.use(protect);
router.use(authorize('admin', 'staff'));

// Admin Credentials
router.get('/credentials', getAdminCredentials);
router.post('/credentials', authorize('admin'), createAdminCredential);
router.put('/credentials/:id', authorize('admin'), updateAdminCredential);
router.delete('/credentials/:id', authorize('admin'), deleteAdminCredential);

// Customer / User Management
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerDetails);
router.put('/customers/:id/status', authorize('admin'), toggleCustomerStatus);
router.delete('/customers/:id', authorize('admin'), deleteCustomer);

// System Health & Diagnostics
router.get('/health', getStoreSystemHealth);

export default router;

