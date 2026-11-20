import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Heart, Mail, Phone, PhoneCall, MessageCircle, MapPin, ExternalLink } from 'lucide-react';
import { useCMSStore } from '../../store/useCMSStore';
import { useProductStore } from '../../store/useProductStore';
import { appConfig } from '../../config/appConfig';

interface FooterProps {
  onNavigate: (page: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { cms } = useCMSStore();
  const { comboDiscount } = useProductStore();
  const contact = cms?.policies?.contactUs;

  return (
    <footer className="bg-forest-950 text-slate-300 pt-10 pb-8 sm:pt-16 sm:pb-12 border-t border-forest-900">

      {/* Trust Badges Strip */}
      <div className="w-full px-3.5 sm:px-6 lg:px-10 pb-8 sm:pb-12 border-b border-forest-900/60">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-6 text-center">
          <div className="flex flex-col items-center p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-forest-900/30 border border-forest-800/40">
            <Truck className="w-5 h-5 sm:w-7 sm:h-7 text-gold-400 mb-1.5 sm:mb-2" />
            <h4 className="text-white font-bold text-[11px] sm:text-sm">Shipping All India</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">All India Pincodes</p>
          </div>
          <div className="flex flex-col items-center p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-forest-900/30 border border-forest-800/40">
            <ShieldCheck className="w-5 h-5 sm:w-7 sm:h-7 text-gold-400 mb-1.5 sm:mb-2" />
            <h4 className="text-white font-bold text-[11px] sm:text-sm">100% Ayurvedic</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Zero Harsh Chemicals</p>
          </div>
          <a
            href={appConfig.getWhatsAppLink('Hello Novis Herbal Support, I have come via your Novis Herbal website.')}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-forest-900/30 border border-forest-800/40 hover:bg-forest-900/50 transition cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400 mb-1.5 sm:mb-2" />
            <h4 className="text-white font-bold text-[11px] sm:text-sm">Direct WhatsApp</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">{appConfig.formattedWhatsApp}</p>
          </a>
          <div className="flex flex-col items-center p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-forest-900/30 border border-forest-800/40">
            <Heart className="w-5 h-5 sm:w-7 sm:h-7 text-gold-400 mb-1.5 sm:mb-2" />
            <h4 className="text-white font-bold text-[11px] sm:text-sm">Cash on Delivery</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Pay at Doorstep</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="w-full px-3.5 sm:px-6 lg:px-10 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">

          {/* Brand Col */}
          <div className="space-y-4">
            <div
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 cursor-pointer select-none group py-1"
              title="Novis Herbal"
            >
              {/* High-Resolution Botanical Crest Emblem with Gold Rim */}
              <div className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] bg-gradient-to-tr from-gold-500/60 via-forest-800 to-gold-400/70 shadow-md group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/novise-emblem.png"
                  alt="Novis Herbal"
                  className="w-full h-full object-contain rounded-full filter brightness-110 drop-shadow-xs"
                />
              </div>

              {/* Native Brand Typography on Dark Forest Green */}
              <div className="flex flex-col select-none leading-none">
                <div className="flex items-baseline gap-0.5">
                  <span className="font-serif text-2xl sm:text-[25px] font-black tracking-[0.16em] text-white leading-none group-hover:text-gold-300 transition-colors uppercase">
                    NOVIS
                  </span>
                  <span className="text-[10px] font-bold text-gold-400 font-sans leading-none">
                    ™
                  </span>
                </div>
                <span className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.34em] text-gold-400 uppercase mt-1 leading-none font-sans">
                  HERBAL
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              {cms?.tagline || 'Pure Botanical Care for Majestic Hair. Formulated with potent Ayurvedic roots and clinically proven actives to eliminate dandruff and promote dense regrowth.'}
            </p>
            <div className="pt-2">
              <span className="text-xs text-gold-400 font-semibold">GMP Certified • Ayush Approved • 100% Cruelty-Free</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 text-gold-400">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition">Home</button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop')} className="hover:text-white transition">All Products</button>
              </li>
              <li>
                <button onClick={() => onNavigate('marketplaces')} className="hover:text-white transition text-gold-400 font-semibold">Our Marketplaces</button>
              </li>
              <li>
                <button onClick={() => onNavigate('product', 'novise-hair-oil-shampoo-combo')} className="hover:text-white transition text-gold-400 font-semibold">Combo Super Saver Pack ({comboDiscount}% OFF)</button>
              </li>
              <li>
                <button onClick={() => onNavigate('wishlist')} className="hover:text-white transition">My Wishlist</button>
              </li>
              <li>
                <button onClick={() => onNavigate('my-orders')} className="hover:text-white transition">My Orders</button>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 text-gold-400">
              Legal & Policies
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('policy', 'aboutUs')} className="hover:text-white transition">About Us</button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', 'shippingPolicy')} className="hover:text-white transition">Shipping Policy</button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', 'refundAndCancellation')} className="hover:text-white transition">Refund & Cancellation</button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', 'privacyPolicy')} className="hover:text-white transition">Privacy Policy</button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', 'termsAndConditions')} className="hover:text-white transition">Terms & Conditions</button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 text-gold-400">
              Direct Support
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start space-x-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <a
                  href={appConfig.getWhatsAppLink('Hello Novis Herbal Support, I have come via your Novis Herbal website.')}
                  target="_blank"
                  rel="noreferrer"
                  title="Chat directly on WhatsApp"
                  className="hover:text-emerald-300 transition"
                >
                  WhatsApp: <strong className="text-white font-mono">{appConfig.formattedWhatsApp}</strong>
                </a>
              </li>
              <li className="flex items-start space-x-2.5">
                <PhoneCall className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                <a href={appConfig.getTelLink()} className="hover:text-white transition">
                  Helpline: <span className="font-mono">{appConfig.formattedPhone}</span>
                </a>
              </li>
              <li className="flex items-start space-x-2.5">
                <Mail className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                <a
                  href={appConfig.getGmailLink('Customer Inquiry - Novis Herbal Support')}
                  target="_blank"
                  rel="noreferrer"
                  title="Open Gmail directly"
                  className="hover:text-white transition"
                >
                  {appConfig.supportEmail}
                </a>
              </li>
              <li className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                <span>{appConfig.storeAddress}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Official Marketplaces Strip */}
        <div className="pt-8 mt-8 border-t border-forest-900/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2 text-slate-400 text-center md:text-left">
            <span className="font-bold text-gold-400">Official Marketplaces:</span>
            <span>Shop authentic Novis Herbal formulations on your preferred shopping app</span>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href="https://amzn.in/d/0chVnDi4"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-forest-900/80 hover:bg-forest-900 text-gold-400 font-bold text-xs border border-gold-500/30 transition flex items-center space-x-1.5 shadow-2xs hover:scale-105"
            >
              <span>Amazon India</span>
              <ExternalLink className="w-3 h-3 text-gold-400" />
            </a>
            <a
              href="https://www.meesho.com/s/p/j3o1hl?utm_source=share_65abc4a8e45f0340a572b9872970274ee3b2eb8dca75c0c37609cd61da6d5498"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-forest-900/80 hover:bg-forest-900 text-pink-300 font-bold text-xs border border-pink-500/30 transition flex items-center space-x-1.5 shadow-2xs hover:scale-105"
            >
              <span>Meesho</span>
              <ExternalLink className="w-3 h-3 text-pink-400" />
            </a>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 mt-6 border-t border-forest-900/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-4 sm:space-y-0">
          <p>© {new Date().getFullYear()} NOVIS HERBAL. All Rights Reserved.</p>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">100% Encrypted SSL Checkout</span>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => onNavigate('admin-login')}
              className="hover:text-gold-400 transition"
            >
              Merchant Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
