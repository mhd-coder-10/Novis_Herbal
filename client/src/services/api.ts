import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('novise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If sending FormData (file uploads), let the browser set multipart/form-data with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Helper for product image fallbacks
export const getFallbackProductImage = (nameOrSlug?: string): string => {
  const s = (nameOrSlug || '').toLowerCase();
  if (s.includes('shampoo')) return '/images/products/shampoo.jpg';
  if (s.includes('oil')) return '/images/products/hair-oil.jpg';
  if (s.includes('combo') || s.includes('kit')) return '/images/products/combo.jpg';
  return '/images/placeholder.jpg';
};

// Helper for image URLs with intelligent product fallback
export const getFullImageUrl = (path: string | undefined, nameOrSlug?: string): string => {
  if (!path || path === 'undefined' || path === 'null' || path.trim() === '') {
    return getFallbackProductImage(nameOrSlug);
  }
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
  return `${serverUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export default api;
