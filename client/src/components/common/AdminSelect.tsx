import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ElementType;
  description?: string;
}

export interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  id?: string;
  name?: string;
}

export const AdminSelect: React.FC<AdminSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  label,
  icon: LeadingIcon,
  disabled = false,
  className = '',
  dropdownClassName = '',
  size = 'md',
  searchable,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-enable search if there are 7 or more options, unless explicitly disabled
  const shouldShowSearch = searchable !== undefined ? searchable : options.length >= 7;

  // Selected Option Object
  const selectedOption = options.find((opt) => opt.value === value);

  // Position calculation for portal floating dropdown
  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    placeAbove: boolean;
  }>({ left: 0, width: 220, maxHeight: 320, placeAbove: false });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(320, options.length * 38 + 60);
    const placeAbove = spaceBelow < 200 && rect.top > spaceBelow;

    const width = Math.max(rect.width, 220);
    // Ensure doesn't overflow right edge of viewport
    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    const left = Math.max(12, Math.min(rect.left, maxLeft));

    if (placeAbove) {
      setPosition({
        bottom: window.innerHeight - rect.top + 6,
        left,
        width,
        maxHeight: Math.min(320, rect.top - 12),
        placeAbove: true
      });
    } else {
      setPosition({
        top: rect.bottom + 6,
        left,
        width,
        maxHeight: Math.min(320, spaceBelow - 12),
        placeAbove: false
      });
    }
  }, [options.length]);

  // Handle open / toggle
  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      calculatePosition();
      setSearchQuery('');
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click or scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, calculatePosition]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && shouldShowSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, shouldShowSearch]);

  // Filter options based on query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (opt.badge && opt.badge.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Size styling
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-[11px] rounded-lg',
    md: 'px-3.5 py-2 text-xs rounded-xl',
    lg: 'px-4 py-2.5 text-sm rounded-xl'
  }[size];

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 bg-[#FAF8F5] hover:bg-white border text-left font-semibold transition cursor-pointer select-none shadow-2xs ${
          isOpen
            ? 'border-forest-900 ring-2 ring-forest-900/15 bg-white text-forest-950'
            : 'border-slate-300/80 hover:border-forest-900/50 text-slate-800'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''} ${sizeClasses}`}
      >
        <span className="flex items-center space-x-2 truncate">
          {LeadingIcon && (
            <LeadingIcon className="w-3.5 h-3.5 text-forest-800 shrink-0" />
          )}
          {selectedOption?.icon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-forest-800 shrink-0" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <span className="flex items-center space-x-1.5 shrink-0 pl-1 text-slate-400">
          {selectedOption?.badge && (
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-bold">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-forest-900' : ''
            }`}
          />
        </span>
      </button>

      {/* Floating Dropdown Menu (Portalled to document.body so it NEVER clips inside modals or tables) */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{
              position: 'fixed',
              ...(position.placeAbove
                ? { bottom: `${position.bottom}px` }
                : { top: `${position.top}px` }),
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxHeight: `${position.maxHeight}px`,
              zIndex: 10001
            }}
            className={`bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col ${dropdownClassName}`}
          >
            {/* Search filter if 7+ options */}
            {shouldShowSearch && (
              <div className="p-2 border-b border-slate-100 bg-[#FCFBF8] shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsOpen(false);
                      }
                      if (e.key === 'Enter' && filteredOptions.length > 0) {
                        e.preventDefault();
                        handleSelectOption(filteredOptions[0].value);
                      }
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  const OptionIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectOption(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition cursor-pointer select-none group ${
                        isSelected
                          ? 'bg-forest-900/10 text-forest-950 font-bold'
                          : 'text-slate-700 hover:bg-[#FAF8F5] hover:text-forest-950 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {OptionIcon && (
                          <OptionIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-forest-900' : 'text-slate-400 group-hover:text-forest-800'
                            }`}
                          />
                        )}
                        <div className="truncate">
                          <span className="block truncate">{opt.label}</span>
                          {opt.description && (
                            <span className="block text-[10px] text-slate-400 font-normal truncate">
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                        {opt.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-forest-900 text-gold-300 font-bold'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-forest-900 stroke-[2.5]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

