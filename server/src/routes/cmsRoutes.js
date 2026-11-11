import express from 'express';
import { getCMS, updateCMS, getPolicy } from '../controllers/cmsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getCMS);
router.get('/policy/:type', getPolicy);
router.put('/', protect, authorize('admin'), updateCMS);

export default router;
