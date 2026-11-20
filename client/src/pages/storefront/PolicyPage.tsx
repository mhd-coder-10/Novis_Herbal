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
  AlertCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  ShieldAlert
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
    <div className="py-6 sm:py-14 w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-10 max-w-7xl mx-auto">

      {/* Header Banner */}
      <div className="text-center space-y-2 sm:space-y-3">
        <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-forest-900 bg-forest-900/10 px-3.5 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-gold-600" />
          <span>Authentic Botanical Science • Statutory Compliance</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
          Novis Herbal Documentation & Policies
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Official statutory documentation, authentic botanical formulations, transparent order logistics, personal hygiene non-returnable standards, and statutory consumer protections.
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

        {/* ========================================================================= */}
        {/* TAB 1: ABOUT US */}
        {/* ========================================================================= */}
        {activeTab === 'aboutUs' && (
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Pure Botanicals Heritage</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                The Novis Herbal Story & Philosophy
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Where Ancient Ayurvedic Wisdom Meets Modern Scalp & Hair Wellness.
              </p>
            </div>

            {/* Mission Statement */}
            <div className="p-4 sm:p-6 rounded-2xl bg-cream-100/60 border border-forest-900/10 space-y-3">
              <h3 className="font-serif text-base sm:text-lg font-bold text-forest-950 flex items-center space-x-2">
                <Leaf className="w-5 h-5 text-forest-900" />
                <span>Our Philosophy: Cleanse. Nourish. Protect.</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Novis Herbal Naturals was founded on the fundamental principle that resilient, lustrous hair begins with a balanced, well-nourished scalp environment. Many commercial hair products rely on harsh sulfates that strip the scalp's protective lipid barrier, paired with artificial mineral oils that can coat follicles and inhibit healthy respiration.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We formulated our signature hair care rituals using cold-pressed botanical oils and gentle clarifying actives that respect the natural biology of the scalp. Our goal is to provide honest, pure, and dependable botanical care that supports natural hair resilience and everyday scalp comfort.
              </p>
            </div>

            {/* The 20 Cold Pressed Oils Breakdown (Novis Advanced Herbal Hair Oil 200 ML) */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Droplet className="w-5 h-5 text-forest-900" />
                <h3 className="font-serif text-lg sm:text-xl font-bold text-forest-950">
                  Novis Advanced Herbal Hair Oil (Net Vol. 200 ML) — 20 Nourishing Oils Blend
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Slow-infused with 20 traditional cold-pressed botanicals selected to nourish hair roots, reduce dryness, and add natural softness and shine:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                {[
                  { name: '1. Coconut Oil', benefit: 'Deep scalp conditioning and cuticle moisture retention' },
                  { name: '2. Bhringraj (Eclipta Alba)', benefit: 'Classical Ayurvedic herb revered for revitalizing roots' },
                  { name: '3. Sesame Seed Oil', benefit: 'Rich in natural antioxidants; imparts lustrous shine' },
                  { name: '4. Onion Bulb Oil', benefit: 'Naturally rich in sulfur compounds that condition strands' },
                  { name: '5. Argan Kernel Oil', benefit: 'Smooths rough cuticles and helps tame everyday frizz' },
                  { name: '6. Black Seed (Kalonji) Oil', benefit: 'Fortifies dormant follicles and nourishes dry scalp' },
                  { name: '7. Jojoba Seed Oil', benefit: 'Mimics natural sebum to balance scalp moisture levels' },
                  { name: '8. Sunflower Seed Oil', benefit: 'Rich in linoleic acid for lightweight barrier support' },
                  { name: '9. Sweet Almond Oil', benefit: 'Softens dry, brittle hair shafts and enhances elasticity' },
                  { name: '10. Vitamin E (Tocopherol)', benefit: 'Vital antioxidant supporting healthy scalp environment' },
                  { name: '11. Lavender Oil', benefit: 'Provides calming, serene aroma and soothes scalp tension' },
                  { name: '12. Arnica Flower Oil', benefit: 'Gently comforts sensitive, weather-stressed scalp' },
                  { name: '13. Castor Seed Oil', benefit: 'Rich in ricinoleic acid for conditioning thicker strands' },
                  { name: '14. Brahmi (Bacopa Monnieri)', benefit: 'Time-honored botanical supporting hair shaft strength' },
                  { name: '15. Licorice Root (Mulethi)', benefit: 'Hydrates scalp surface and eases tight dryness' },
                  { name: '16. Aloe Vera Leaf Extract', benefit: 'Cooling moisture infusion that replenishes hydration' },
                  { name: '17. Hibiscus Flower Extract', benefit: 'Nourishes keratin fibers and restores natural vibrancy' },
                  { name: '18. Rosemary Leaf Oil', benefit: 'Invigorates scalp micro-environment and root wellness' },
                  { name: '19. Peppermint Leaf Oil', benefit: 'Refreshing cooling sensation that awakens the senses' },
                  { name: '20. Stinging Nettle Leaf', benefit: 'Mineral-rich herb supporting overall hair vitality' }
                ].map((herb, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-[#FAF8F5] space-y-0.5">
                    <span className="font-bold text-forest-950 block">{herb.name}</span>
                    <span className="text-[11px] text-slate-500 block leading-tight">{herb.benefit}</span>
                  </div>
                ))}
              </div>

              {/* Authentic Packaging Claims */}
              <div className="p-3.5 rounded-xl bg-forest-950/5 border border-forest-950/10 flex flex-wrap gap-2 text-xs font-semibold text-forest-900 justify-around">
                <span>✓ Nourishes Scalp & Hair</span>
                <span>✓ Helps Reduce Dryness & Frizz</span>
                <span>✓ Adds Softness & Natural Shine</span>
                <span>✓ Supports Stronger-Looking Hair</span>
              </div>
            </div>

            {/* The 4 Targeted Clarifying Actives (Novis Anti-Dandruff Shampoo 250 ML) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-forest-900" />
                <h3 className="font-serif text-lg sm:text-xl font-bold text-forest-950">
                  Novis Anti-Dandruff Clarifying Shampoo (Net Vol. 250 ML) — 4 Targeted Clarifying Actives
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Formulated with clinically respected clarifying actives and soothing Ayurvedic herbs to remove visible flakes and clear excess sebum without stripping moisture:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-xs uppercase tracking-wider">Clarifying Active</span>
                  <h4 className="font-bold text-slate-100 text-sm">Zinc Pyrithione (ZPTO)</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Dermatologically recognized anti-dandruff agent that helps control surface flake-causing microbes and maintain scalp hygiene.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-xs uppercase tracking-wider">Gentle Exfoliant</span>
                  <h4 className="font-bold text-slate-100 text-sm">Salicylic Acid (BHA)</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Beta Hydroxy Acid that gently dissolves stubborn dead skin build-up and loosens hardened sebum around hair follicle openings.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-xs uppercase tracking-wider">Ayurvedic Purifier</span>
                  <h4 className="font-bold text-slate-100 text-sm">Neem Leaf Extract (Azadirachta Indica)</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Classical Ayurvedic purifying botanical known for soothing scalp irritation, dryness, and itchiness naturally.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-forest-950 text-white space-y-1">
                  <span className="text-gold-400 font-mono font-bold text-xs uppercase tracking-wider">Botanical Refresher</span>
                  <h4 className="font-bold text-slate-100 text-sm">Australian Tea Tree Oil</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Balances excess oiliness, neutralizes odor, and leaves an invigorating clean sensation across the scalp after washing.
                  </p>
                </div>
              </div>
            </div>

            {/* Our Purity Pledge */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-slate-200/80 space-y-3">
              <h3 className="font-serif text-base sm:text-lg font-bold text-forest-950 flex items-center space-x-2">
                <Award className="w-5 h-5 text-gold-600" />
                <span>The Novis Zero-Compromise Purity Pledge</span>
              </h3>
              <p className="text-xs text-slate-600">
                Every batch of Novis Herbal is produced under strict quality control standards:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-semibold text-forest-900">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Sulphate-Free (SLS/SLES Free)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Paraben-Free</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zero Harsh Silicones</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zero Mineral Oils (No LLP)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Cruelty-Free (Never Tested on Animals)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Good Manufacturing Practices (GMP)</span>
                </span>
              </div>
            </div>

            {/* Statutory Compliance Note */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
              <span className="font-bold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>Statutory Cosmetic Notice:</span>
              </span>
              <p className="leading-relaxed">
                Novis Herbal formulations are proprietary Ayurvedic personal-care cosmetics meant for topical hygiene and root nourishment. They are not intended to diagnose, treat, mitigate, or cure medical conditions or hormonal pathological alopecia. Individual results vary depending on hair type, lifestyle, and application consistency.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SHIPPING & DELIVERY */}
        {/* ========================================================================= */}
        {activeTab === 'shippingPolicy' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Logistics & Transparency</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Shipping & Delivery Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fast, secure, and fully tracked logistics coverage across India.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950 flex items-center space-x-2">
                <Truck className="w-4 h-4 text-forest-900" />
                <span>1. Pan-India Delivery Coverage</span>
              </h3>
              <p>
                Novis Herbal delivers to all States and Union Territories across India, servicing over 26,000+ postal pincodes through authorized logistics courier networks, including India Post, Delhivery, DTDC, Xpressbees, and BlueDart.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">2. Shipping Charges & Free Delivery Threshold</h3>
              <div className="p-3.5 rounded-xl bg-cream-100/70 border border-forest-900/10 space-y-1.5">
                <p className="font-bold text-forest-950">
                  • <span className="text-emerald-700 uppercase">Free Express Shipping</span> on all orders meeting the store promotion threshold ({appConfig.freeShippingThreshold > 0 ? `Orders above ₹${appConfig.freeShippingThreshold}` : 'Available on all eligible orders'}).
                </p>
                <p className="text-slate-600">
                  • Standard Shipping Fee: {appConfig.isFreeShippingEnabled ? '₹0 (Free standard shipping active)' : `₹${appConfig.standardShippingFee} for smaller orders`}.
                </p>
                <p className="text-slate-600">
                  • Current Dispatch Benchmark: <strong>{appConfig.estimatedDeliveryText}</strong> across serviceable pincodes.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">3. Order Processing & Dispatch Timelines</h3>
              <p>
                All confirmed customer orders undergo quality verification, are packed into heavy-duty tamper-evident corrugated boxes with protective bubble cushioning, and are handed over to logistics partners within <strong>24 business hours</strong> from our central dispatch facility in Sidhpur, Gujarat (operating Monday through Saturday, excluding national and gazetted holidays).
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">4. Estimated Delivery Timelines (Business Days)</h3>
              <p>
                Delivery timelines are calculated from the moment of dispatch. While couriers strive for punctual delivery, timelines are estimated and may be subject to regional transit conditions:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700 font-medium">
                <li><strong>Metro Cities (Mumbai, Delhi-NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad):</strong> 2 to 4 business days.</li>
                <li><strong>Tier 2 & Tier 3 Cities / Rest of India:</strong> 4 to 6 business days.</li>
                <li><strong>North-Eastern States, Jammu & Kashmir, and Island Territories:</strong> 6 to 8 business days.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">5. Real-Time Consignment Tracking & Notifications</h3>
              <p>
                As soon as your shipment is scanned by the carrier, your unique consignment tracking number and live tracking link will be updated in your <button onClick={() => onNavigate?.('my-orders')} className="text-forest-900 font-bold underline cursor-pointer">My Orders</button> dashboard and sent directly via WhatsApp and email. You can verify package progress at any point directly on the carrier's tracking portal.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">6. Cash on Delivery (COD) Facility</h3>
              <p>
                We provide Cash on Delivery (COD) across serviceable postal codes with automated phone verification {appConfig.codFee > 0 ? `(with a convenience fee of ₹${appConfig.codFee})` : '(with zero convenience surcharge)'}. You may pay using cash or via the delivery agent's verified UPI QR code upon arrival.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REFUND & CANCELLATION */}
        {/* ========================================================================= */}
        {activeTab === 'refundAndCancellation' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Statutory Consumer Protections</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Cancellation, Refund & Non-Returnable Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Strict personal hygiene compliance and fair customer resolution procedures.
              </p>
            </div>

            {/* Strict Non-Returnable Policy Alert */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start space-x-3.5">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  Strict Non-Returnable & Non-Replaceable Personal Hygiene Policy
                </span>
                <p className="text-xs leading-relaxed text-amber-900/90">
                  All Novis Herbal products (including hair oils, shampoos, and hair rituals) are authentic personal-care cosmetic items manufactured with tamper-evident safety seals. For health, hygiene, purity, and consumer safety, products once delivered and received in intact condition <strong>cannot be returned, replaced, or exchanged</strong>. We do not accept returns due to change of mind, fragrance preference, or subjective non-suitability.
                </p>
              </div>
            </div>

            {/* 1. Order Cancellation Policy */}
            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950 flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-forest-900" />
                <span>1. Order Cancellation Rules</span>
              </h3>
              <p>
                Customers may cancel an order directly from their account before it enters the shipping pipeline:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl border border-slate-200 bg-[#FAF8F5] space-y-1">
                  <span className="font-bold text-forest-950 block text-xs">Stage 1: Placed / Confirmed</span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Instant 1-click cancellation available directly from your <button onClick={() => onNavigate?.('my-orders')} className="text-forest-900 underline font-semibold cursor-pointer">My Orders</button> page. Full refund issued immediately.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-[#FAF8F5] space-y-1">
                  <span className="font-bold text-forest-950 block text-xs">Stage 2: Packed / Booked</span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {appConfig.orderSettings.allowCancellationAfterPacking
                      ? 'Cancellation requests require customer support review before dispatch.'
                      : 'Cancellation window closes once the parcel is packed and shipping label is generated.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-[#FAF8F5] space-y-1">
                  <span className="font-bold text-forest-950 block text-xs">Stage 3: In Transit / Out for Delivery</span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Orders cannot be cancelled mid-transit. Doorstep delivery refusal will trigger standard courier Return to Origin (RTO).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Transit Damage & Leaked Parcels Claims */}
            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>2. Damaged, Leaking, or Defective Parcels (Exceptional Claims)</span>
              </h3>
              <p>
                We package every bottle with multi-layer cushioning. However, in the rare event that a package arrives crushed, visibly leaking, physically broken, or tampered with by the carrier, our customers are fully protected:
              </p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-forest-950 text-xs">
                  • Mandatory Reporting Window: Within <strong>{appConfig.orderSettings.damagedReportWindowHours} to 3 hours</strong> of courier delivery timestamp.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  • <strong>Mandatory Evidence for Claim Verification:</strong>
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-700 font-medium">
                  <li>Clear photograph of the outer shipping carton showing the printed address and carrier consignment tracking label.</li>
                  <li>Clear photographs of the damaged, leaked, or defective bottle showing the broken seal or crack.</li>
                  <li>A continuous, unedited unboxing video (up to {appConfig.orderSettings.maxReportVideoMinutes} minutes) clearly demonstrating the package being opened and the condition of the inner seal/bottle upon arrival.</li>
                </ol>
              </div>

              <p className="text-xs text-slate-600">
                You can submit your damage claim:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700 font-medium">
                <li>Directly from your <strong>My Orders</strong> portal using the "Report Issue / Damage" button.</li>
                <li>Via Email to: <a href={appConfig.getGmailLink('Damaged Shipment Issue')} target="_blank" rel="noreferrer" className="text-forest-900 underline font-semibold">{appConfig.supportEmail}</a></li>
                <li>Via WhatsApp Desk: <a href={appConfig.getWhatsAppLink('Hello Novis Herbal Support, my order arrived damaged')} target="_blank" rel="noreferrer" className="text-forest-900 underline font-semibold">{appConfig.formattedWhatsApp}</a></li>
                <li>Helpline Support: <a href={appConfig.getTelLink()} className="text-forest-900 underline font-semibold">{appConfig.formattedPhone}</a></li>
              </ul>
              <p className="text-xs text-slate-600">
                Upon verification by our fulfillment claims desk within 24 to 48 hours, an approved full refund will be processed without delay.
              </p>
            </div>

            {/* 3. Refund Timelines */}
            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-forest-900" />
                <span>3. Refund Processing Timelines</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <span className="font-bold text-emerald-950 block text-xs">Prepaid Orders (Cards, Netbanking, UPI, Wallets)</span>
                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    Refunds are initiated to your original payment gateway source within 24 hours of claim approval. Your bank or card issuer will credit the funds within <strong>5 to 7 business days</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                  <span className="font-bold text-amber-950 block text-xs">Cash on Delivery (COD) Orders</span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    In cases where an exceptional damage claim is verified and approved for a COD order, refunds are credited directly to your verified Bank Account (IMPS/NEFT) or UPI ID within <strong>24 to 48 hours</strong> following detail confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PRIVACY POLICY */}
        {/* ========================================================================= */}
        {activeTab === 'privacyPolicy' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Data Integrity & Protection</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Privacy & Data Protection Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Full compliance with the Digital Personal Data Protection (DPDP) Act, 2023 and Information Technology Act, 2000.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">1. Information We Collect</h3>
              <p>
                When you make a purchase or register an account on Novis Herbal (novise.in), we collect essential personal information including your full name, shipping delivery address, contact telephone number, and email address. This data is collected solely to process your orders, provide courier consignment tracking alerts via WhatsApp/SMS, and generate mandatory GST invoices.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">2. Zero Payment Data Storage</h3>
              <p>
                Your financial security is paramount. All online card, netbanking, and UPI payments are processed through RBI-authorized, PCI-DSS Level 1 certified payment gateways (such as Razorpay). <strong>Novis Herbal never stores, logs, or views your credit/debit card numbers, CVV codes, UPI PINs, or netbanking passwords.</strong>
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">3. Non-Disclosure & Zero Third-Party Selling</h3>
              <p>
                We maintain strict data privacy standards. We do not sell, rent, monetize, or trade your personal information with external advertising networks, brokers, or telemarketers. Your contact details are only shared with authorized logistics providers (e.g. India Post, Delhivery) strictly to fulfill physical package delivery.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">4. Your Data Rights & Redressal</h3>
              <p>
                You have the legal right to access, correct, update, or request permanent deletion of your customer profile and account history at any time by writing to our designated Grievance & Privacy Officer at <a href={`mailto:${appConfig.supportEmail}`} className="text-forest-900 underline font-bold">{appConfig.supportEmail}</a>.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: TERMS & CONDITIONS */}
        {/* ========================================================================= */}
        {activeTab === 'termsAndConditions' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-600">Statutory Legal Agreement</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-forest-950 mt-1">
                Terms & Conditions of Service
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Governing terms under the Consumer Protection Act, 2019 and Information Technology Act, 2000.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">1. Acceptance of Terms</h3>
              <p>
                By accessing, browsing, registering, or placing an order on novise.in (operated by Novis Herbal Naturals), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions and our associated policies.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">2. Pricing, Invoicing & GST Compliance</h3>
              <p>
                All prices on novise.in are listed in Indian Rupees (₹ INR) and are inclusive of all statutory Goods and Services Taxes (GST). Commercial entity: <strong>Novis Herbal Naturals</strong> (Sidhpur, Gujarat - 384151, GSTIN: {appConfig.gstNumber}). Computer-generated tax invoices are issued for every commercial transaction. We reserve the right to amend retail pricing or special bundle discounts at our discretion without prior notice.
              </p>
            </div>

            {/* CRUCIAL STATUTORY DISCLAIMER (GOVERNMENT OFFICER & AYUSH COMPLIANCE) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 space-y-2">
              <h3 className="font-serif text-sm font-bold text-amber-900 uppercase tracking-wide flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>3. Statutory Ayurvedic Cosmetic Product Disclaimer</span>
              </h3>
              <p className="text-xs leading-relaxed text-amber-900/90">
                Novis Herbal formulations are proprietary topical Ayurvedic personal-care cosmetics manufactured for scalp hygiene, nourishment, and hair conditioning. They are <strong>NOT intended to diagnose, treat, mitigate, or cure any medical ailment, clinical disease, systemic physiological illness, or hormonal/androgenetic alopecia</strong>.
              </p>
              <p className="text-xs leading-relaxed text-amber-900/90">
                Any reference to reducing hair fall refers strictly to reducing hair fall caused by mechanical breakage and dryness. Individual results may vary based on hair profile, scalp condition, hormonal health, lifestyle, and application consistency.
              </p>
              <p className="text-xs leading-relaxed font-semibold text-amber-900">
                • <strong>Mandatory 24-Hour Patch Test Advisory:</strong> Because natural herbs and cold-pressed botanical oils can trigger individual contact sensitivities in rare cases, a 24-hour patch test on the inner forearm or behind the ear is recommended prior to regular use. If redness, burning, or irritation occurs, discontinue use immediately.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">4. Intellectual Property Rights</h3>
              <p>
                All brand logos, trademarks ("NOVIS HERBAL"), trade dress, product packaging designs, photographs, graphics, and digital website content are the exclusive legal intellectual property of Novis Herbal Naturals. Any reproduction, imitation, or unauthorized commercial exploitation is strictly prohibited under the Indian Copyright Act, 1957 and Trade Marks Act, 1999.
              </p>
            </div>

            {/* GRIEVANCE OFFICER DETAILS (MANDATED BY CONSUMER PROTECTION RULES 2020) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-serif text-sm font-bold text-forest-950 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-forest-900" />
                <span>5. Statutory Grievance Redressal Mechanism</span>
              </h3>
              <p className="text-xs text-slate-600">
                In accordance with Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020:
              </p>
              <div className="text-xs text-slate-700 space-y-1 font-medium pl-2 border-l-2 border-forest-900/30">
                <p>• <strong>Grievance Officer:</strong> Customer Redressal Cell, Novis Herbal Naturals</p>
                <p>• <strong>Registered Address:</strong> Sidhpur, Gujarat - 384151, India</p>
                <p>• <strong>Official Email:</strong> <a href={`mailto:${appConfig.supportEmail}`} className="underline text-forest-900">{appConfig.supportEmail}</a></p>
                <p>• <strong>Customer Care Helpline:</strong> <a href={appConfig.getTelLink()} className="underline text-forest-900">{appConfig.formattedPhone}</a></p>
                <p>• <strong>Support Desk Hours:</strong> Monday to Saturday, 10:00 AM – 6:00 PM IST</p>
                <p>• <strong>Resolution Timelines:</strong> Acknowledgment within 48 hours; resolution within 30 business days.</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-base font-bold text-forest-950">6. Governing Law & Dispute Jurisdiction</h3>
              <p>
                These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any legal action or proceeding arising out of or related to website usage or commercial transactions shall be subject to the exclusive jurisdiction of the competent courts in Sidhpur / Patan District, Gujarat, India.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Direct Contact Support Strip */}
      <div className="p-5 sm:p-7 rounded-2xl bg-forest-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-serif text-base sm:text-lg font-bold text-gold-400">Have Questions Regarding Our Policies or Orders?</h4>
          <p className="text-xs text-slate-300">
            Our Gujarat-based customer care desk is available Monday to Saturday, 10:00 AM – 6:00 PM IST.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={appConfig.getWhatsAppLink('Hello Novis Herbal Support, I have a question regarding your store policies.')}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp ({appConfig.formattedWhatsApp})</span>
          </a>

          <a
            href={appConfig.getTelLink()}
            className="px-4 py-2 bg-forest-900 hover:bg-forest-800 text-gold-400 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition border border-gold-500/30 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call ({appConfig.formattedPhone})</span>
          </a>

          <a
            href={appConfig.getGmailLink('Customer Policy Inquiry')}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-gold-400" />
            <span>{appConfig.supportEmail}</span>
          </a>
        </div>
      </div>

    </div>
  );
};
