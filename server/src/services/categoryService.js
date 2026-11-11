import Category from '../models/Category.js';

export class CategoryService {
  static async getCategories() {
    return await Category.find({ isActive: true }).sort({ displayOrder: 1 });
  }

  static async createCategory(categoryData) {
    const slug = categoryData.slug || categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return await Category.create({ ...categoryData, slug });
  }
}
