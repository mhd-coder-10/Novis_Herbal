import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  X,
  Send,
  Users,
  User,
  Link as LinkIcon,
  Loader2,
  ChevronDown
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';

interface CustomerItem {
  _id: string;
  name: string;
  email: string;
}

interface AdminSendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: {
    _id?: string;
    email?: string;
    name?: string;
  } | null;
  onSuccess?: () => void;
}

export const AdminSendNotificationModal: React.FC<AdminSendNotificationModalProps> = ({
  isOpen,
  onClose,
  initialCustomer = null,
  onSuccess
}) => {
  const location = useLocation();

  const [targetType, setTargetType] = useState<'BROADCAST' | 'USER'>(
    initialCustomer ? 'USER' : 'BROADCAST'
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomer?._id || ''
  );
  const [targetEmail, setTargetEmail] = useState<string>(
    initialCustomer?.email || ''
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [actionUrl, setActionUrl] = useState('');

  // Customer dropdown list
  const [customerList, setCustomerList] = useState<CustomerItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modern searchable customer email dropdown state
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const emailDropdownRef = useRef<HTMLDivElement>(null);

  // Modern priority dropdown state
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  const priorityOptions: { value: 'NORMAL' | 'HIGH' | 'URGENT'; label: string }[] = [
    { value: 'NORMAL', label: 'Standard Priority (Normal)' },
    { value: 'HIGH', label: 'Important (Highlighted Banner)' },
    { value: 'URGENT', label: 'Urgent Priority (Top Notice)' }
  ];

  // Filter customer emails based on typed search query (all shown by default)
  const filteredCustomers = useMemo(() => {
  if (!customerSearchQuery.trim()) return customerList;
  const q = customerSearchQuery.trim().toLowerCase();
  return customerList.filter(
    (c) => c.email.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q))
  );
}, [customerList, customerSearchQuery]);

// Close dropdowns on click outside
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (emailDropdownRef.current && !emailDropdownRef.current.contains(e.target as Node)) {
      setIsEmailDropdownOpen(false);
    }
    if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(e.target as Node)) {
      setIsPriorityDropdownOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// Auto-close modal whenever user navigates to another page / admin tab
useEffect(() => {
  if (isOpen) {
    onClose();
  }
}, [location.pathname, location.search]);

// Press ESC to close modal
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);

// Lock body scroll when modal is open
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen]);

// Sync initialCustomer if passed
useEffect(() => {
  if (initialCustomer) {
    setTargetType('USER');
    setSelectedCustomerId(initialCustomer._id || '');
    setTargetEmail(initialCustomer.email || '');
  }
}, [initialCustomer]);

// Fetch customer emails for dropdown (pre-fetch as soon as modal opens)
useEffect(() => {
  if (!isOpen) return;

  let isMounted = true;
  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      let list: CustomerItem[] = [];

      try {
        const res = await api.get('/notifications/admin/customers');
        if (res.data?.success && Array.isArray(res.data.customers) && res.data.customers.length > 0) {
          list = res.data.customers.map((c: any) => ({
            _id: String(c._id || c.id),
            name: c.name || '',
            email: c.email || ''
          }));
        }
      } catch {
        // ignore
      }

      // Reliable fallback to admin customers API
      if (list.length === 0) {
        try {
          const fallbackRes = await api.get('/admin/customers?limit=100');
          if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.customers)) {
            list = fallbackRes.data.customers.map((c: any) => ({
              _id: String(c.id || c._id),
              name: c.name || '',
              email: c.email || ''
            }));
          }
        } catch {
          // ignore
        }
      }

      if (isMounted) {
        setCustomerList(list);
      }
    } catch (err) {
      // silent
    } finally {
      if (isMounted) setIsLoadingCustomers(false);
    }
  };

  fetchCustomers();
  return () => {
    isMounted = false;
  };
}, [isOpen]);

