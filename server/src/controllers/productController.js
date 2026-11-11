import { ProductService } from '../services/productService.js';
import { realtimeService } from '../services/realtimeService.js';

// @route GET /api/products
export const getProducts = async (req, res) => {
  try {
    const result = await ProductService.listProducts(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/products/:slugOrId
export const getProductBySlug = async (req, res) => {
  try {
    const result = await ProductService.getProductBySlugOrId(req.params.slugOrId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route POST /api/products (Admin)
export const createProduct = async (req, res) => {
  try {
    const product = await ProductService.createProduct(req.body);
    realtimeService.broadcast('PRODUCT_UPDATED', { action: 'create', product });
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/products/:id (Admin)
export const updateProduct = async (req, res) => {
  try {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    realtimeService.broadcast('PRODUCT_UPDATED', { action: 'update', product });
    res.json({ success: true, product });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/products/:id (Admin)
export const deleteProduct = async (req, res) => {
  try {
    const result = await ProductService.deleteProduct(req.params.id);
    realtimeService.broadcast('PRODUCT_UPDATED', { action: 'delete', productId: req.params.id });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/products/inventory/low-stock (Admin)
export const getLowStockProducts = async (req, res) => {
  try {
    const result = await ProductService.getLowStockProducts();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
