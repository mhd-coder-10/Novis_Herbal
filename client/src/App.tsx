import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { ToastContainer } from './components/common/ToastContainer';

// Storefront Pages
import { HomePage } from './pages/storefront/HomePage';
import { ShopPage } from './pages/storefront/ShopPage';
import { ProductDetailPage } from './pages/storefront/ProductDetailPage';
import { CartPage } from './pages/storefront/CartPage';
import { CheckoutPage } from './pages/storefront/CheckoutPage';
import { OrderSuccessPage } from './pages/storefront/OrderSuccessPage';
import { PolicyPage } from './pages/storefront/PolicyPage';
import { CustomerLoginPage } from './pages/storefront/CustomerLoginPage';
import { MyOrdersPage } from './pages/storefront/MyOrdersPage';
import { WishlistPage } from './pages/storefront/WishlistPage';
import { ProfilePage } from './pages/storefront/ProfilePage';
import { MarketplacesPage } from './pages/storefront/MarketplacesPage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminCMS } from './pages/admin/AdminCMS';
import { AdminReviews } from './pages/admin/AdminReviews';
import { AdminCredentials } from './pages/admin/AdminCredentials';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminFinance } from './pages/admin/AdminFinance';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { AdminMarketplaces } from './pages/admin/AdminMarketplaces';

