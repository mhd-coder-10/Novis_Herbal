import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Leaf,
  Truck,
  RotateCcw,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2,
  Phone,
  PhoneCall,
  MessageCircle,
  Mail,
  MapPin,
  Droplet,
  Award,
  AlertCircle
} from 'lucide-react';
import { useCMSStore } from '../../store/useCMSStore';
import { appConfig } from '../../config/appConfig';

export type PolicyKey = 'aboutUs' | 'shippingPolicy' | 'refundAndCancellation' | 'privacyPolicy' | 'termsAndConditions';

interface PolicyPageProps {
  policyType?: PolicyKey;
  onNavigate?: (page: string, param?: string) => void;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ policyType, onNavigate }) => {
  const { cms } = useCMSStore();
  const { policyType: paramPolicyType } = useParams<{ policyType?: PolicyKey }>();

  const effectivePolicy = (policyType || paramPolicyType || 'aboutUs') as PolicyKey;
  const [activeTab, setActiveTab] = useState<PolicyKey>(effectivePolicy);

  useEffect(() => {
    if (policyType) {
      setActiveTab(policyType);
    } else if (paramPolicyType) {
      setActiveTab(paramPolicyType);
    }
  }, [policyType, paramPolicyType]);

  const tabs = [
    { id: 'aboutUs' as PolicyKey, label: 'About Us', icon: Leaf },
    { id: 'shippingPolicy' as PolicyKey, label: 'Shipping & Delivery', icon: Truck },
    { id: 'refundAndCancellation' as PolicyKey, label: 'Cancellation & Refund', icon: RotateCcw },
    { id: 'privacyPolicy' as PolicyKey, label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'termsAndConditions' as PolicyKey, label: 'Terms & Conditions', icon: FileText }
  ];

  return (
    <div className="py-6 sm:py-14 w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-10">

      {/* Header Banner */}
      <div className="text-center space-y-2 sm:space-y-3">
        <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-forest-900 bg-forest-900/10 px-3.5 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-gold-600" />
          <span>Authentic Botanical Science • Transparency</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
          Novis Herbal Documentation & Policies
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Learn about our Ayurvedic heritage, rigorous clinical active ingredients, transparent shipping guarantees, and customer protections.
        </p>
      </div>

      {/* Interactive Tabs Header */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 pb-2 border-b border-slate-200 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }}
              className={`flex items-center space-x-2 px-3.5 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-tight transition-all shrink-0 whitespace-nowrap select-none cursor-pointer ${isActive
                ? 'bg-forest-950 text-gold-400 shadow-md scale-102'
                : 'bg-white text-slate-600 hover:text-forest-950 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-10 shadow-sm animate-fadeIn">

        {/* TAB 1: ABOUT US */}
        {activeTab === 'aboutUs' && (
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Pure Botanicals Heritage</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                The Novis Herbal Story
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Where Ancient Ayurvedic Wisdom Meets Modern Clinical Trichology.
              </p>
            </div>

            {/* Mission Statement */}
            <div className="p-4 sm:p-6 rounded-2xl bg-cream-100/60 border border-forest-900/10 space-y-3">
              <h3 className="font-serif text-base sm:text-lg font-bold text-forest-950 flex items-center space-x-2">
                <Leaf className="w-5 h-5 text-forest-900" />
                <span>Our Philosophy: Cleanse. Nourish. Protect.</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Novis Herbal was founded with a clear conviction: healthy, dense hair cannot grow on an inflamed, suffocated scalp. Millions of Indian men and women suffer from premature shedding and persistent dandruff because commercial brands rely on cheap sulfates that strip the moisture barrier, accompanied by synthetic mineral oils that clog hair follicles.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We set out to formulate a synergistic 2-step daily ritual using 100% cold-pressed herbal actives that cleanse scalp buildup without irritation and feed hair roots at cellular depth.
              </p>
            </div>

            {/* The 20 Cold Pressed Oils Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Droplet className="w-5 h-5 text-forest-900" />
                <h3 className="font-serif text-lg sm:text-xl font-bold text-forest-950">
                  The Signature 20 Nourishing Cold-Pressed Oils Blend
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every bottle of Novis Advanced Herbal Hair Oil (Net Vol. 200 ML) is slow-infused with 20 therapeutic botanicals:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                {[
                  { name: '1. Coconut Oil', benefit: 'Deep scalp conditioning & cuticle repair' },
                  { name: '2. Bhringraj Oil', benefit: 'Supports active hair regrowth' },
                  { name: '3. Sesame Seed Oil', benefit: 'Adds natural shine & luster' },
                  { name: '4. Onion Bulb Oil', benefit: 'Rich in sulfur for follicle stimulation' },
                  { name: '5. Argan Kernel Oil', benefit: 'Restores silky smoothness & softness' },
                  { name: '6. Black Seed Oil', benefit: 'Strengthens dormant hair roots' },
                  { name: '7. Jojoba Seed Oil', benefit: 'Balances natural scalp sebum' },
                  { name: '8. Sunflower Seed Oil', benefit: 'Nutrient-rich conditioning' },
                  { name: '9. Sweet Almond Oil', benefit: 'Nourishes dry, frizzy strands' },
                  { name: '10. Vitamin E', benefit: 'Cellular antioxidant protection' },
                  { name: '11. Lavender Oil', benefit: 'Soothes tension & natural aroma' },
                  { name: '12. Arnica Flower Oil', benefit: 'Calms redness & scalp irritation' },
                  { name: '13. Castor Seed Oil', benefit: 'Promotes thicker strand diameter' },
                  { name: '14. Brahmi Whole Herb', benefit: 'Boosts root vitality and strength' },
                  { name: '15. Licorice Root', benefit: 'Supports sustained new hair growth' },
                  { name: '16. Aloe Vera Leaf', benefit: 'Deep hydration & cooling moisture' },
                  { name: '17. Hibiscus Flower', benefit: 'Prevents premature graying & shine' },
                  { name: '18. Rosemary Leaf Oil', benefit: 'Micro-circulation root activator' },
                  { name: '19. Peppermint Leaf', benefit: 'Refreshing cooling sensation' },
                  { name: '20. Nettle Leaf', benefit: 'Follicle rejuvenation & DHT control' }
                ].map((herb, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-[#FAF8F5] space-y-0.5">
                    <span className="font-bold text-forest-950 block">{herb.name}</span>
                    <span className="text-[11px] text-slate-500 block leading-tight">{herb.benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* The 4 Targeted Anti-Dandruff Actives */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-forest-900" />
                <h3 className="font-serif text-lg sm:text-xl font-bold text-forest-950">
                  Targeted Anti-Dandruff Science: 4 Active Agents
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Novis Anti-Dandruff Clarifying Shampoo (Net Vol. 250 ML) pairs Ayurvedic herbs with clinical trichological actives:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-sm">ZPTO 2%</span>
                  <h4 className="font-bold text-slate-100">Zinc Pyrithione</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Proven medical-grade anti-fungal agent that eliminates Malassezia yeast from the 1st wash.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-sm">Salicylic Acid 1%</span>
                  <h4 className="font-bold text-slate-100">Beta Hydroxy Acid (BHA)</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Gently exfoliates stubborn dead skin flakes and dissolves hardened sebum buildup inside pores.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-sm">Neem Extract 1%</span>
                  <h4 className="font-bold text-slate-100">Azadirachta Indica</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Ancient Ayurvedic purifying botanical with potent antibacterial and anti-itching properties.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-sm">Tea Tree Extract 2%</span>
                  <h4 className="font-bold text-slate-100">Melaleuca Alternifolia</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Normalizes scalp oiliness, banishes odor, and leaves an invigorating clean sensation.
                  </p>
                </div>
              </div>
            </div>

            {/* Our Purity Pledge */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-slate-200/80 space-y-3">
              <h3 className="font-serif text-base sm:text-lg font-bold text-forest-950 flex items-center space-x-2">
                <Award className="w-5 h-5 text-gold-600" />
                <span>The Novise Zero-Compromise Purity Pledge</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-semibold text-forest-900">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Sulphate-Free</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Paraben-Free</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zero Silicones</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zero Mineral Oils</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Cruelty-Free (No Animal Testing)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>AYUSH & GMP Certified</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHIPPING & DELIVERY */}
        {activeTab === 'shippingPolicy' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Logistics & Timelines</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Shipping & Delivery Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fast, insured, and tracked shipping across 26,000+ Indian pincodes.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">1. Pan-India Delivery Coverage</h3>
              <p>
                Novise delivers to all states and union territories across India, covering over 26,000+ postal pincodes through our logistics partners via Shiprocket, including Delhivery, BlueDart, Xpressbees, DTDC, and Amazon Shipping.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">2. Shipping Charges & Delivery Coverage</h3>
              <div className="p-3.5 rounded-xl bg-cream-100/70 border border-forest-900/10 space-y-1">
                <p className="font-bold text-forest-950">
                  • <span className="text-emerald-700 uppercase">Free Express Shipping</span> on all orders above ₹{appConfig.freeShippingThreshold} (Standard shipping fee: ₹{appConfig.standardShippingFee} for smaller orders).
                </p>
                <p className="text-slate-600">
                  • Estimated Dispatch & Delivery Timeline: <strong>{appConfig.estimatedDeliveryText}</strong> across all serviceable pincodes.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">3. Order Processing & Dispatch Timelines</h3>
              <p>
                All confirmed orders are processed, packaged in tamper-evident corrugated boxes, and handed over to the courier partner within <strong>24 business hours</strong> from our central fulfillment center in Mumbai, Maharashtra (operating Monday through Saturday).
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">4. Estimated Delivery Timelines</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Metro Cities (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Pune):</strong> 2 to 4 business days.</li>
                <li><strong>Tier 2 & Tier 3 Cities / Rest of India:</strong> 4 to 6 business days.</li>
                <li><strong>North-East, Jammu & Kashmir, and Island Territories:</strong> 6 to 8 business days.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">5. Real-Time Tracking & Notifications</h3>
              <p>
                As soon as your shipment is scanned by the courier service, you will receive an automated SMS and Email with your live <strong>AWB Tracking Number</strong>. You can check real-time courier updates at any time directly on our website’s <button onClick={() => onNavigate?.('track-order')} className="text-forest-900 font-bold underline">Track Order</button> page.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">6. Cash on Delivery (COD) Terms</h3>
              <p>
                We proudly support Cash on Delivery (COD) for genuine customer convenience across India {appConfig.codFee > 0 ? `(with a nominal convenience fee of ₹${appConfig.codFee})` : '(with zero convenience surcharge)'}. You may pay with cash or via the delivery partner's verified UPI QR code upon parcel arrival.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: REFUND & CANCELLATION */}
        {activeTab === 'refundAndCancellation' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Customer Protection</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Cancellation, Refund & Non-Returnable Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fair, transparent, and strict hygiene compliance for all Novise patrons.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-xs uppercase tracking-wide">Strict Non-Returnable & Non-Replaceable Policy</span>
                <p className="text-xs">
                  All Novise Ayurvedic hair oils, serums, and botanical formulations are authentic personal-care items with tamper-evident seals. For hygiene, purity, and consumer safety, products once delivered <strong>cannot be returned, replaced, or exchanged</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">1. Damaged, Defective, or Leaked Parcels (Exceptional Claims)</h3>
              <p>
                We package our bottles securely with triple-layer protection. However, in rare events where your order arrives damaged, leaking, defective, or with missing items, you can raise an issue complaint within <strong>48 hours of delivery</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                <li>Directly from your <strong>My Orders</strong> page using the "Report Issue / Damage" button.</li>
                <li>Email: <a href={appConfig.getGmailLink('Damaged Shipment Issue')} target="_blank" rel="noreferrer" className="text-forest-900 underline font-semibold">{appConfig.supportEmail}</a></li>
                <li>WhatsApp: <a href={appConfig.getWhatsAppLink('Hello Novis Herbal Support, my order arrived damaged')} target="_blank" rel="noreferrer" className="text-forest-900 underline font-semibold">{appConfig.formattedWhatsApp}</a></li>
                <li>Helpline: <a href={appConfig.getTelLink()} className="text-forest-900 underline font-semibold">{appConfig.formattedPhone}</a></li>
              </ul>
              <p>
                Please attach clear photos of the outer shipping box, shipping label, and the affected item. Upon verification, our support team will review your claim and issue an approved full refund.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">2. Order Cancellation Rules</h3>
              <p>
                • <strong>Placed & Confirmed:</strong> You can cancel your order directly from your account before packing commences.<br />
                • <strong>Packed & Shipment Booked:</strong> {appConfig.orderSettings.allowCancellationAfterPacking ? 'Cancellation requests require seller/admin verification.' : 'Cancellation window is closed once the parcel is packed for shipping.'}<br />
                • <strong>In Transit & Out for Delivery:</strong> Orders cannot be cancelled after courier pickup. If you refuse delivery at your doorstep, the parcel will follow the RTO (Return to Origin) process.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">3. Refund Processing Timelines</h3>
              <div className="space-y-2">
                <p>
                  • <strong>Prepaid Orders (UPI, Cards, Netbanking):</strong> Eligible refunds are processed back to your original payment gateway source within <strong>5 to 7 business days</strong>.
                </p>
                <p>
                  • <strong>Cash on Delivery (COD) Orders:</strong> In cases where an exceptional claim is approved for a COD order, refunds are credited directly to your bank account or UPI ID within <strong>24 to 48 hours</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRIVACY POLICY */}
        {activeTab === 'privacyPolicy' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Data Integrity</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Privacy & Data Protection Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                We respect your personal privacy and strictly protect your data.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">1. Information We Collect</h3>
              <p>
                When you make a purchase on Novis Herbal (novise.in), we collect your name, postal shipping address, email address, and phone number. This information is utilized solely to process your order, provide Shiprocket shipping tracking alerts, and generate mandatory GST invoices.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">2. Zero Payment Data Storage</h3>
              <p>
                Your financial security is paramount. All online card, netbanking, and UPI payments are processed through RBI-authorized, PCI-DSS Level 1 certified payment gateways (e.g. Razorpay). <strong>Novise never stores, logs, or views your card numbers, CVV codes, or banking passwords.</strong>
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">3. Zero Third-Party Selling</h3>
              <p>
                We do not sell, rent, monetize, or trade your personal information with external advertising agencies or brokers. Your contact details are only shared with authorized logistics providers (Delhivery, BlueDart, Xpressbees) solely to fulfill your delivery.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">4. Your Data Rights</h3>
              <p>
                You may request access to, correction of, or permanent deletion of your customer profile and account history at any time by writing to our Data Grievance Officer at <a href="mailto:privacy@novise.in" className="text-forest-900 underline font-bold">privacy@novise.in</a>.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: TERMS & CONDITIONS */}
        {activeTab === 'termsAndConditions' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Legal Agreement</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Terms & Conditions of Service
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Terms governing usage, orders, and commercial transactions on Novise.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">1. Acceptance of Terms</h3>
              <p>
                By accessing, browsing, registering, or placing an order on novise.in, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions and our associated policies.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">2. Pricing, Invoicing & Taxes</h3>
              <p>
                All prices on novise.in are listed in Indian National Rupees (₹ INR) and are inclusive of all statutory Goods and Services Taxes (GST). We reserve the right to amend retail pricing or special bundle discounts at our discretion without prior notice.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">3. Botanical Product Disclaimer</h3>
              <p>
                Novise formulations are herbal Ayurvedic personal care cosmetics formulated for topical scalp and hair wellness. They are not intended to diagnose, cure, mitigate, or treat underlying systemic clinical conditions or pathological hormonal alopecia. Because natural botanicals vary, a 24-hour patch test on the inner elbow is recommended prior to regular use.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">4. Intellectual Property</h3>
              <p>
                All brand logos, trademarks (NOVIS HERBAL), formulation specifications, product photography, and digital website content are the exclusive legal intellectual property of Novise Naturals. Reproduction or unauthorized commercial use is strictly prohibited.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">5. Governing Law & Jurisdiction</h3>
              <p>
                These Terms and Conditions shall be construed and governed in accordance with the laws of the Republic of India. Any claims or disputes arising out of your purchases shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra, India.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Direct Contact Support Strip */}
      <div className="p-5 sm:p-7 rounded-2xl bg-forest-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-serif text-base sm:text-lg font-bold text-gold-400">Have a Question Regarding Our Policies?</h4>
          <p className="text-xs text-slate-300">
            Our Mumbai-based customer support team is available Monday to Saturday, 10:00 AM – 7:00 PM IST.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={appConfig.getWhatsAppLink('Hello Novis Herbal Support, I have come via your Novis Herbal website.')}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp ({appConfig.formattedWhatsApp})</span>
          </a>

          <a
            href={appConfig.getTelLink()}
            className="px-4 py-2 bg-forest-900 hover:bg-forest-800 text-gold-400 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition border border-gold-500/30"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call ({appConfig.formattedPhone})</span>
          </a>

          <a
            href={appConfig.getGmailLink('Customer Policy Inquiry')}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center space-x-1.5 transition"
          >
            <Mail className="w-3.5 h-3.5 text-gold-400" />
            <span>{appConfig.supportEmail}</span>
          </a>
        </div>
      </div>

    </div>
  );
};
