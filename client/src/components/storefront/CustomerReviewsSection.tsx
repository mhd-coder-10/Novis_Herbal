import React from 'react';
import { Star, CheckCircle, ShieldCheck } from 'lucide-react';

export const CustomerReviewsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Rohan Deshmukh',
      location: 'Pune',
      rating: 5,
      title: 'Dandruff vanished in just 3 washes!',
      comment: 'I tried 5 different anti-dandruff shampoos before Novise. Nothing worked for more than 2 days. Novise completely stopped the flakes without making my hair like straw. Smells very herbal and fresh too!',
      product: 'Novise Anti-Dandruff Shampoo',
      verified: true,
      time: '1 week ago'
    },
    {
      name: 'Pooja Varma',
      location: 'Bangalore',
      rating: 5,
      title: 'Baby hairs sprouting after 1 month!',
      comment: 'Post-covid hair fall had ruined my temple area. The Novise Hair Oil dropper makes application so effortless. It is not overly greasy and washed off easily. I can clearly see dense baby hairs coming in.',
      product: 'Novise Ayurvedic Hair Growth Oil',
      verified: true,
      time: '2 weeks ago'
    },
    {
      name: 'Sameer Khan',
      location: 'Delhi NCR',
      rating: 5,
      title: 'Go for the Combo directly!',
      comment: 'Getting both for ₹599 is an absolute steal given the ingredient quality. The oil repairs the roots while the shampoo keeps the scalp super clean. 10/10 recommendation.',
      product: 'Combo Pack (Oil + Shampoo)',
      verified: true,
      time: '3 weeks ago'
    }
  ];

  return (
    <section className="py-10 sm:py-20 bg-white border-b border-slate-100">
      <div className="w-full px-3.5 sm:px-6 lg:px-10">
        
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-center space-x-1.5 text-amber-500 mb-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
            <span className="text-slate-900 font-extrabold ml-1.5 text-xs sm:text-base">4.9 / 5 Overall Rating</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
            Real Stories from Verified Novise Customers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Over 10,000+ Indian men and women have transformed their hair and scalp health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, idx) => (
            <div 
              key={idx}
              className="luxury-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-amber-500">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">{t.time}</span>
                </div>

                <h4 className="font-serif text-base font-bold text-slate-900">
                  "{t.title}"
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {t.comment}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-forest-950">{t.name}</span>
                    <span className="text-[10px] text-slate-400">({t.location})</span>
                  </div>
                  <span className="text-[10px] text-forest-800 font-bold">{t.product}</span>
                </div>
                {t.verified && (
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-xs text-slate-600 bg-cream-200/60 border border-slate-200/80 px-5 py-2.5 rounded-full font-medium shadow-sm">
            <ShieldCheck className="w-4 h-4 text-forest-900" />
            <span>All reviews are verified purchases submitted by genuine customers across India.</span>
          </div>
        </div>

      </div>
    </section>
  );
};
