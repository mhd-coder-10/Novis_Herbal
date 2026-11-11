import { AdminService } from '../services/adminService.js';

// @route GET /api/admin/credentials
export const getAdminCredentials = async (req, res) => {
  try {
    const admins = await AdminService.getAllAdmins();
    res.json({ success: true, admins });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route POST /api/admin/credentials
export const createAdminCredential = async (req, res) => {
  try {
    const result = await AdminService.createAdmin(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/admin/credentials/:id
export const updateAdminCredential = async (req, res) => {
  try {
    const result = await AdminService.updateAdmin(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/admin/credentials/:id
export const deleteAdminCredential = async (req, res) => {
  try {
    const result = await AdminService.deleteAdmin(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route POST /api/admin/credentials/restore-default
export const restoreDefaultAdmin = async (req, res) => {
  try {
    const result = await AdminService.resetDefaultAdmin();
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/admin/customers
export const getCustomers = async (req, res) => {
  try {
    const result = await AdminService.getAllCustomers(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/admin/customers/:id
export const getCustomerDetails = async (req, res) => {
  try {
    const result = await AdminService.getCustomerDetails(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/admin/customers/:id/status
export const toggleCustomerStatus = async (req, res) => {
  try {
    const result = await AdminService.toggleCustomerStatus(req.params.id, req.body.isActive);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/admin/customers/:id
export const deleteCustomer = async (req, res) => {
  try {
    const result = await AdminService.deleteCustomer(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/admin/health
export const getStoreSystemHealth = async (req, res) => {
  try {
    const result = await AdminService.getStoreSystemHealth();
    res.json({ success: true, health: result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

