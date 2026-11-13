import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, Search, User, Menu, X, Shield, Sparkles, MapPin, Phone, PhoneCall, MessageCircle, ArrowRight, Package, Info, CheckCircle2, Heart, Mail, LogOut, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useCMSStore } from '../../store/useCMSStore';
import { appConfig } from '../../config/appConfig';
import { getFullImageUrl } from '../../services/api';

interface NavbarProps {
  onNavigate: (page: string, param?: string) => void;
  currentPage: string;
  pageParam?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage, pageParam }) => {
  const { items, openCart } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { cms } = useCMSStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const handleMouseEnterUser = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsUserMenuOpen(true);
  };

  const handleMouseLeaveUser = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsUserMenuOpen(false);
    }, 220);
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  // Close user menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isUserMenuOpen]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobileMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('shop', searchQuery.trim());
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-forest-950/10 shadow-[0_4px_25px_-5px_rgba(7,38,23,0.08)] transition-all w-full">

      {/* Dynamic Announcement Bar (Connected with Admin CMS) */}
      {cms?.announcementBar?.enabled !== false && (
        <div
          onClick={() => {
            if (cms?.announcementBar?.link) {
              const link = cms.announcementBar.link;
              if (link.startsWith('/shop')) onNavigate('shop');
              else if (link.startsWith('/')) onNavigate(link.replace('/', '') || 'home');
            }
          }}
          className={`hidden md:flex bg-forest-950 text-white py-1.5 px-3 sm:px-6 text-[10px] sm:text-xs font-semibold tracking-wide text-center items-center justify-center gap-1.5 sm:gap-2.5 border-b border-gold-500/20 w-full overflow-hidden ${cms?.announcementBar?.link ? 'cursor-pointer hover:bg-forest-900 transition' : ''
            }`}
        >
          <div className="flex items-center space-x-1 sm:space-x-1.5 text-gold-400 shrink-0">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse shrink-0" />
          </div>
          <span className="truncate max-w-[95vw] tracking-normal sm:tracking-wide">
            {cms?.announcementBar?.text || '100% PURE BOTANICAL AYURVEDA • SHIPPING AVAILABLE IN ALL INDIA • CASH ON DELIVERY AVAILABLE'}
          </span>
        </div>
      )}

      {/* Main Navigation Bar - Full Width Fluid Layout */}
      <div className="w-full px-3.5 sm:px-6 lg:px-10 flex items-center justify-between h-14 sm:h-16 lg:h-20 relative">

        {/* Left Section: Mobile Menu Trigger + Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 -ml-1 text-forest-950 hover:text-gold-600 transition lg:hidden"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Brand Logo - Native Luxury Emblem & Typography Lockup */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none group py-1"
            title="Novis Herbal"
          >
            {/* High-Resolution Botanical Crest Emblem */}
            <div className="relative shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-amber-600/30 via-forest-900/20 to-gold-400/50 shadow-xs transition-transform duration-300 group-hover:scale-105">
              <img
                src="/novise-emblem.png"
                alt="Novis Herbal"
                className="w-full h-full object-contain rounded-full drop-shadow-xs"
              />
            </div>

            {/* Native Brand Typography Lockup */}
            <div className="flex flex-col justify-center select-none leading-none">
              <div className="flex items-baseline gap-0.5">
                <span className="font-serif text-[20px] sm:text-[23px] lg:text-[25px] font-black tracking-[0.14em] text-forest-950 leading-none group-hover:text-forest-900 transition-colors uppercase">
                  NOVIS
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 font-sans leading-none">
                  ™
                </span>
              </div>
              <span className="text-[8.5px] sm:text-[9.5px] lg:text-[10px] font-bold tracking-[0.32em] text-amber-800 uppercase mt-0.5 sm:mt-1 leading-none font-sans">
                HERBAL
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Desktop Nav Links (Clean Luxury Styling, No Crude Outlines) */}
        <nav className="hidden lg:flex items-center space-x-1.5 xl:space-x-2.5 text-sm font-semibold">
          <button
            onClick={() => onNavigate('home')}
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 outline-none focus:outline-none ${currentPage === 'home'
              ? 'text-forest-950 bg-forest-900/8 shadow-xs'
              : 'text-stone-600 hover:text-forest-950 hover:bg-forest-900/5'
              }`}
          >
            Home
            {currentPage === 'home' && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-forest-900 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onNavigate('shop')}
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 outline-none focus:outline-none ${currentPage === 'shop'
              ? 'text-forest-950 bg-forest-900/8 shadow-xs'
              : 'text-stone-600 hover:text-forest-950 hover:bg-forest-900/5'
              }`}
          >
            All Products
            {currentPage === 'shop' && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-forest-900 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onNavigate('product', 'novise-hair-oil-shampoo-combo')}
            className="ml-1 text-amber-950 font-extrabold text-xs px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 border border-amber-300/80 hover:border-amber-400 hover:shadow-xs transition-all flex items-center space-x-1.5 shadow-xs outline-none focus:outline-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Combo Kit (57% OFF)</span>
          </button>

          <button
            onClick={() => onNavigate('policy', 'aboutUs')}
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 outline-none focus:outline-none ${currentPage === 'policy' && pageParam === 'aboutUs'
              ? 'text-forest-950 bg-forest-900/8 shadow-xs'
              : 'text-stone-600 hover:text-forest-950 hover:bg-forest-900/5'
              }`}
          >
            About Us
            {currentPage === 'policy' && pageParam === 'aboutUs' && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-forest-900 rounded-full" />
            )}
          </button>
        </nav>

        {/* Right Section: Inline Search, Account, Shopping Bag */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">

          {/* Desktop & Tablet Inline Search Input (Keeps Logo and Header Visible) */}
          <div className="hidden sm:flex items-center relative">
            {isSearchOpen ? (
              <form onSubmit={handleSearchSubmit} className="relative flex items-center animate-fadeIn">
                <input
                  type="text"
                  placeholder="Search hair oil, shampoo, combo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-56 md:w-64 lg:w-72 pl-9 pr-8 py-1.5 rounded-full border border-forest-900/30 bg-white text-xs text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-900/20 shadow-sm"
                />
                <Search className="w-4 h-4 text-forest-900 absolute left-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-2.5 p-0.5 text-slate-400 hover:text-forest-950 rounded-full"
                  title="Close Search"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-forest-950 hover:text-gold-600 transition rounded-full hover:bg-black/5"
                title="Search products"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Mobile Search Button (Toggles drop-down bar below header) */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 text-forest-950 hover:text-gold-600 transition rounded-full hover:bg-black/5 sm:hidden"
            title="Search products"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Wishlist Button with Dynamic Counter Badge (Desktop) */}
          <button
            onClick={() => onNavigate('wishlist')}
            className={`p-2 transition rounded-full hover:bg-black/5 relative shrink-0 ${currentPage === 'wishlist' ? 'text-rose-600' : 'text-forest-950 hover:text-rose-600'
              }`}
            title="My Wishlist"
            aria-label="Wishlist"
          >
            <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${wishlistItems.length > 0 ? 'fill-rose-500 text-rose-500' : ''
              }`} />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[9.5px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {wishlistItems.length}
              </span>
            )}
          </button>

          {/* User Account Menu (Desktop with Hover & Click) */}
          <div
            ref={userMenuRef}
            className="relative hidden sm:block"
            onMouseEnter={handleMouseEnterUser}
            onMouseLeave={handleMouseLeaveUser}
          >
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="p-1.5 text-forest-950 hover:text-gold-600 transition rounded-full hover:bg-black/5 flex items-center"
              title="Account"
            >
              {isAuthenticated && user?.avatar ? (
                <img
                  src={getFullImageUrl(user.avatar)}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-forest-900/30 shadow-xs"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>

            {isUserMenuOpen && (
              <div className={`absolute right-0 mt-2 bg-white rounded-3xl shadow-[0_20px_50px_rgba(7,38,23,0.18)] border border-stone-200/90 z-50 animate-fadeIn overflow-hidden ${isAuthenticated ? 'w-64' : 'w-72 sm:w-80'
                }`}>
                {isAuthenticated ? (
                  <>
                    <div className="p-3.5 bg-stone-50/70 border-b border-stone-100 flex items-center space-x-3">
                      {user?.avatar ? (
                        <img
                          src={getFullImageUrl(user.avatar)}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-forest-900/20 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-forest-900 text-gold-400 font-bold text-xs flex items-center justify-center font-serif shrink-0 shadow-xs">
                          {(user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-forest-950 truncate leading-tight">{user?.name}</p>
                        <p className="text-[11px] text-stone-500 truncate leading-tight mt-0.5">{user?.email}</p>
                        <span className="inline-block mt-1 text-[8.5px] bg-stone-200/80 text-stone-700 px-1.5 py-0.2 rounded font-mono uppercase font-bold tracking-wider">
                          {user?.role}
                        </span>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('admin-dashboard');
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 font-bold flex items-center space-x-2.5 rounded-xl transition"
                        >
                          <Shield className="w-4 h-4 text-amber-600" />
                          <span>Admin Portal</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-700 hover:text-forest-950 hover:bg-forest-900/5 flex items-center space-x-2.5 rounded-xl transition"
                      >
                        <User className="w-4 h-4 text-forest-800" />
                        <span>Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('my-orders');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-700 hover:text-forest-950 hover:bg-forest-900/5 flex items-center space-x-2.5 rounded-xl transition"
                      >
                        <Package className="w-4 h-4 text-forest-800" />
                        <span>My Orders</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('wishlist');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-700 hover:text-rose-700 hover:bg-rose-50/60 flex items-center justify-between rounded-xl transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Heart className="w-4 h-4 text-rose-500" />
                          <span>My Wishlist</span>
                        </div>
                        {wishlistItems.length > 0 && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                            {wishlistItems.length}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="p-1.5 border-t border-stone-100 bg-stone-50/30">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center space-x-2.5"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    {/* Welcome Header with Luxury Botanical Styling */}
                    <div className="p-4 bg-gradient-to-br from-forest-950 via-forest-900 to-forest-950 text-white relative overflow-hidden">
                      {/* Decorative Background Accent */}
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-gold-400/10 rounded-full blur-xl pointer-events-none" />

                      <div className="flex items-center space-x-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gold-400/30 to-amber-500/20 border border-gold-400/40 flex items-center justify-center text-gold-400 shrink-0 shadow-sm">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 text-gold-400 font-extrabold text-[11px] uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-gold-300 animate-pulse" />
                            <span>Welcome Guest</span>
                          </div>
                          <p className="text-[11.5px] text-stone-300 leading-tight mt-0.5">
                            Sign in to track orders, saved items & checkout faster
                          </p>
                        </div>
                      </div>

                      {/* Primary CTA Button: Impactful & Elegant */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('login');
                        }}
                        className="w-full mt-3.5 py-2.5 px-4 bg-gradient-to-r from-gold-500 via-amber-500 to-gold-600 hover:from-gold-400 hover:to-amber-500 text-forest-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>Sign In / Register</span>
                        <ArrowRight className="w-3.5 h-3.5 text-forest-950" />
                      </button>
                    </div>

                    {/* Secondary Navigation Options with Clean Icons */}
                    <div className="p-2 space-y-0.5 bg-white">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('my-orders');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-forest-900/5 text-xs font-semibold text-stone-700 hover:text-forest-950 transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-forest-900/10 flex items-center justify-center text-forest-900">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <span>My Orders</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('wishlist');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50/70 text-xs font-semibold text-stone-700 hover:text-rose-700 transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                            <Heart className={`w-3.5 h-3.5 ${wishlistItems.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </div>
                          <span>My Wishlist</span>
                        </div>
                        {wishlistItems.length > 0 ? (
                          <span className="text-[10px] bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                            {wishlistItems.length}
                          </span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('policy', 'aboutUs');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/70 text-xs font-semibold text-stone-700 hover:text-amber-900 transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <span>Why Novis ?</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shopping Cart Button with Live Counter Badge */}
          <button
            onClick={openCart}
            className="relative p-2 sm:p-2.5 bg-forest-950 text-white rounded-full hover:bg-forest-900 transition shadow-md shadow-forest-950/15 flex items-center justify-center group shrink-0"
            aria-label="Open Shopping Bag"
          >
            <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gold-400 group-hover:scale-110 transition-transform" />
            {totalQuantity > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold-500 text-forest-950 text-[10px] font-extrabold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                {totalQuantity}
              </span>
            )}
          </button>

        </div>

      </div>

      {/* Subtle luxury gold accent hairline that provides crisp definition on all page backgrounds */}
      <div className="h-[2px] w-full bg-gradient-to-r from-forest-950/5 via-gold-500/40 to-forest-950/5" />

      {/* Mobile Search Dropdown Bar (Slides down under header without covering Logo or Cart) */}
      {isSearchOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-3.5 py-2.5 shadow-md animate-fadeIn flex items-center space-x-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hair growth oil, shampoo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-3 py-1.5 text-xs text-forest-950 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
            />
          </form>
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 text-slate-400 hover:text-forest-950 rounded-full"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Modern Slide-in Mobile Drawer (Rendered via Portal to document.body to prevent containing-block clipping) */}
      {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Full Height Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full min-h-screen shadow-2xl flex flex-col z-10 animate-slideRight">

            {/* Drawer Header */}
            <div className="p-3.5 border-b border-stone-200/80 flex items-center justify-between bg-white">
              <div
                onClick={() => {
                  onNavigate('home');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-amber-600/30 to-gold-400/50 shadow-xs">
                  <img
                    src="/novise-emblem.png"
                    alt="Novis Herbal"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="flex flex-col select-none leading-none">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-serif text-[19px] font-black tracking-[0.14em] text-forest-950 uppercase leading-none">
                      NOVIS
                    </span>
                    <span className="text-[9px] font-bold text-amber-600 font-sans leading-none">
                      ™
                    </span>
                  </div>
                  <span className="text-[8.5px] font-bold tracking-[0.32em] text-amber-800 uppercase mt-0.5 leading-none font-sans">
                    HERBAL
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-100 transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-1.5 text-sm font-semibold text-slate-700 no-scrollbar">
              <button
                onClick={() => {
                  onNavigate('home');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between ${currentPage === 'home' ? 'bg-forest-900/10 text-forest-950 font-bold' : 'hover:bg-slate-50'
                  }`}
              >
                <span>Home</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('shop');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between ${currentPage === 'shop' ? 'bg-forest-900/10 text-forest-950 font-bold' : 'hover:bg-slate-50'
                  }`}
              >
                <span>All Products</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('product', 'novise-hair-oil-shampoo-combo');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold flex items-center justify-between my-2 shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Combo Kit (57% OFF)</span>
                </div>
                <span className="text-[10px] bg-amber-600 text-white font-extrabold px-2 py-0.5 rounded-full">Save ₹800</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('wishlist');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between ${currentPage === 'wishlist' ? 'bg-forest-900/10 text-forest-950 font-bold' : 'hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <Heart className={`w-4 h-4 ${wishlistItems.length > 0 ? 'fill-rose-500 text-rose-500' : 'text-forest-800'}`} />
                  <span>My Wishlist ({wishlistItems.length})</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('policy', 'aboutUs');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between ${currentPage === 'policy' && pageParam === 'aboutUs' ? 'bg-forest-900/10 text-forest-950 font-bold' : 'hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-forest-800" />
                  <span>About Us</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('my-orders');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between ${currentPage === 'my-orders' ? 'bg-forest-900/10 text-forest-950 font-bold' : 'hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-forest-800" />
                  <span>My Orders</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Account & Policies Section in Mobile Drawer */}
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-3 tracking-wider block mb-1">
                  Account & Policies
                </span>

                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-forest-950 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <User className="w-4 h-4 text-forest-800" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('my-orders');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-forest-950 hover:bg-slate-50"
                    >
                      My Past Orders
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          onNavigate('admin-dashboard');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-800 hover:bg-amber-50 flex items-center space-x-1.5"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        <span>Admin Portal</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onNavigate('login');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-forest-950 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Customer Login</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Direct WhatsApp Customer Care (Dynamic from Store Settings) */}
                <a
                  href={appConfig.getWhatsAppLink('Hello Novis Herbal Support, I have come via your Novis Herbal website.')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs hover:bg-emerald-100 transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">WhatsApp Care ({appConfig.formattedWhatsApp})</span>
                </a>

                {/* Direct Calling Hotline (Dynamic from Store Settings) */}
                <a
                  href={appConfig.getTelLink()}
                  className="w-full mt-2 p-3 bg-forest-50 border border-forest-200 text-forest-900 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs hover:bg-forest-100 transition"
                >
                  <PhoneCall className="w-4 h-4 text-forest-800 shrink-0" />
                  <span className="truncate">Call Hotline ({appConfig.formattedPhone})</span>
                </a>

                {/* Direct Google Gmail Web Compose (Dynamic from Store Settings) */}
                <a
                  href={appConfig.getGmailLink('Customer Inquiry - Novis Herbal Support')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full mt-2 p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs hover:bg-rose-100 transition"
                >
                  <Mail className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="truncate">Email ({appConfig.supportEmail})</span>
                </a>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-[#FAF8F5] text-center text-[10px] text-slate-400">
              <span className="font-bold text-forest-950 block">100% Ayurvedic • Ayush Approved</span>
              <span>Shipping Available in All India</span>
            </div>

          </div>
        </div>,
        document.body
      )}

    </header>
  );
};