// Global Stores
import { useAuthStore } from './store/useAuthStore';
import { useCMSStore } from './store/useCMSStore';
import { useProductStore } from './store/useProductStore';
import { initRealtimeSync } from './services/realtimeSync';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active admin module tab and parameter directly from URL location.pathname
  const getAdminRouteState = () => {
    const rawPath = location.pathname.replace(/\/+$/, '');
    const parts = rawPath.split('/').filter(Boolean); // ['admin', ...]

    if (parts.length <= 1 || parts[1] === 'dashboard') {
      return { tab: 'dashboard', param: null };
    }

    const validTabs = [
      'dashboard',
      'products',
      'orders',
      'customers',
      'finance',
      'cms',
      'reviews',
      'notifications',
      'marketplaces',
      'credentials',
      'settings'
    ];

    const moduleTab = parts[1];
    if (validTabs.includes(moduleTab)) {
      const param = parts.length > 2 ? parts.slice(2).join('/') : null;
      return { tab: moduleTab, param };
    }

    return { tab: 'dashboard', param: null };
  };

  const { tab: adminTab, param: adminParam } = getAdminRouteState();

  const handleSelectAdminTab = (tab: string) => {
    if (tab === 'dashboard') {
      navigate('/admin/dashboard');
    } else {
      navigate(`/admin/${tab}`);
    }
  };

  const handleNavigateToOrder = (orderId: string) => {
    navigate(`/admin/orders/${encodeURIComponent(orderId)}`);
  };

  const handleSelectCustomer = (customerId: string | null) => {
    if (customerId) {
      navigate(`/admin/customers/${encodeURIComponent(customerId)}`);
    } else {
      navigate('/admin/customers');
    }
  };

  // Canonical redirect for /admin to /admin/dashboard
  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [location.pathname]);

  const { loadUser, user, isAuthenticated } = useAuthStore();
  const { fetchCMS } = useCMSStore();
  const { fetchProducts } = useProductStore();

  useEffect(() => {
    loadUser();
    fetchCMS();
    fetchProducts();
    // Initialize full real-time synchronization engine across tabs & devices
    const cleanupRealtime = initRealtimeSync();
    return () => {
      cleanupRealtime();
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.search]);

  // Unified SPA navigation function (Keeps backward-compatibility with all child components)
  const handleNavigate = (page: string, param?: string) => {
    switch (page) {
      case 'home':
        navigate('/');
        break;
      case 'shop':
        navigate(param ? `/shop?search=${encodeURIComponent(param)}` : '/shop');
        break;
      case 'product':
      case 'product-detail':
        navigate(`/product/${param || 'novise-hair-oil-shampoo-combo'}`);
        break;
      case 'cart':
        navigate('/cart');
        break;
      case 'checkout':
        navigate('/checkout');
        break;
      case 'order-success':
        navigate(param ? `/order-success/${param}` : '/order-success');
        break;
      case 'track-order':
        navigate('/my-orders');
        break;
      case 'about-us':
        navigate('/about-us');
        break;
      case 'policy':
        navigate(param ? `/policy/${param}` : '/policy/aboutUs');
        break;
      case 'wishlist':
        navigate('/wishlist');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'marketplaces':
        navigate('/marketplaces');
        break;
      case 'login':
        navigate(param === 'register' ? '/login?mode=register' : '/login');
        break;
      case 'my-orders':
        navigate('/my-orders');
        break;
      case 'admin-login':
        navigate('/admin-login');
        break;
      case 'admin-dashboard':
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  // Derive active currentPage and pageParam from location.pathname for Navbar & MobileBottomNav highlighting
  const getActiveState = () => {
    const path = location.pathname;
    if (path === '/' || path === '') return { page: 'home', param: '' };
    if (path.startsWith('/shop')) return { page: 'shop', param: new URLSearchParams(location.search).get('search') || '' };
    if (path.startsWith('/product/')) return { page: 'product', param: path.replace('/product/', '') };
    if (path.startsWith('/cart')) return { page: 'cart', param: '' };
    if (path.startsWith('/checkout')) return { page: 'checkout', param: '' };
    if (path.startsWith('/wishlist')) return { page: 'wishlist', param: '' };
    if (path.startsWith('/profile')) return { page: 'profile', param: '' };
    if (path.startsWith('/marketplaces')) return { page: 'marketplaces', param: '' };
    if (path.startsWith('/order-success')) return { page: 'order-success', param: path.replace('/order-success/', '') };
    if (path.startsWith('/track-order')) return { page: 'my-orders', param: '' };
    if (path === '/about-us') return { page: 'policy', param: 'aboutUs' };
    if (path.startsWith('/policy/')) return { page: 'policy', param: path.replace('/policy/', '') };
    if (path.startsWith('/policy')) return { page: 'policy', param: 'aboutUs' };
    if (path.startsWith('/login')) return { page: 'login', param: '' };
    if (path.startsWith('/my-orders')) return { page: 'my-orders', param: '' };
    if (path === '/admin-login') return { page: 'admin-login', param: '' };
    if (path.startsWith('/admin')) return { page: 'admin-dashboard', param: '' };
    return { page: 'home', param: '' };
  };

  const { page: currentPage, param: pageParam } = getActiveState();

  // Render Admin View
  if (location.pathname.startsWith('/admin') && location.pathname !== '/admin-login') {
    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'staff')) {
      return (
        <>
          <ToastContainer />
          <AdminLoginPage
            onSuccess={() => navigate('/admin/dashboard')}
            onBackToStore={() => navigate('/')}
          />
        </>
      );
    }

    return (
      <>
        <ToastContainer />
        <AdminLayout
          currentTab={adminTab}
          onSelectTab={handleSelectAdminTab}
          onExitToStore={() => navigate('/')}
        >
          {adminTab === 'dashboard' && (
            <AdminDashboard
              onNavigateToTab={handleSelectAdminTab}
              onNavigateToOrder={handleNavigateToOrder}
            />
          )}
          {adminTab === 'products' && <AdminProducts />}
          {adminTab === 'orders' && (
            <AdminOrders
              initialOrderId={adminParam}
              onSelectOrder={handleNavigateToOrder}
              onClearInitialOrder={() => navigate('/admin/orders')}
            />
          )}
          {adminTab === 'customers' && (
            <AdminCustomers
              initialCustomerId={adminParam}
              onSelectCustomer={handleSelectCustomer}
              onNavigateToOrder={handleNavigateToOrder}
            />
          )}
          {adminTab === 'finance' && <AdminFinance />}
          {adminTab === 'cms' && <AdminCMS />}
          {adminTab === 'reviews' && <AdminReviews />}
          {adminTab === 'notifications' && <AdminNotifications />}
          {adminTab === 'marketplaces' && <AdminMarketplaces />}
          {adminTab === 'credentials' && <AdminCredentials />}
          {adminTab === 'settings' && <AdminSettings />}
        </AdminLayout>
      </>
    );
  }

  // Admin Login Screen
  if (location.pathname === '/admin-login') {
    return (
      <>
        <ToastContainer />
        <AdminLoginPage
          onSuccess={() => navigate('/admin/dashboard')}
          onBackToStore={() => navigate('/')}
        />
      </>
    );
  }

  // Customer Storefront View with Full SPA URL Routing
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      {/* Global Toast Notification System */}
      <ToastContainer />

      {/* Dynamic Navbar with Real-Time Route Awareness */}
      <Navbar
        onNavigate={handleNavigate}
        currentPage={currentPage}
        pageParam={pageParam}
      />

      {/* Main Page Body: SPA Routing Container */}
      <main className="flex-1 pb-16 lg:pb-0">
        <Routes>
          <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
          <Route path="/shop" element={<ShopPage onNavigate={handleNavigate} initialSearch={pageParam} />} />
          <Route
            path="/product/:slug"
            element={
              <ProductDetailPage
                onNavigate={handleNavigate}
                onDirectCheckout={() => handleNavigate('checkout')}
              />
            }
          />
          <Route
            path="/product"
            element={
              <ProductDetailPage
                slug="novise-hair-oil-shampoo-combo"
                onNavigate={handleNavigate}
                onDirectCheckout={() => handleNavigate('checkout')}
              />
            }
          />
          <Route path="/cart" element={<CartPage onNavigate={handleNavigate} />} />
          <Route
            path="/checkout"
            element={
              <CheckoutPage
                onOrderSuccess={(orderId) => handleNavigate('order-success', orderId)}
                onBackToCart={() => handleNavigate('cart')}
              />
            }
          />
          <Route path="/order-success/:orderId" element={<OrderSuccessPage onNavigate={handleNavigate} />} />
          <Route path="/order-success" element={<OrderSuccessPage onNavigate={handleNavigate} />} />
          <Route path="/track-order/*" element={<Navigate to="/my-orders" replace />} />
          <Route path="/track-order" element={<Navigate to="/my-orders" replace />} />
          <Route path="/about-us" element={<PolicyPage policyType="aboutUs" onNavigate={handleNavigate} />} />
          <Route path="/policy/:policyType" element={<PolicyPage onNavigate={handleNavigate} />} />
          <Route path="/policy" element={<PolicyPage policyType="aboutUs" onNavigate={handleNavigate} />} />
          <Route path="/wishlist" element={<WishlistPage onNavigate={handleNavigate} />} />
          <Route
            path="/login"
            element={
              <CustomerLoginPage
                onSuccess={() => {
                  const redirect = new URLSearchParams(location.search).get('redirect');
                  if (redirect) {
                    navigate(redirect);
                  } else {
                    handleNavigate('home');
                  }
                }}
                onAdminSwitch={() => handleNavigate('admin-login')}
              />
            }
          />
          <Route path="/my-orders" element={<MyOrdersPage onNavigate={handleNavigate} />} />
          <Route path="/profile" element={<ProfilePage onNavigate={handleNavigate} />} />
          <Route path="/marketplaces" element={<MarketplacesPage onNavigate={handleNavigate} />} />
          {/* Catch-all fallback: redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Dynamic Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Native-like Mobile Bottom Navigation Bar (Visible only on mobile) */}
      <MobileBottomNav
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

    </div>
  );
}

export default App;
