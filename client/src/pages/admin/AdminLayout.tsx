import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Layers,
  Tag,
  MessageSquare,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  Activity,
  Globe,
  Pin,
  PinOff,
  ChevronRight,
  Wallet,
  Settings,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminNotificationDropdown } from '../../components/admin/AdminNotificationDropdown';

interface AdminLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onExitToStore: () => void;
  children: React.ReactNode;
}

interface NavGroup {
  group: string;
  items: {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onExitToStore,
  children
}) => {
  const { user, logout } = useAuthStore();

  // Desktop Sidebar State:
  // - isPinned: permanently open and reserves layout space (pushes content)
  // - isHovered: auto-opens when hovering the edge tab / button
  // - isManualOpen: opened via header menu button
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('novis_admin_sidebar_pinned');
    return saved === 'true';
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem('novis_admin_sidebar_pinned', String(next));
      if (next) {
        setIsManualOpen(true);
      }
      return next;
    });
  };

  const handleCloseSidebar = () => {
    setIsPinned(false);
    localStorage.setItem('novis_admin_sidebar_pinned', 'false');
    setIsHovered(false);
    setIsManualOpen(false);
  };

  const isDesktopOpen = isPinned || isHovered || isManualOpen;

  // Lock window scroll to top-0 to prevent any white gap or strip appearing above the admin header
  useEffect(() => {
    window.scrollTo(0, 0);
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  const navGroups: NavGroup[] = [
    {
      group: 'MAIN DASHBOARD',
      items: [
        { id: 'dashboard', label: 'Dashboard & Analytics', icon: LayoutDashboard }
      ]
    },
    {
      group: 'STORE OPERATIONS',
      items: [
        { id: 'products', label: 'Products & Inventory', icon: Package },
        { id: 'orders', label: 'Orders & Courier Dispatch', icon: Truck },
        { id: 'customers', label: 'Customers & Users', icon: Users }
      ]
    },
    {
      group: 'FINANCE & BUSINESS',
      items: [
        { id: 'finance', label: 'Finance & Accounts', icon: Wallet, }
      ]
    },
    {
      group: 'MARKETING & CONTENT',
      items: [
        { id: 'reviews', label: 'Customer Reviews', icon: MessageSquare },
        { id: 'notifications', label: 'Notifications Hub', icon: Bell },
        { id: 'marketplaces', label: 'E-Commerce & Marketplaces', icon: Globe },
        { id: 'cms', label: 'Website CMS & Banners', icon: Layers }
      ]
    },
    {
      group: 'ADMINISTRATION & SECURITY',
      items: [
        { id: 'settings', label: 'Store Settings', icon: Settings },
        { id: 'credentials', label: 'Admin Credentials', icon: ShieldCheck }
      ]
    }
  ];

  const allItems = navGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === currentTab) || allItems[0];

  return (
      <div className="fixed inset-0 w-full h-full overflow-hidden flex bg-[#F6F7F9] text-slate-800 antialiased admin-panel">

        {/* FLOATING SIDEBAR OPEN TAB (Visible on desktop when sidebar is completely closed) */}
        {!isDesktopOpen && (
          <button
            onClick={() => setIsManualOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-[#07190F] hover:bg-forest-900 text-gold-400 hover:text-white p-2.5 rounded-r-2xl shadow-xl border-y border-r border-gold-500/30 transition transform hover:scale-105 items-center justify-center cursor-pointer group print:hidden"
            title="Open Navigation (Hover or Click)"
          >
            <ChevronRight className="w-4 h-4 stroke-[3] group-hover:translate-x-0.5 transition" />
          </button>
        )}

        {/* DESKTOP SIDEBAR (In-flow Flex Container: Smoothly pushes content & resizes page width) */}
        <aside
          onMouseEnter={() => !isPinned && setIsHovered(true)}
          onMouseLeave={() => {
            if (!isPinned) {
              setIsHovered(false);
              setIsManualOpen(false);
            }
          }}
          className={`hidden lg:flex lg:flex-col h-screen bg-[#07190F] text-slate-200 border-r border-[#0F2D1C] shadow-xl shrink-0 z-30 transition-[width] duration-300 ease-in-out overflow-hidden print:hidden ${isDesktopOpen ? 'w-64 xl:w-72' : 'w-0 border-r-0'
            }`}
        >
          <div className="w-64 xl:w-72 h-full flex flex-col shrink-0">
            {/* Brand Header with PIN & CLOSE buttons */}
            <div className="h-16 px-4 border-b border-[#133723] flex items-center justify-between bg-[#05130B] shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src="/novise-emblem.png"
                    alt="Novis Herbal"
                    className="w-9 h-9 rounded-xl object-contain bg-[#FAF5E8] p-1 shadow-md border border-gold-500/40"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#07190F]"></span>
                </div>
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-serif text-lg sm:text-xl font-black tracking-wider text-white">NOVIS</span>
                  <span className="text-[11px] bg-gradient-to-r from-gold-500 to-amber-500 text-forest-950 px-2.5 py-0.5 rounded-md font-mono font-black uppercase tracking-wider shadow-xs">
                    HERBAL
                  </span>
                </div>
              </div>

              {/* Action Buttons: Pin & Close */}
              <div className="flex items-center space-x-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={togglePin}
                  title={isPinned ? 'Sidebar Pinned Open (Click to auto-collapse on hover)' : 'Pin Sidebar Open'}
                  className={`p-1.5 rounded-lg transition ${isPinned
                    ? 'bg-gold-500/25 text-gold-400 border border-gold-400/50 hover:bg-gold-500/35'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {isPinned ? <Pin className="w-4 h-4 fill-gold-400" /> : <PinOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleCloseSidebar}
                  title="Close Sidebar"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-forest-900">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <span className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono block">
                    {group.group}
                  </span>

                  <div className="space-y-1 pt-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectTab(item.id);
                            if (!isPinned) {
                              setIsHovered(false);
                              setIsManualOpen(false);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition group ${isActive
                            ? 'bg-gradient-to-r from-gold-500 via-amber-400 to-amber-500 text-forest-950 shadow-lg shadow-gold-500/20 font-black'
                            : 'text-slate-300 hover:bg-[#0E2C1B] hover:text-white'
                            }`}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-forest-950 stroke-[2.5]' : 'text-gold-400 group-hover:scale-110'
                                }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && !isActive && (
                            <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shrink-0">
                              {item.badge}
                            </span>
                          )}

                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-forest-950 shrink-0"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Sidebar Bottom: Admin Profile Card Only */}
            <div className="p-3 border-t border-[#133723] bg-[#05130B] shrink-0">
              <div className="p-2.5 bg-[#0A2215] rounded-2xl border border-[#163D27] flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-forest-900 text-gold-400 font-bold flex items-center justify-center text-xs shrink-0 border border-gold-500/30">
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
                    <span className="text-[10px] text-gold-400 font-mono capitalize">
                      {user?.role || 'Admin'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT (Fixed Layout: Header fixed, Main content area scrolls & auto-resizes) */}
          <div className="h-full flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* TOP FIXED HEADER BAR */}
            <header className="bg-white border-b border-slate-200/90 h-16 flex items-center justify-between px-3 sm:px-8 shrink-0 z-20 shadow-xs print:hidden">

              {/* Left: Mobile Toggle & Brand Pill (Mobile) / Desktop Toggle & Module Title (Desktop) */}
              <div className="flex items-center space-x-2 sm:space-x-3.5 min-w-0">
                <button
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setIsMobileSidebarOpen(true);
                    } else {
                      if (isPinned) {
                        setIsPinned(false);
                        localStorage.setItem('novis_admin_sidebar_pinned', 'false');
                      } else {
                        setIsManualOpen(prev => !prev);
                      }
                    }
                  }}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition shadow-xs shrink-0"
                  title="Toggle Navigation Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Mobile Only: Novis Herbal Brand Lockup at Left / Start (Larger, bold & prominent) */}
                <div className="flex sm:hidden items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-forest-950 via-[#0A2215] to-forest-900 text-white rounded-xl shadow-xs border border-forest-800 shrink-0">
                  <span className="font-serif text-base font-black tracking-wider text-gold-300">NOVIS</span>
                  <span className="text-[11px] font-mono font-black bg-gradient-to-r from-gold-400 to-amber-400 text-forest-950 px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
                    HERBAL
                  </span>
                </div>

                {/* Desktop Only: Large Module Title */}
                <h1 className="hidden sm:block text-lg sm:text-xl font-serif font-black text-forest-950 truncate">
                  {activeItem.label}
                </h1>
              </div>

              {/* Right: Live Pill, View Store (Desktop only), and Novis Emblem Logo */}
              <div className="flex items-center space-x-2.5 sm:space-x-4">

                {/* Desktop Live Store Badge */}
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Store Online</span>
                </div>

                {/* Desktop View Store Button */}
                <button
                  onClick={onExitToStore}
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-forest-900 hover:bg-forest-950 text-gold-400 text-xs font-bold transition shadow-sm"
                  title="Open Public Website"
                >
                  <span>View Store</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gold-300" />
                </button>

                {/* Admin Notifications Dropdown (Visible on both desktop & mobile) */}
                <AdminNotificationDropdown onSelectTab={onSelectTab} />

                {/* Brand Logo scaled to header size (w-10 h-10 on mobile, w-11 h-11 on desktop) */}
                <div className="flex items-center sm:pl-3 sm:border-l sm:border-slate-200">
                  <img
                    src="/novise-emblem.png"
                    alt="Novis Herbal"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-[#FAF5E8] p-1.5 border border-gold-400/60 shadow-sm cursor-pointer hover:scale-105 transition"
                    title="Novis Herbal - Click to View Store"
                    onClick={onExitToStore}
                  />
                </div>

              </div>
            </header>

            {/* DYNAMIC SCROLLABLE BODY (Full width, responsive) */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full">
              {children}
            </main>

          </div>

          {/* MOBILE DRAWER (Full Navigation on Mobile Screen) */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
              <div
                className="fixed inset-0 bg-forest-950/70 backdrop-blur-sm animate-fadeIn"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <div className="relative w-80 max-w-[85vw] bg-[#07190F] text-white flex flex-col p-5 z-10 shadow-2xl animate-slideIn">

                {/* Drawer Header */}
                <div className="flex justify-between items-center pb-4 border-b border-[#133723]">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src="/novise-emblem.png"
                      alt="Novis"
                      className="w-8 h-8 rounded-lg object-contain bg-[#FAF5E8] p-1 shadow border border-gold-400/30"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="font-serif text-lg font-black tracking-wide text-white">NOVIS</span>
                      <span className="text-[10px] bg-gradient-to-r from-gold-500 to-amber-500 text-forest-950 px-2 py-0.5 rounded-md font-mono font-black uppercase tracking-wider shadow-xs">
                        HERBAL
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Grouped Nav */}
                <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-5">
                  {navGroups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1">
                      <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                        {group.group}
                      </span>
                      <div className="space-y-1 pt-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = currentTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                onSelectTab(item.id);
                                setIsMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${isActive
                                ? 'bg-gold-500 text-forest-950 font-black shadow-md'
                                : 'text-slate-300 hover:bg-[#0E2C1B] hover:text-white'
                                }`}
                            >
                              <div className="flex items-center space-x-2.5 truncate">
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-forest-950' : 'text-gold-400'}`} />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {item.badge && !isActive && (
                                <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full shrink-0">
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Drawer Footer: Back to Public Website on Mobile */}
                <div className="pt-3 border-t border-[#133723] space-y-2">
                  <button
                    onClick={() => {
                      setIsMobileSidebarOpen(false);
                      onExitToStore();
                    }}
                    className="w-full py-2.5 text-xs text-center border border-[#163D27] bg-[#0A2215] text-slate-200 font-bold rounded-xl flex items-center justify-center space-x-2"
                  >
                    <Globe className="w-3.5 h-3.5 text-gold-400" />
                    <span>Back to Public Website</span>
                  </button>
                  <button
                    onClick={logout}
                    className="w-full py-2.5 text-xs text-center bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
                  >
                    Sign Out
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
        );
};
