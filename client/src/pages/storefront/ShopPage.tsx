import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../../components/common/ProductCard';
import { StoreSelect } from '../../components/common/StoreSelect';
import type { Product } from '../../types';
import api from '../../services/api';
import { SlidersHorizontal, Search, Sparkles } from 'lucide-react';

interface ShopPageProps {
  onNavigate: (page: string, param?: string) => void;
  initialSearch?: string;
}

export const ShopPage: React.FC<ShopPageProps> = ({ onNavigate, initialSearch = '' }) => {
  const [searchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';
  const effectiveInitial = initialSearch || querySearch;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(effectiveInitial);
  const [selectedSort, setSelectedSort] = useState('popular');
  const [onlyInStock, setOnlyInStock] = useState(false);

  useEffect(() => {
    if (querySearch) {
      setSearch(querySearch);
    }
  }, [querySearch]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const params: any = {
          sort: selectedSort,
          search: search || undefined,
          inStock: onlyInStock ? 'true' : undefined
        };
        const res = await api.get('/products', { params });
        if (res.data?.success) {
          setProducts(res.data.products);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();

    // Listen to live updates from admin
    const handleLiveProductUpdate = () => {
      fetchProducts();
    };
    window.addEventListener('novise:product-updated', handleLiveProductUpdate);
    return () => {
      window.removeEventListener('novise:product-updated', handleLiveProductUpdate);
    };
  }, [search, selectedSort, onlyInStock]);

  return (
    <div className="py-6 sm:py-14">
      <div className="w-full px-3.5 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12 space-y-2 sm:space-y-3">
          <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-forest-900 bg-forest-900/10 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            <span>Official Novise Dispensary</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
            The Complete Scalp & Hair Collection
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl mx-auto font-normal">
            100% Ayurvedic hair growth oils, targeted clarifying anti-dandruff shampoos, and high-value combo routines with fast shipping across India.
          </p>
        </div>

        {/* Filter and Sort Toolbar */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6 sm:mb-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">

          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hair oil, shampoo, combo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-xs border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900"
            />
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3 sm:gap-4 text-xs">

            <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-700 font-semibold">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="rounded border-slate-300 text-forest-900 focus:ring-forest-900"
              />
              <span className="text-xs font-semibold">In Stock Only</span>
            </label>

            <div className="w-full sm:w-auto min-w-[210px] sm:min-w-[240px]">
              <StoreSelect
                value={selectedSort}
                onChange={setSelectedSort}
                icon={SlidersHorizontal}
                size="sm"
                options={[
                  { value: 'popular', label: 'Best Selling & Popular' },
                  { value: 'price-low', label: 'Price: Low to High' },
                  { value: 'price-high', label: 'Price: High to Low' },
                  { value: 'rating', label: 'Highest Customer Rating' }
                ]}
              />
            </div>

          </div>

        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-slate-200/80 h-80 rounded-2xl sm:rounded-3xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8">
            <p className="text-base font-bold text-slate-800">No products found matching your search</p>
            <button
              onClick={() => { setSearch(''); setOnlyInStock(false); }}
              className="mt-4 px-6 py-2.5 bg-forest-900 text-gold-400 rounded-xl text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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
    </div>
  );
};
