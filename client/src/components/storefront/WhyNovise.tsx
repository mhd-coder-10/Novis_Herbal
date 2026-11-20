import React from 'react';
import { Sparkles, ShieldCheck, Leaf, HeartHandshake } from 'lucide-react';

export const WhyNovise: React.FC = () => {
  const pillars = [
    {
      icon: Leaf,
      title: '20 Potent Ayurvedic Botanicals',
      desc: 'Cold-pressed Bhringraj, Rosemary, Redensyl, Methi, and Virgin Coconut oils that nourish hair roots and enhance scalp health.'
    },
    {
      icon: ShieldCheck,
      title: 'Clarifying Anti-Dandruff Actives',
      desc: 'Formulated with Zinc Pyrithione (ZPTO), Salicylic Acid, and Australian Tea Tree oil to gently cleanse scalp buildup and soothe flakes.'
    },
    {
      icon: Sparkles,
      title: 'Zero Harmful Additives',
      desc: '100% Free from Parabens, Sulfates, Silicones, Phthalates, Synthetic Perfumes and cheap Mineral Oils.'
    },
    {
      icon: HeartHandshake,
      title: 'Targeted Scalp & Root Care',
      desc: 'Crafted for Indian scalp and hair types. Deeply nourishes hair roots, soothes dryness, and supports natural hair vitality with regular botanical care.'
    }
  ];

  return (
    <section className="py-10 sm:py-20 bg-cream-200/50 border-b border-forest-900/5">
      <div className="w-full px-3.5 sm:px-6 lg:px-10">

        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14 space-y-2.5 sm:space-y-3">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-forest-800 bg-forest-900/10 px-3 py-1 rounded-full">
            The Novis Standard
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
            Ancient Ayurvedic Wisdom Powered by Modern Trichology
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto font-normal">
            We reject mass-produced chemical shampoos and generic scented oils. Every bottle of Novis Herbal is crafted for pure botanical hair and scalp nourishment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="luxury-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-forest-950 text-gold-400 flex items-center justify-center shadow-md shadow-forest-950/20">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-forest-950">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
