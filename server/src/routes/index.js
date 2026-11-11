import express from 'express';

// Import all modular route handlers
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import cmsRoutes from './cmsRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import adminRoutes from './adminRoutes.js';
import financeRoutes from './financeRoutes.js';
import realtimeRoutes from './realtimeRoutes.js';

const router = express.Router();

// Mount all modular routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/finance', financeRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/shipping', shippingRoutes);
router.use('/cms', cmsRoutes);
router.use('/reviews', reviewRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/categories', categoryRoutes);
router.use('/upload', uploadRoutes);
router.use('/realtime', realtimeRoutes);

export default router;
