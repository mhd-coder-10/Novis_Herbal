import { FinanceService } from '../services/financeService.js';

export const getFinanceOverview = async (req, res) => {
  try {
    const data = await FinanceService.getOverview(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesFinance = async (req, res) => {
  try {
    const data = await FinanceService.getSalesFinance(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// TAB 3: MANUFACTURING & SOURCING 
// ==========================================
export const getManufacturingFinance = async (req, res) => {
  try {
    const data = await FinanceService.getManufacturingFinance(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createManufacturingExpense = async (req, res) => {
  try {
    const entry = await FinanceService.createManufacturingExpense(req.body, req.user);
    res.status(201).json({ success: true, entry, message: 'Procurement entry created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateManufacturingExpense = async (req, res) => {
  try {
    const entry = await FinanceService.updateManufacturingExpense(req.params.id, req.body, req.user);
    res.json({ success: true, entry, message: 'Procurement entry updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordManufacturingPayment = async (req, res) => {
  try {
    const entry = await FinanceService.recordManufacturingPayment(req.params.id, req.body, req.user);
    res.json({ success: true, entry, message: 'Payment recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordManufacturingReturn = async (req, res) => {
  try {
    const entry = await FinanceService.recordManufacturingReturn(req.params.id, req.body, req.user);
    res.json({ success: true, entry, message: 'Return to supplier processed and refund credited' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteManufacturingExpense = async (req, res) => {
  try {
    const result = await FinanceService.deleteManufacturingExpense(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// TAB 4: OPERATING EXPENSES
// ==========================================
export const getOperatingExpenses = async (req, res) => {
  try {
    const data = await FinanceService.getOperatingExpenses(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOperatingExpense = async (req, res) => {
  try {
    const entry = await FinanceService.createOperatingExpense(req.body, req.user);
    res.status(201).json({ success: true, entry, message: 'Operating expense recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOperatingExpense = async (req, res) => {
  try {
    const entry = await FinanceService.updateOperatingExpense(req.params.id, req.body, req.user);
    res.json({ success: true, entry, message: 'Operating expense updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOperatingExpense = async (req, res) => {
  try {
    const result = await FinanceService.deleteOperatingExpense(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// TAB 2 (SUB-TAB 3): OFFLINE SALES CONTROLLERS
// ==========================================
export const getOfflineSales = async (req, res) => {
  try {
    const result = await FinanceService.getOfflineSales(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOfflineSale = async (req, res) => {
  try {
    const sale = await FinanceService.createOfflineSale(req.body, req.user);
    res.status(201).json({ success: true, sale, message: 'Offline sale recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOfflineSale = async (req, res) => {
  try {
    const sale = await FinanceService.updateOfflineSale(req.params.id, req.body, req.user);
    res.json({ success: true, sale, message: 'Offline sale updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOfflineSalePayment = async (req, res) => {
  try {
    const sale = await FinanceService.updateOfflineSalePayment(req.params.id, req.body, req.user);
    res.json({ success: true, sale, message: 'Payment status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOfflineSale = async (req, res) => {
  try {
    const result = await FinanceService.deleteOfflineSale(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeletionLogs = async (req, res) => {
  try {
    const data = await FinanceService.getDeletionLogs(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
