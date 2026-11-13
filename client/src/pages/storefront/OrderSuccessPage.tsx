import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Printer, Sparkles, MapPin, Copy, Check, Package } from 'lucide-react';
import { appConfig } from '../../config/appConfig';
import { toast } from '../../store/useToastStore';

interface OrderSuccessProps {
  orderId?: string;
  onNavigate: (page: string, param?: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessProps> = ({ orderId, onNavigate }) => {
  const { orderId: routeOrderId } = useParams<{ orderId?: string }>();
  const [copied, setCopied] = useState(false);

  const effectiveOrderId = decodeURIComponent(
    orderId || routeOrderId || sessionStorage.getItem('novis_last_order_id') || ''
  ).trim();

  useEffect(() => {
    if (effectiveOrderId) {
      sessionStorage.setItem('novis_last_order_id', effectiveOrderId);
    }
  }, [effectiveOrderId]);

  const handlePrintInvoice = () => {
    if (effectiveOrderId) {
      window.open(`${appConfig.apiBaseUrl}/orders/${effectiveOrderId}/invoice`, '_blank');
    }
  };

  const handleCopyId = () => {
    if (effectiveOrderId) {
      navigator.clipboard.writeText(effectiveOrderId);
      setCopied(true);
      toast.success('Order Reference ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="py-8 sm:py-16 w-full px-3.5 sm:px-6 lg:px-10 max-w-2xl mx-auto text-center space-y-6 sm:space-y-8 animate-fadeIn">

      {/* Brand Logo */}
      <div className="flex justify-center">
        <img
          src="/novise-logo-transparent.png"
          alt="Novis Herbal"
          className="h-14 sm:h-16 w-auto object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.endsWith('/novise-logo-cream.png')) {
              target.src = '/novise-logo-cream.png';
            }
          }}
        />
      </div>

      {/* Success Badge */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-100 shadow-md">
        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>

      <div className="space-y-2 sm:space-y-3">
        <div className="inline-flex items-center space-x-1.5 bg-forest-900/10 text-forest-900 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-gold-600" />
          <span>Order Placed & Confirmed</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-forest-950">
          Thank You for Choosing Novise!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed font-normal">
          Your order has been received by our fulfillment center. We are packing your pure botanical hair care formulas.
        </p>
      </div>

      {/* Order Reference Box */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm max-w-md mx-auto space-y-2.5 sm:space-y-3 text-left">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Order Reference ID:</span>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-extrabold text-forest-900 text-sm tracking-wider">
              {effectiveOrderId || 'N/A'}
            </span>
            {effectiveOrderId && (
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-forest-900 transition cursor-pointer"
                title="Copy Order ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Logistics Carrier:</span>
          <span className="font-semibold text-slate-800">India Post / Standard Courier</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-md mx-auto">
        <button
          onClick={() => onNavigate('my-orders')}
          className="w-full sm:w-auto px-6 py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Package className="w-4 h-4" />
          <span>View My Orders</span>
        </button>

        <button
          onClick={handlePrintInvoice}
          className="w-full sm:w-auto px-6 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Tax Invoice</span>
        </button>
      </div>

      <div className="pt-4">
        <button
          onClick={() => onNavigate('home')}
          className="text-xs font-semibold text-forest-800 hover:text-forest-950 inline-flex items-center space-x-1 cursor-pointer"
        >
          <span>Continue Shopping Novis Herbal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