if (!isOpen) return null;

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!title.trim()) {
    toast.error('Please enter a notification title', 'Title Required');
    return;
  }
  if (!message.trim()) {
    toast.error('Please enter notification message details', 'Message Required');
    return;
  }
  if (targetType === 'USER' && !targetEmail.trim()) {
    toast.error('Please choose or enter a customer email address', 'Email Required');
    return;
  }

  try {
    setIsSubmitting(true);
    const res = await api.post('/notifications/admin/send', {
      targetType,
      targetUserId: selectedCustomerId || undefined,
      targetEmail: targetEmail.trim() || undefined,
      title: title.trim(),
      message: message.trim(),
      type: targetType === 'BROADCAST' ? 'ANNOUNCEMENT' : 'DIRECT_MESSAGE',
      priority,
      actionUrl: actionUrl.trim() || undefined
    });

    if (res.data?.success) {
      toast.success(
        targetType === 'BROADCAST'
          ? 'Broadcast notification published live to all customers!'
          : `Notification sent directly to ${targetEmail}!`,
        'Notification Sent'
      );
      onClose();
      if (onSuccess) onSuccess();
      // Reset form
      setTitle('');
      setMessage('');
      setActionUrl('');
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to send notification', 'Dispatch Error');
  } finally {
    setIsSubmitting(false);
  }
};

