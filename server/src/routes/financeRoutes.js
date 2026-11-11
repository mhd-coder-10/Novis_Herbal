import express from 'express';
import {
  getFinanceOverview,
  getSalesFinance,
  getManufacturingFinance,
  createManufacturingExpense,
  updateManufacturingExpense,
  recordManufacturingPayment,
  recordManufacturingReturn,
  deleteManufacturingExpense,
  getOperatingExpenses,
  createOperatingExpense,
  updateOperatingExpense,
  deleteOperatingExpense,
  getOfflineSales,
  createOfflineSale,
  updateOfflineSale,
  updateOfflineSalePayment,
  deleteOfflineSale,
  getFinanceAuditLogs
} from '../controllers/financeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All finance routes require admin/staff protection
router.use(protect, authorize('admin', 'staff'));

// Tab 1: Overview
router.get('/overview', getFinanceOverview);

// Tab 2: Selling Finance
router.get('/sales', getSalesFinance);
router.get('/offline-sales', getOfflineSales);
router.post('/offline-sales', createOfflineSale);
router.put('/offline-sales/:id', updateOfflineSale);
router.put('/offline-sales/:id/payment', updateOfflineSalePayment);
router.delete('/offline-sales/:id', deleteOfflineSale);

// Tab 3: Manufacturing & Sourcing
router.get('/manufacturing', getManufacturingFinance);
router.post('/manufacturing', createManufacturingExpense);
router.put('/manufacturing/:id', updateManufacturingExpense);
router.put('/manufacturing/:id/payment', recordManufacturingPayment);
router.post('/manufacturing/:id/return', recordManufacturingReturn);
router.delete('/manufacturing/:id', deleteManufacturingExpense);

// Tab 4: Operating Expenses
router.get('/operating', getOperatingExpenses);
router.post('/operating', createOperatingExpense);
router.put('/operating/:id', updateOperatingExpense);
router.delete('/operating/:id', deleteOperatingExpense);

// Tab 5: Audit & Deletion Logs
router.get('/audit-logs', getFinanceAuditLogs);

export default router;
