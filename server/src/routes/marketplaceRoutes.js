import express from 'express';
import {
  getAdminMarketplaces,
  getPublicMarketplaces,
  getProductMarketplaceLinks,
  createMarketplace,
  updateMarketplace,
  deleteMarketplace,
  addOrUpdateProductLink,
  removeProductLink,
  trackMarketplaceClick
} from '../controllers/marketplaceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// PUBLIC STOREFRONT ROUTES
// ==========================================
router.get('/public', getPublicMarketplaces);
router.get('/product/:slugOrId', getProductMarketplaceLinks);
router.post('/:id/links/:linkId/click', trackMarketplaceClick);

// ==========================================
// ADMIN MANAGEMENT ROUTES (Protected)
// ==========================================
router.use(protect, authorize('admin', 'staff'));

router.get('/', getAdminMarketplaces);
router.post('/', createMarketplace);
router.put('/:id', updateMarketplace);
router.delete('/:id', deleteMarketplace);

router.post('/:id/products', addOrUpdateProductLink);
router.put('/:id/products/:linkId', addOrUpdateProductLink);
router.delete('/:id/products/:linkId', removeProductLink);

export default router;