const modalContent = (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
    {/* Full Screen Backdrop covering entire viewport, header, and sidebar */}
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
      onClick={() => !isSubmitting && onClose()}
    />

    {/* Centered Luxury Modal Card */}
    <div
      role="dialog"
      aria-modal="true"
      className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn z-10 my-auto"
    >
      {/* Luxury Header */}
      <div className="p-4 sm:p-5 bg-forest-950 text-white flex items-center justify-between border-b border-forest-900/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center shadow-inner">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-white leading-tight">
              Send Notification / Announcement
            </h3>
            <p className="text-xs text-gold-300/80 mt-0.5">
              Broadcast store-wide or send direct in-app message to specific customer
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
        {/* Target Audience Selector */}
        <div>
          <label className="block text-slate-700 font-bold mb-2">Target Audience</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTargetType('BROADCAST')}
              className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition cursor-pointer ${targetType === 'BROADCAST'
                ? 'border-forest-900 bg-forest-900/5 text-forest-950 ring-1 ring-forest-900 font-bold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${targetType === 'BROADCAST' ? 'bg-forest-900 text-gold-400' : 'bg-slate-100 text-slate-500'
                  }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs">All Customers</p>
                <p className="text-[10px] text-slate-500">Store-wide broadcast</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTargetType('USER')}
              className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition cursor-pointer ${targetType === 'USER'
                ? 'border-forest-900 bg-forest-900/5 text-forest-950 ring-1 ring-forest-900 font-bold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${targetType === 'USER' ? 'bg-forest-900 text-gold-400' : 'bg-slate-100 text-slate-500'
                  }`}
              >
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Specific Customer</p>
                <p className="text-[10px] text-slate-500">Direct individual message</p>
              </div>
            </button>
          </div>
        </div>

        {/* Customer Select / Type Combo Field (When USER is selected) */}
        {targetType === 'USER' && (
            <div ref={emailDropdownRef} className="space-y-1.5 relative">
              <label className="block text-slate-700 font-bold text-xs">
                Select Customer Email <span className="text-rose-500">*</span>
              </label>

            <div className="relative">
                    {/* Trigger Button - Clean Custom Box, Zero Browser Autofill Trigger */}
                    <div
                      onClick={() => {
                        setIsEmailDropdownOpen((prev) => !prev);
                        setCustomerSearchQuery('');
                      }}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium outline-none transition flex items-center justify-between shadow-2xs cursor-pointer select-none ${isEmailDropdownOpen
                          ? 'border-forest-900 ring-2 ring-forest-900/15'
                          : 'border-slate-300 hover:border-slate-400'
                        }`}
                    >
                      <span className={targetEmail ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                        {targetEmail || '-- Choose Customer Email --'}
                      </span>
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        {targetEmail && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetEmail('');
                              setSelectedCustomerId('');
                              setCustomerSearchQuery('');
                            }}
                            className="p-0.5 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Clear selection"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${isEmailDropdownOpen ? 'rotate-180 text-forest-900' : ''
                            }`}
                        />
                      </div>
                    </div>

                              {/* Modern Floating Customer Dropdown List */ }
              {
                              isEmailDropdownOpen && (
                                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
                                  {/* Dedicated Search Input (Suppresses Chrome Autofill with type=search + name=query) */}
                                  <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                                    <input
                                      type="search"
                                      name="novise_customer_search_filter_term"
                                      id="novise_customer_search_filter_term"
                                      autoComplete="off"
                                      autoCapitalize="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                      data-lpignore="true"
                                      data-1p-ignore="true"
                                      value={customerSearchQuery}
                                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                      placeholder="Search email or type custom email..."
                                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-forest-900 focus:ring-1 focus:ring-forest-900/20 rounded-xl text-xs outline-none shadow-2xs font-medium text-slate-800 placeholder-slate-400"
                                      autoFocus
                                    />
                                  </div>

                                  {/* Customer Accounts List */}
                                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
                                    {isLoadingCustomers ? (
                                      <div className="px-4 py-4 text-xs text-slate-400 text-center font-medium">
                                        Loading customer accounts...
                                      </div>
                                    ) : filteredCustomers.length > 0 ? (
                                      filteredCustomers.map((c) => {
                                        const isSelected = targetEmail.trim().toLowerCase() === c.email.toLowerCase();
                                        return (
                                          <div
                                            key={c._id}
                                              onClick = {() => {
                                      setTargetEmail(c.email);
                                    setSelectedCustomerId(c._id);
                                    setIsEmailDropdownOpen(false);
                                    setCustomerSearchQuery('');
                            }}
                            className={`px-4 py-2.5 text-xs cursor-pointer transition select-none flex items-center justify-between ${isSelected
                                        ? 'bg-forest-950 text-gold-400 font-bold'
                                    : 'text-slate-800 hover:bg-forest-900/5 hover:text-forest-950 font-medium'
                            }`}
                          >
                                    <div>
                                      <span>{c.email}</span>
                                      {c.name && <span className="ml-2 text-[10px] text-slate-400">({c.name})</span>}
                                    </div>
                                    {isSelected && (
                                      <span className="text-[10px] uppercase font-bold text-gold-400">Selected</span>
                                    )}
                                  </div>
                                  );
                      })
                                  ) : (
                                  <div className="p-4 text-center">
                                    <p className="text-xs text-slate-500 mb-2">
                                      No existing customer matching "{customerSearchQuery}"
                                    </p>
                                    {customerSearchQuery.trim().includes('@') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTargetEmail(customerSearchQuery.trim());
                                          setSelectedCustomerId('');
                                          setIsEmailDropdownOpen(false);
                                          setCustomerSearchQuery('');
                                        }}
                                        className="px-3.5 py-1.5 bg-forest-950 text-gold-400 text-xs font-bold rounded-xl hover:bg-forest-900 transition cursor-pointer"
                                      >
                                        Use email: {customerSearchQuery.trim()}
                                      </button>
                                    )}
                                </div>
                              )
                            }
                  </div>
                </div>
              )}
              </div>
            </div>
        )}

            {/* Modern Notification Priority Dropdown */}
            <div ref={priorityDropdownRef} className="space-y-1.5 relative">
              <label className="block text-slate-700 font-bold text-xs">Notification Priority</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPriorityDropdownOpen((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 focus:border-forest-900 focus:ring-2 focus:ring-forest-900/15 rounded-xl text-xs font-medium text-slate-800 outline-none transition flex items-center justify-between shadow-2xs cursor-pointer text-left"
                >
                  <span>
                    {priorityOptions.find((p) => p.value === priority)?.label || 'Standard Priority (Normal)'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isPriorityDropdownOpen ? 'rotate-180 text-forest-900' : ''
                      }`}
                  />
                </button>

                {/* Modern Priority Floating Dropdown List - Pure clean text */}
                {isPriorityDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 animate-fadeIn">
                    {priorityOptions.map((opt) => {
                      const isSelected = priority === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setPriority(opt.value);
                            setIsPriorityDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-xs cursor-pointer transition select-none ${isSelected
                            ? 'bg-forest-950 text-gold-400 font-bold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-forest-950 font-medium'
                            }`}
                        >
                          {opt.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Notification Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekend Festival Offer: Flat 20% OFF on Herbal Combos!"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>

            {/* Message Description */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Detailed Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the full message details that customer will see in their notification card..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>

            {/* Action URL / Deep Link */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Action Deep Link (Optional)
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="e.g. /shop, /my-orders, or /policy/shipping"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-forest-900"
                />
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">Customer can tap this notification to jump directly to this page.</p>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !message.trim()}
                className="px-5 py-2 bg-forest-950 hover:bg-forest-900 text-gold-400 font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{targetType === 'BROADCAST' ? 'Broadcast Live 📢' : 'Send to Customer 🚀'}</span>
              </button>
            </div>
          </form>
    </div>
  </div >
);

return createPortal(modalContent, document.body);
};
