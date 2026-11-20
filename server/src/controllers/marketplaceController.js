import { MarketplaceService } from '../services/marketplaceService.js';

export const getAdminMarketplaces = async (req, res) => {
  try {
    const data = await MarketplaceService.getAllAdmin();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicMarketplaces = async (req, res) => {
  try {
    const data = await MarketplaceService.getPublic();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductMarketplaceLinks = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const data = await MarketplaceService.getByProduct(slugOrId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMarketplace = async (req, res) => {
  try {
    const data = await MarketplaceService.createMarketplace(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateMarketplace = async (req, res) => {
  try {
    const data = await MarketplaceService.updateMarketplace(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteMarketplace = async (req, res) => {
  try {
    const data = await MarketplaceService.deleteMarketplace(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addOrUpdateProductLink = async (req, res) => {
  try {
    const data = await MarketplaceService.addOrUpdateProductLink(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const removeProductLink = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const data = await MarketplaceService.removeProductLink(id, linkId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const trackMarketplaceClick = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const data = await MarketplaceService.trackClick(id, linkId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

