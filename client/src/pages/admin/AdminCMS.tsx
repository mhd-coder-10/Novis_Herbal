import React, { useState, useEffect } from 'react';
import {
  Layers,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Eye,
  Megaphone,
  Mail,
  ExternalLink,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  Package,
  RefreshCw,
  X
} from 'lucide-react';
import { useCMSStore } from '../../store/useCMSStore';
import api, { getFullImageUrl } from '../../services/api';
import { toast } from '../../store/useToastStore';
import { emitLiveEvent } from '../../services/realtimeSync';
import type { Product } from '../../types';

const DEFAULT_SLIDE_IMAGES = [
  'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg',
  'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361817/NOVISE_HERBAL/products/novise_shampoo_1.jpg',
  'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361811/NOVISE_HERBAL/products/novise_hair_oil_1.jpg'
];

export const AdminCMS: React.FC = () => {
  const { cms, fetchCMS, updateCMSState } = useCMSStore();
  const [formData, setFormData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'banners' | 'announcement'>('banners');
  const [isSaving, setIsSaving] = useState(false);

  // Store products list for dynamic catalog linking
  const [products, setProducts] = useState<Product[]>([]);

  // Inline Bottom Banner Creation Form state
  const [isCreatingNewSlide, setIsCreatingNewSlide] = useState(false);
  const [newSlideFile, setNewSlideFile] = useState<File | null>(null);
  const [newSlideForm, setNewSlideForm] = useState({
    productId: '',
    productSlug: '',
    title: '',
    subtitle: '',
    badge: '',
    buttonText: 'CLAIM OFFER (ADD TO BAG)',
    buttonLink: '/shop',
    imageUrl: '',
    isActive: true
  });

  // Helper to reliably find connected catalog product for any slide
  const getConnectedProduct = (slide: any) => {
    if (!slide || !products || products.length === 0) return undefined;

    // 1. By productId
    if (slide.productId) {
      const found = products.find(p => String(p._id) === String(slide.productId));
      if (found) return found;
    }

    // 2. By productSlug
    if (slide.productSlug) {
      const found = products.find(p => p.slug === slide.productSlug);
      if (found) return found;
    }

    // 3. By buttonLink (/product/:slug)
    if (slide.buttonLink && slide.buttonLink.includes('/product/')) {
      const slug = slide.buttonLink.split('/product/')[1]?.split(/[?#]/)[0]?.trim();
      if (slug) {
        const found = products.find(p => p.slug === slug);
        if (found) return found;
      }
    }

    // 4. By keywords in title, subtitle, badge
    const text = `${slide.title || ''} ${slide.subtitle || ''} ${slide.badge || ''} ${slide.buttonLink || ''}`.toLowerCase();
    if (text.includes('combo')) {
      return products.find(p => p.isCombo || p.slug.includes('combo') || p.name.toLowerCase().includes('combo'));
    }
    if (text.includes('shampoo') || text.includes('dandruff')) {
      return products.find(p => !p.isCombo && (p.slug.includes('shampoo') || p.name.toLowerCase().includes('shampoo')));
    }
    if (text.includes('oil') || text.includes('growth') || text.includes('hair fall') || text.includes('hair-fall')) {
      return products.find(p => !p.isCombo && (p.slug.includes('oil') || p.name.toLowerCase().includes('oil')));
    }

    return undefined;
  };

  useEffect(() => {
    if (cms) {
      const data = JSON.parse(JSON.stringify(cms));
      setFormData(data);
    } else {
      fetchCMS();
    }
  }, [cms]);

  useEffect(() => {
    api.get('/products')
      .then((res) => {
        if (res.data?.success && res.data.products) {
          setProducts(res.data.products);
        }
      })
      .catch((err) => console.error('Failed to load products in CMS:', err));
  }, []);

  // Ensure all existing slides have their productId & productSlug linked on initial load
  useEffect(() => {
    if (formData && products.length > 0 && formData.heroSlides?.length > 0) {
      let changed = false;
      const updated = formData.heroSlides.map((slide: any) => {
        if (!slide.productId || !slide.productSlug) {
          const matched = getConnectedProduct(slide);
          if (matched) {
            changed = true;
            return {
              ...slide,
              productId: String(matched._id),
              productSlug: matched.slug
            };
          }
        }
        return slide;
      });
      if (changed) {
        setFormData((prev: any) => ({ ...prev, heroSlides: updated }));
      }
    }
  }, [products]);

  if (!formData) {
    return (
      <div className="py-20 text-center space-y-2">
        <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading CMS settings...</p>
      </div>
    );
  }

  const handleSaveCMS = async () => {
    setIsSaving(true);
    try {
      let currentSlides = [...(formData.heroSlides || [])];

      // 1. Process any pending deletions from Cloudinary
      for (const s of currentSlides) {
        if (s._pendingDeleteUrl) {
          try {
            await api.delete('/upload', { data: { url: s._pendingDeleteUrl } });
          } catch (e) {
            console.warn('Failed to delete old Cloudinary image:', e);
          }
        }
      }

      // 2. Upload any pending local banner images to Cloudinary Hero_Banner folder
      const pendingSlides = currentSlides.filter((s: any) => s._pendingFile);
      if (pendingSlides.length > 0) {
        toast.info(`Saving ${pendingSlides.length} banner photo(s)...`, 'Saving Media');
        for (let i = 0; i < currentSlides.length; i++) {
          const slide = currentSlides[i];
          if (slide._pendingFile) {
            const form = new FormData();
            form.append('image', slide._pendingFile);
            if (slide._oldImageUrl) {
              form.append('oldImageUrl', slide._oldImageUrl);
            }
            form.append('folder', 'Hero_Banner');

            const uploadRes = await api.post('/upload/hero-banner', form, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (uploadRes.data?.success && uploadRes.data?.fileUrl) {
              currentSlides[i] = {
                ...slide,
                imageUrl: uploadRes.data.fileUrl
              };
              delete currentSlides[i]._pendingFile;
              delete currentSlides[i]._oldImageUrl;
              delete currentSlides[i]._pendingDeleteUrl;
            } else {
              throw new Error(`Failed to upload photo for Slide #${i + 1}`);
            }
          }
        }
      }

      // 3. Ensure each slide has its connected productId and productSlug preserved and no temporary keys
      const normalizedSlides = currentSlides.map((s: any) => {
        const linked = getConnectedProduct(s);
        const { _pendingFile, _oldImageUrl, _pendingDeleteUrl, ...cleanSlide } = s;
        return {
          ...cleanSlide,
          productId: s.productId ? String(s.productId) : (linked ? String(linked._id) : ''),
          productSlug: s.productSlug ? s.productSlug : (linked ? linked.slug : '')
        };
      });

      const payload = {
        ...formData,
        heroSlides: normalizedSlides
      };

      const res = await api.put('/cms', payload);
      if (res.data?.success) {
        if (res.data.cms) updateCMSState(res.data.cms);
        fetchCMS();
        // Instantly notify storefront tabs in real-time
        emitLiveEvent('CMS_UPDATED', { cms: res.data.cms });
        toast.success('Website content & banner photos published successfully! Changes are now live on the public storefront.', 'Changes Published');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error updating CMS content', 'Publish Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Launch bottom inline creator form and auto-scroll directly to it
  const handleStartCreateSlide = () => {
    // Open a completely clean and empty form as requested
    setNewSlideFile(null);
    setNewSlideForm({
      productId: '',
      productSlug: '',
      title: '',
      subtitle: '',
      badge: '',
      buttonText: 'CLAIM OFFER (ADD TO BAG)',
      buttonLink: '/shop',
      imageUrl: '',
      isActive: true
    });

    setIsCreatingNewSlide(true);

    // Smooth scroll down to the bottom form card
    setTimeout(() => {
      const formEl = document.getElementById('new-banner-slide-creator-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleCloseCreateSlide = () => {
    setIsCreatingNewSlide(false);
    setNewSlideFile(null);
    setNewSlideForm({
      productId: '',
      productSlug: '',
      title: '',
      subtitle: '',
      badge: '',
      buttonText: 'CLAIM OFFER (ADD TO BAG)',
      buttonLink: '/shop',
      imageUrl: '',
      isActive: true
    });
  };

  const handleNewSlideProductChange = (prodId: string) => {
    const p = products.find(x => String(x._id) === String(prodId));
    if (p) {
      const disc = p.mrp > p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0;
      setNewSlideFile(null);
      setNewSlideForm({
        ...newSlideForm,
        productId: String(p._id),
        productSlug: p.slug,
        title: p.name,
        subtitle: p.shortDescription || newSlideForm.subtitle,
        badge: disc > 0 ? `Flat ${disc}% OFF` : (p.isBestSeller ? 'Bestseller' : 'Pure Botanical Ayurveda'),
        buttonText: newSlideForm.buttonText || 'CLAIM OFFER (ADD TO BAG)',
        buttonLink: `/product/${p.slug}`,
        imageUrl: (p.images && p.images[0]) ? p.images[0] : newSlideForm.imageUrl
      });
    } else {
      setNewSlideFile(null);
      setNewSlideForm({
        ...newSlideForm,
        productId: '',
        productSlug: '',
        title: '',
        subtitle: '',
        badge: '',
        buttonLink: '/shop',
        imageUrl: ''
      });
    }
  };

  // Select local image preview only - NO Cloudinary call until final publish
  const handleNewSlideImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).', 'Invalid File');
      return;
    }
    setNewSlideFile(file);
    const localUrl = URL.createObjectURL(file);
    setNewSlideForm(prev => ({ ...prev, imageUrl: localUrl }));
    toast.info('Banner photo selected successfully!', 'Photo Selected');
  };

  const handleSaveNewSlide = () => {
    if (!newSlideForm.title.trim()) {
      toast.error('Please enter a headline title for the banner.', 'Title Required');
      return;
    }
    if (!newSlideForm.imageUrl.trim()) {
      toast.error('Please select a product from catalog or choose a banner photo.', 'Photo Required');
      return;
    }
    const nextIdx = (formData.heroSlides?.length || 0) + 1;
    const addedSlide = {
      ...newSlideForm,
      _pendingFile: newSlideFile || undefined,
      order: nextIdx
    };
    setFormData((prev: any) => ({
      ...prev,
      heroSlides: [...(prev.heroSlides || []), addedSlide]
    }));
    handleCloseCreateSlide();
    toast.success(`Banner Slide #${nextIdx} created! Click "Publish Changes Live" in the top right to deploy.`, 'Slide Added');

    // Smooth scroll to the newly added slide in the list
    setTimeout(() => {
      const el = document.getElementById(`hero-slide-card-${nextIdx - 1}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  const handleLinkProductToSlide = (idx: number, prodId: string) => {
    const updated = [...formData.heroSlides];
    const p = products.find(x => x._id === prodId);
    if (p) {
      const disc = p.mrp > p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0;
      updated[idx].productId = p._id;
      updated[idx].productSlug = p.slug;
      updated[idx].buttonLink = `/product/${p.slug}`;
      if (!updated[idx].title || updated[idx].title === 'Pure Ayurvedic Botanical Hair Therapy') {
        updated[idx].title = p.name;
      }
      if (!updated[idx].subtitle) {
        updated[idx].subtitle = p.shortDescription || '';
      }
      if (!updated[idx].badge && disc > 0) {
        updated[idx].badge = `Flat ${disc}% OFF`;
      }
      if (!updated[idx].imageUrl || DEFAULT_SLIDE_IMAGES.includes(updated[idx].imageUrl)) {
        if (p.images && p.images[0]) {
          updated[idx].imageUrl = p.images[0];
        }
      }
    } else {
      delete updated[idx].productId;
      delete updated[idx].productSlug;
    }
    setFormData({ ...formData, heroSlides: updated });
  };

  const handleAutofillFromProduct = (idx: number, p: Product) => {
    const updated = [...formData.heroSlides];
    const disc = p.mrp > p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0;
    updated[idx].productId = p._id;
    updated[idx].productSlug = p.slug;
    updated[idx].title = p.name;
    if (p.shortDescription) {
      updated[idx].subtitle = p.shortDescription;
    }
    if (disc > 0) {
      updated[idx].badge = `Flat ${disc}% OFF`;
    }
    updated[idx].buttonLink = `/product/${p.slug}`;
    if (p.images && p.images[0]) {
      updated[idx].imageUrl = p.images[0];
    }
    setFormData({ ...formData, heroSlides: updated });
    toast.info(`Slide #${idx + 1} content autofilled from "${p.name}".`, 'Autofilled');
  };

  const handleRemoveHeroSlide = async (index: number) => {
    if (formData.heroSlides && formData.heroSlides.length <= 1) {
      toast.warning('At least one banner slide is required on the homepage.', 'Cannot Delete');
      return;
    }
    const slide = formData.heroSlides?.[index];
    if (!slide?._pendingFile && slide?.imageUrl && slide.imageUrl.includes('cloudinary.com') && slide.imageUrl.includes('Hero_Banner')) {
      try {
        await api.delete('/upload', { data: { url: slide.imageUrl } });
      } catch (e) {
        console.warn('Failed to delete slide image from Cloudinary:', e);
      }
    }
    setFormData({
      ...formData,
      heroSlides: formData.heroSlides.filter((_: any, i: number) => i !== index)
    });
    toast.info(`Slide #${index + 1} removed. Click "Publish Changes Live" to apply changes.`, 'Slide Removed');
  };

  const handleSlideImageSelect = (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).', 'Invalid File');
      return;
    }
    const localUrl = URL.createObjectURL(file);
    const updated = [...formData.heroSlides];
    const currentOldUrl = updated[index]?.imageUrl || '';
    updated[index] = {
      ...updated[index],
      imageUrl: localUrl,
      _pendingFile: file,
      _oldImageUrl: currentOldUrl && currentOldUrl.includes('cloudinary.com') ? currentOldUrl : undefined
    };
    setFormData({
      ...formData,
      heroSlides: updated
    });
    toast.info(`Slide #${index + 1} photo updated. Click "Publish Changes Live" in top right to deploy.`, 'Photo Selected');
  };

  const handleResetSlideImage = (index: number) => {
    const slide = formData.heroSlides?.[index];
    const currentUrl = slide?.imageUrl;

    const updated = [...formData.heroSlides];
    updated[index].imageUrl = DEFAULT_SLIDE_IMAGES[index] || DEFAULT_SLIDE_IMAGES[0];
    delete updated[index]._pendingFile;
    delete updated[index]._oldImageUrl;

    if (currentUrl && currentUrl.includes('cloudinary.com') && currentUrl.includes('Hero_Banner')) {
      updated[index]._pendingDeleteUrl = currentUrl;
    }

    setFormData({
      ...formData,
      heroSlides: updated
    });
    toast.info(`Slide #${index + 1} photo reset to default product photo. Click "Publish Changes Live" to apply.`, 'Photo Reset');
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">

      {/* Top Header & Save Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-gold-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Storefront Dynamic CMS</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-forest-950">
            Website CMS & Banner Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Update homepage carousel banners, top announcement bar, store policies, and contact information without editing code.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-2xs"
            title="Open storefront in new tab to see live changes"
          >
            <span>View Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleSaveCMS}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-forest-900/15 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 text-gold-400" />
            <span>{isSaving ? 'Publishing Live...' : 'Publish Changes Live'}</span>
          </button>
        </div>
      </div>

      {/* How It Works Quick Guide Card */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 rounded-2xl text-white border border-forest-800 shadow-sm flex items-start space-x-3.5">
        <div className="w-9 h-9 rounded-xl bg-gold-400/20 text-gold-300 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs leading-relaxed space-y-1">
          <h3 className="font-serif font-bold text-sm text-gold-300">How Website CMS Works:</h3>
          <p className="text-slate-300">
            Customize your storefront <strong>Homepage Carousel Banners</strong>, <strong>Top Announcement Strip</strong>, and <strong>Legal Policies</strong> in real time.
            After making changes, click the <strong>"Publish Changes Live"</strong> button in the top right to instantly deploy updates across the public storefront.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          onClick={() => setActiveTab('banners')}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'banners' ? 'bg-forest-900 text-gold-400 shadow-sm' : 'text-slate-600 hover:text-forest-950 hover:bg-slate-100'
            }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>1. Homepage Carousel Banners ({formData.heroSlides?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcement')}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'announcement' ? 'bg-forest-900 text-gold-400 shadow-sm' : 'text-slate-600 hover:text-forest-950 hover:bg-slate-100'
            }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>2. Top Announcement Bar</span>
        </button>
      </div>

      {/* ====================================================================
          TAB 1: HOMEPAGE CAROUSEL BANNERS
          ==================================================================== */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold-100 text-forest-900 border border-gold-300 mb-1">
                <span>{formData.heroSlides?.length || 0} Carousel Banners</span>
              </div>
              <h3 className="font-serif text-lg font-bold text-forest-950">
                Homepage Hero Carousel Banners
              </h3>
              <p className="text-xs text-slate-500">
                Customize headline titles, subtitles, promo badges, button links, and banner images for your homepage slider.
              </p>
            </div>

            <button
              onClick={handleStartCreateSlide}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl shadow-sm transition cursor-pointer self-start sm:self-auto select-none"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Banner Slide</span>
            </button>
          </div>

          <div className="space-y-6">
            {formData.heroSlides?.map((slide: any, idx: number) => {
              const previewImg = getFullImageUrl(slide.imageUrl);
              const connectedProd = getConnectedProduct(slide);
              const productLabel = connectedProd
                ? connectedProd.name
                : (idx === 0
                  ? 'Complete Combo Kit'
                  : idx === 1
                    ? 'Anti-Dandruff Shampoo'
                    : idx === 2
                      ? 'Ayurvedic Hair Growth Oil'
                      : `Banner Slide #${idx + 1}`);

              return (
                <div
                  key={idx}
                  id={`hero-slide-card-${idx}`}
                  className={`bg-white rounded-3xl border transition shadow-xs overflow-hidden ${slide.isActive !== false ? 'border-slate-200/90' : 'border-slate-200 opacity-75'
                    }`}
                >
                  {/* Card Header Bar */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-forest-900 text-gold-400 font-bold text-xs flex items-center justify-center font-mono">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-forest-950">
                            {slide.title || `Banner Slide #${idx + 1}`}
                          </h4>
                          <span className="text-[10px] bg-forest-900/10 text-forest-950 font-bold px-2 py-0.5 rounded-full border border-forest-900/15">
                            {productLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Badge: {slide.badge || 'None'} &bull; Target: {slide.buttonLink || '/shop'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Active Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...formData.heroSlides];
                          updated[idx].isActive = updated[idx].isActive === false ? true : false;
                          setFormData({ ...formData, heroSlides: updated });
                        }}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${slide.isActive !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        title="Toggle slide active status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${slide.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{slide.isActive !== false ? 'Slide Active' : 'Slide Disabled'}</span>
                      </button>

                      {/* Delete Slide */}
                      <button
                        type="button"
                        onClick={() => handleRemoveHeroSlide(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Delete banner slide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Form Fields + Live Mockup Preview */}
                  <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left: Input Configuration (7 cols) */}
                    <div className="lg:col-span-7 space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* Connected Store Product Selector */}
                        <div className="sm:col-span-2 p-3.5 bg-forest-950/[0.03] border border-forest-900/15 rounded-2xl space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <label className="text-slate-800 font-bold text-xs flex items-center space-x-1.5">
                              <Package className="w-3.5 h-3.5 text-forest-900" />
                              <span>Connected Store Product</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                (Dynamic live price, discount & inventory sync)
                              </span>
                            </label>
                            {connectedProd && (
                              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <span>Live: ₹{connectedProd.sellingPrice}</span>
                                <span className="line-through text-slate-400 font-normal">₹{connectedProd.mrp}</span>
                                {connectedProd.mrp > connectedProd.sellingPrice && (
                                  <span className="text-emerald-700">
                                    ({Math.round(((connectedProd.mrp - connectedProd.sellingPrice) / connectedProd.mrp) * 100)}% OFF)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <select
                              value={slide.productId || (connectedProd ? String(connectedProd._id) : '')}
                              onChange={(e) => handleLinkProductToSlide(idx, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900 font-medium text-xs cursor-pointer"
                            >
                              <option value="">-- Custom / No Connected Product --</option>
                              {products.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name} — ₹{p.sellingPrice} (MRP ₹{p.mrp}) {p.isCombo ? '• Combo Kit' : ''}
                                </option>
                              ))}
                            </select>

                            {connectedProd && (
                              <button
                                type="button"
                                onClick={() => handleAutofillFromProduct(idx, connectedProd)}
                                className="shrink-0 px-3 py-2 bg-forest-900/10 hover:bg-forest-900/20 text-forest-950 font-bold text-xs rounded-xl border border-forest-900/20 transition cursor-pointer flex items-center space-x-1"
                                title="Autofill title, subtitle, image & link from this product"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-forest-900" />
                                <span>Autofill</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-slate-700 font-bold mb-1.5">
                            Headline Title *
                          </label>
                          <input
                            type="text"
                            value={slide.title || ''}
                            placeholder="e.g. Pure Ayurvedic Botanical Care"
                            onChange={(e) => {
                              const updated = [...formData.heroSlides];
                              updated[idx].title = e.target.value;
                              setFormData({ ...formData, heroSlides: updated });
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">
                            Highlight Badge Tag
                          </label>
                          <input
                            type="text"
                            value={slide.badge || ''}
                            placeholder="e.g. Special Offer, Bestseller"
                            onChange={(e) => {
                              const updated = [...formData.heroSlides];
                              updated[idx].badge = e.target.value;
                              setFormData({ ...formData, heroSlides: updated });
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-bold mb-1.5">
                            Button Action Text
                          </label>
                          <input
                            type="text"
                            value={slide.buttonText || ''}
                            placeholder="e.g. Shop Now, Explore Range"
                            onChange={(e) => {
                              const updated = [...formData.heroSlides];
                              updated[idx].buttonText = e.target.value;
                              setFormData({ ...formData, heroSlides: updated });
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-slate-700 font-bold mb-1.5">
                            Subtitle / Supporting Description
                          </label>
                          <input
                            type="text"
                            value={slide.subtitle || ''}
                            placeholder="e.g. 100% Herbal Formulations For Root Strength"
                            onChange={(e) => {
                              const updated = [...formData.heroSlides];
                              updated[idx].subtitle = e.target.value;
                              setFormData({ ...formData, heroSlides: updated });
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-slate-700 font-bold mb-1.5">
                            Button Target Link (Where user goes when clicked)
                          </label>
                          <input
                            type="text"
                            value={slide.buttonLink || '/shop'}
                            placeholder="/shop or /products/sample-slug"
                            onChange={(e) => {
                              const updated = [...formData.heroSlides];
                              updated[idx].buttonLink = e.target.value;
                              setFormData({ ...formData, heroSlides: updated });
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono text-[11px]"
                          />
                        </div>

                        {/* Banner Photo Upload */}
                        <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/90">
                            <div className="flex items-center space-x-3.5">
                              <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs shrink-0">
                                <img
                                  src={getFullImageUrl(slide.imageUrl)}
                                  alt={`Slide #${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                  }}
                                />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-forest-950">
                                    Hero Banner Photo
                                  </span>
                                  {slide.imageUrl && !slide.imageUrl.includes('/uploads/') ? (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                      Custom Photo Active
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                                      Standard Product Photo
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Select high quality JPG, PNG or WEBP photo directly from your device.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
                              <label className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl cursor-pointer transition shadow-2xs">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Select Photo</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/jpg"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleSlideImageSelect(idx, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>

                              {(slide._pendingFile || (slide.imageUrl && !DEFAULT_SLIDE_IMAGES.includes(slide.imageUrl))) && (
                                <button
                                  type="button"
                                  onClick={() => handleResetSlideImage(idx)}
                                  className="inline-flex items-center space-x-1 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                                  title="Reset to standard product photo"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Live Visual Mockup Preview (5 cols) */}
                    <div className="lg:col-span-5 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        Live Storefront Banner Mockup Preview:
                      </span>
                      <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-900 border border-slate-200 shadow-md flex items-end">
                        {slide.imageUrl ? (
                          <img
                            src={previewImg}
                            alt="Banner slide preview"
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src = 'https://images.unsplash.com/photo-1608248597359-2ff661faec90?auto=format&fit=crop&q=80&w=800';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-forest-950 to-forest-900 flex items-center justify-center text-slate-500">
                            <ImageIcon className="w-8 h-8 opacity-40" />
                          </div>
                        )}

                        {/* Dark Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                        {/* Slide Content Overlay */}
                        <div className="relative p-4 sm:p-5 text-white space-y-1.5 w-full">
                          {slide.badge && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-400 text-forest-950 font-mono">
                              {slide.badge}
                            </span>
                          )}
                          <h4 className="font-serif font-black text-base sm:text-lg text-white leading-tight line-clamp-2">
                            {slide.title || 'Slide Title'}
                          </h4>
                          <p className="text-[11px] text-slate-200 line-clamp-1">
                            {slide.subtitle || 'Supporting banner subtitle description'}
                          </p>

                          {/* Live Product Pricing in Preview */}
                          {connectedProd && (
                            <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-gold-300 pt-0.5">
                              <span className="text-white font-bold text-xs">₹{connectedProd.sellingPrice}</span>
                              <span className="line-through text-slate-400 font-normal">₹{connectedProd.mrp}</span>
                              <span className="text-[9px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded font-sans uppercase">
                                Live Sync
                              </span>
                            </div>
                          )}

                          <div className="pt-1">
                            <span className="inline-block px-3 py-1 rounded-lg bg-forest-900 text-gold-400 font-bold text-[10px] uppercase tracking-wider shadow-sm">
                              {slide.buttonText || 'Shop Now'} &rarr;
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

            {/* ================================================================
                INLINE BOTTOM CREATOR FORM CARD (AFTER LAST BANNER SLIDE)
                ================================================================ */}
            {isCreatingNewSlide && (
              <div
                id="new-banner-slide-creator-form"
                className="bg-white rounded-3xl border-2 border-gold-400 shadow-xl overflow-hidden animate-fadeIn scroll-mt-24"
              >
                {/* Header Bar */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-gold-400 text-forest-950 font-black text-xs flex items-center justify-center font-mono">
                      +
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-white">
                          Create New Homepage Banner Slide
                        </h4>
                        <span className="text-[10px] bg-gold-400/20 text-gold-300 font-bold px-2 py-0.5 rounded-full border border-gold-400/30">
                          New Draft Slide #{(formData.heroSlides?.length || 0) + 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Choose a store product to link live prices, customize headline & banner image, then add to carousel.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseCreateSlide}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                    title="Cancel and close form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Fields + Live Mockup Preview */}
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Left: Inputs (7 cols) */}
                  <div className="lg:col-span-7 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Connected Store Product Selector */}
                      <div className="sm:col-span-2 p-3.5 bg-forest-950/[0.03] border border-forest-900/15 rounded-2xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <label className="text-slate-800 font-bold text-xs flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-forest-900" />
                            <span>Select Store Product to Feature *</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              (Autofills headline, image, discount & store link)
                            </span>
                          </label>
                          {(() => {
                            const newSlideConnected = products.find(p => String(p._id) === String(newSlideForm.productId));
                            if (!newSlideConnected) return null;
                            const disc = newSlideConnected.mrp > newSlideConnected.sellingPrice
                              ? Math.round(((newSlideConnected.mrp - newSlideConnected.sellingPrice) / newSlideConnected.mrp) * 100)
                              : 0;
                            return (
                              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <span>Live: ₹{newSlideConnected.sellingPrice}</span>
                                <span className="line-through text-slate-400 font-normal">₹{newSlideConnected.mrp}</span>
                                {disc > 0 && <span className="text-emerald-700">({disc}% OFF)</span>}
                              </span>
                            );
                          })()}
                        </div>

                        <select
                          value={newSlideForm.productId}
                          onChange={(e) => handleNewSlideProductChange(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900 font-medium text-xs cursor-pointer"
                        >
                          <option value="">-- Choose a Product from Catalog --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} — ₹{p.sellingPrice} (MRP ₹{p.mrp}) {p.isCombo ? '• Combo Kit' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Headline Title */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1.5">Headline Title *</label>
                        <input
                          type="text"
                          value={newSlideForm.title}
                          onChange={(e) => setNewSlideForm({ ...newSlideForm, title: e.target.value })}
                          placeholder="e.g. Pure Ayurvedic Botanical Hair Therapy"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900 font-medium"
                        />
                      </div>

                      {/* Highlight Badge */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Highlight Badge Tag</label>
                        <input
                          type="text"
                          value={newSlideForm.badge}
                          onChange={(e) => setNewSlideForm({ ...newSlideForm, badge: e.target.value })}
                          placeholder="e.g. Flat 57% OFF, Bestseller"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                      </div>

                      {/* Button Action Text */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Button Action Text</label>
                        <input
                          type="text"
                          value={newSlideForm.buttonText}
                          onChange={(e) => setNewSlideForm({ ...newSlideForm, buttonText: e.target.value })}
                          placeholder="e.g. CLAIM OFFER (ADD TO BAG)"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                      </div>

                      {/* Subtitle */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1.5">Subtitle / Supporting Description</label>
                        <input
                          type="text"
                          value={newSlideForm.subtitle}
                          onChange={(e) => setNewSlideForm({ ...newSlideForm, subtitle: e.target.value })}
                          placeholder="e.g. Clinically formulated herbal actives to eliminate stubborn dandruff and stimulate dense hair regrowth."
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                      </div>

                      {/* Button Target Link */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1.5">Button Target Link</label>
                        <input
                          type="text"
                          value={newSlideForm.buttonLink}
                          onChange={(e) => setNewSlideForm({ ...newSlideForm, buttonLink: e.target.value })}
                          placeholder="/product/product-slug"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-forest-900"
                        />
                      </div>

                      {/* Banner Photo Upload */}
                      <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/90">
                          <div className="flex items-center space-x-3.5">
                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs shrink-0 flex items-center justify-center">
                              {newSlideForm.imageUrl ? (
                                <img
                                  src={getFullImageUrl(newSlideForm.imageUrl)}
                                  alt="New Slide"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-product.png'; }}
                                />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-forest-950 block">Hero Banner Photo</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {newSlideForm.imageUrl
                                  ? (newSlideFile ? 'Photo selected from your device.' : 'Photo selected from product catalog.')
                                  : 'No photo selected yet (Select a product or choose photo below).'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {newSlideForm.imageUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewSlideFile(null);
                                  setNewSlideForm(prev => ({ ...prev, imageUrl: '' }));
                                }}
                                className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer transition select-none"
                                title="Clear selected photo"
                              >
                                Clear Photo
                              </button>
                            )}
                            <label className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl cursor-pointer transition shadow-2xs">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Select Photo</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/jpg"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleNewSlideImageSelect(file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right: Live Preview Mockup (5 cols) */}
                  <div className="lg:col-span-5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                      Live Storefront Banner Mockup Preview:
                    </span>
                    <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-900 border border-slate-200 shadow-md flex items-end">
                      {newSlideForm.imageUrl ? (
                        <img
                          src={getFullImageUrl(newSlideForm.imageUrl)}
                          alt="New Slide Preview"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1608248597359-2ff661faec90?auto=format&fit=crop&q=80&w=800'; }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-forest-950 via-forest-900 to-forest-950 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                          <ImageIcon className="w-10 h-10 text-gold-400/30 mb-2" />
                          <span className="text-xs text-gold-300/90 font-bold">Banner Photo Preview</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                            Select a product above or upload a photo to preview here
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                      <div className="relative p-4 sm:p-5 text-white space-y-1.5 w-full">
                        {newSlideForm.badge && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-400 text-forest-950 font-mono">
                            {newSlideForm.badge}
                          </span>
                        )}
                        <h4 className="font-serif font-black text-base sm:text-lg text-white leading-tight line-clamp-2">
                          {newSlideForm.title || 'Headline Title Preview'}
                        </h4>
                        <p className="text-[11px] text-slate-200 line-clamp-1">
                          {newSlideForm.subtitle || 'Supporting description preview...'}
                        </p>

                        {/* Live Product Pricing in Preview */}
                        {(() => {
                          const newSlideConnected = products.find(p => String(p._id) === String(newSlideForm.productId));
                          if (!newSlideConnected) return null;
                          return (
                            <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-gold-300 pt-0.5">
                              <span className="text-white font-bold text-xs">₹{newSlideConnected.sellingPrice}</span>
                              <span className="line-through text-slate-400 font-normal">₹{newSlideConnected.mrp}</span>
                              <span className="text-[9px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded font-sans uppercase">
                                Live Sync
                              </span>
                            </div>
                          );
                        })()}

                        <div className="pt-1">
                          <span className="inline-block px-3 py-1 rounded-lg bg-forest-900 text-gold-400 font-bold text-[10px] uppercase tracking-wider shadow-sm">
                            {newSlideForm.buttonText || 'Shop Now'} &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Review your banner details above and click <strong>"Add Slide to Carousel"</strong> to save to list.
                  </div>
                  <div className="flex items-center space-x-3 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleCloseCreateSlide}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewSlide}
                      className="inline-flex items-center space-x-2 px-6 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-forest-900/15 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-gold-400" />
                      <span>Add Slide to Carousel</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Bottom Add Slide Launcher Button */}
            {!isCreatingNewSlide && (
              <button
                type="button"
                onClick={handleStartCreateSlide}
                className="w-full p-5 sm:p-6 border-2 border-dashed border-slate-300 hover:border-forest-900/50 rounded-3xl bg-slate-50/70 hover:bg-white text-slate-700 hover:text-forest-950 transition-all flex items-center justify-center space-x-3 cursor-pointer group shadow-2xs select-none"
              >
                <div className="w-9 h-9 rounded-xl bg-forest-900/10 group-hover:bg-forest-900 group-hover:text-gold-400 text-forest-950 flex items-center justify-center transition">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs sm:text-sm block text-forest-950">
                    + Add New Banner Slide
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Open banner slide creation form at the bottom of the list
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: TOP ANNOUNCEMENT BAR
          ==================================================================== */}
      {activeTab === 'announcement' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="font-serif text-lg font-bold text-forest-950">
              Top Announcement Notification Bar
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              This ticker message strip runs at the very top of your entire storefront on mobile and desktop devices.
            </p>
          </div>

          {/* Toggle Control */}
          <div
            onClick={() => setFormData({
              ...formData,
              announcementBar: { ...formData.announcementBar, enabled: !formData.announcementBar?.enabled }
            })}
            className={`flex items-center space-x-3 p-4 rounded-2xl border cursor-pointer transition ${formData.announcementBar?.enabled !== false
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
          >
            <input
              type="checkbox"
              checked={formData.announcementBar?.enabled !== false}
              onChange={() => { }}
              className="w-5 h-5 rounded text-forest-900 focus:ring-forest-900 cursor-pointer"
            />
            <div>
              <p className="font-bold text-sm">
                {formData.announcementBar?.enabled !== false ? 'Announcement Bar Enabled (Active)' : 'Announcement Bar Disabled (Hidden)'}
              </p>
              <p className="text-[11px] opacity-75">
                When enabled, the announcement text ticker is displayed at the top of every storefront page.
              </p>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-bold">
              Announcement Message Text
            </label>
            <input
              type="text"
              value={formData.announcementBar?.text || ''}
              onChange={(e) => setFormData({
                ...formData,
                announcementBar: { ...formData.announcementBar, text: e.target.value }
              })}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition"
              placeholder="e.g. FREE SHIPPING AVAILABLE IN ALL INDIA &bull; 100% PURE BOTANICAL AYURVEDA"
            />
          </div>

          {/* Live Preview Strip */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Live Announcement Strip Preview on Storefront:
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Exact Storefront Match
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-gold-500/30 shadow-md">
              {formData.announcementBar?.enabled !== false ? (
                <div className="bg-forest-950 text-white py-3 px-4 sm:px-6 text-xs sm:text-sm font-bold tracking-wide text-center flex items-center justify-center gap-2 border-b border-gold-500/20 w-full shadow-inner">
                  <Sparkles className="w-4 h-4 text-gold-400 animate-pulse shrink-0" />
                  <span className="text-white tracking-wider">
                    {formData.announcementBar?.text || '100% PURE BOTANICAL AYURVEDA • SHIPPING AVAILABLE IN ALL INDIA • CASH ON DELIVERY AVAILABLE'}
                  </span>
                </div>
              ) : (
                <div className="bg-slate-100 text-slate-500 py-3.5 px-4 text-center text-xs italic font-medium">
                  Announcement bar is currently disabled (hidden on storefront)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
