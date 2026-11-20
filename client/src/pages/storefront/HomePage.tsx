import React, { useEffect, useState } from 'react';
import { HeroSlider } from '../../components/storefront/HeroSlider';
import { ProductCard } from '../../components/common/ProductCard';
import { WhyNovise } from '../../components/storefront/WhyNovise';
import { CustomerReviewsSection } from '../../components/storefront/CustomerReviewsSection';
import { FAQAccordion } from '../../components/storefront/FAQAccordion';
import type { Product } from '../../types';
import api from '../../services/api';
import { Sparkles, ArrowRight, ShieldCheck, Truck, Award } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        if (res.data?.success) {
          setProducts(res.data.products);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();

    // Listen for live real-time product updates from Admin panel
    const handleLiveProductUpdate = () => {
      fetchProducts();
    };
    window.addEventListener('novise:product-updated', handleLiveProductUpdate);
    return () => {
      window.removeEventListener('novise:product-updated', handleLiveProductUpdate);
    };
  }, []);

  return (
    <div className="space-y-0">

      {/* 1. Redesigned Interactive Editorial Hero */}
      <HeroSlider onNavigate={onNavigate} products={products} />

      {/* 2. Trust Values Banner */}
      <div className="bg-forest-950 text-white py-2.5 sm:py-3.5 border-b border-forest-900">
        <div className="w-full px-3.5 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-[10px] sm:text-xs font-bold tracking-wide uppercase text-slate-200 text-center">
            <span className="flex items-center justify-center space-x-1.5 p-1">
              <Sparkles className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              <span>100% Ayurvedic</span>
            </span>
            <span className="flex items-center justify-center space-x-1.5 p-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              <span>Pure Botanical Care</span>
            </span>
            <span className="flex items-center justify-center space-x-1.5 p-1">
              <Truck className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              <span>All India Shipping</span>
            </span>
            <span className="flex items-center justify-center space-x-1.5 p-1">
              <Award className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              <span>Cash on Delivery</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Hero Product Catalog Grid (Wide fluid layout) */}
      <section className="py-8 sm:py-16">
        <div className="w-full px-3.5 sm:px-6 lg:px-10">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-12 space-y-3 sm:space-y-0">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-forest-800 bg-forest-900/10 px-3 py-1 rounded-full mb-2 sm:mb-3">
                <Sparkles className="w-3 h-3 text-gold-600" />
                <span>Signature Formulations</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950 leading-tight">
                Targeted Ayurvedic Hair Care
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed font-normal">
                Whether dealing with everyday hair fall due to breakage, dry itchy scalp, or stubborn dandruff flakes, our botanical formulas deliver targeted root nourishment and gentle scalp cleansing.
              </p>
            </div>

            <button
              onClick={() => onNavigate('shop')}
              className="inline-flex items-center space-x-1.5 text-xs font-extrabold uppercase tracking-wider text-forest-950 hover:text-forest-800 transition group self-start sm:self-auto"
            >
              <span>Explore All Products</span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-600 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Product Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-slate-200/80 h-80 rounded-2xl sm:rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onNavigate={(slug) => onNavigate('product', slug)}
                />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 4. Why Novise Botanical Breakdown */}
      <WhyNovise />

      {/* 6. Customer Reviews & Ratings */}
      <CustomerReviewsSection onNavigate={onNavigate} />

      {/* 7. FAQ Accordion */}
      <FAQAccordion />

    </div>
  );
};
