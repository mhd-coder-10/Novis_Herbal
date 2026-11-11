import { DashboardService } from '../services/dashboardService.js';

// @route GET /api/dashboard/stats (Admin)
export const getDashboardStats = async (req, res) => {
  try {
    const result = await DashboardService.getStats();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
