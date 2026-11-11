import { CMSService } from '../services/cmsService.js';
import { realtimeService } from '../services/realtimeService.js';

// @route GET /api/cms
export const getCMS = async (req, res) => {
  try {
    const cms = await CMSService.getCMSData();
    res.json({ success: true, cms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/cms (Admin)
export const updateCMS = async (req, res) => {
  try {
    const cms = await CMSService.updateCMSData(req.body);
    // Broadcast live CMS update to all connected clients & devices
    realtimeService.broadcast('CMS_UPDATED', { cms });
    res.json({ success: true, message: 'Website CMS content updated successfully', cms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/cms/policy/:type
export const getPolicy = async (req, res) => {
  try {
    const content = await CMSService.getPolicyContent(req.params.type);
    res.json({ success: true, type: req.params.type, content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
