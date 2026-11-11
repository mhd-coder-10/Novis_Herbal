import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface StoreSelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ElementType;
  description?: string;
}

export interface StoreSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (StoreSelectOption | string)[];
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
  required?: boolean;
  variant?: 'default' | 'pill' | 'minimal';
}

export const StoreSelect: React.FC<StoreSelectProps> = ({
  value,
  onChange,
  options: rawOptions,
  placeholder = 'Select option...',
  label,
  icon: LeadingIcon,
  disabled = false,
  className = '',
  dropdownClassName = '',
  size = 'md',
  searchable,
  id,
  variant = 'default'
}) => {
  // Normalize string[] or StoreSelectOption[]
  const options: StoreSelectOption[] = rawOptions.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-enable search if 8 or more options, unless explicitly set
  const shouldShowSearch = searchable !== undefined ? searchable : options.length >= 8;

  // Selected Option
  const selectedOption = options.find((opt) => opt.value === value);

  // Toggle dropdown and detect best direction (down or up) without gap
  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // Flip upwards only if space below is tight (< 200px) and space above is plenty (> 220px)
        setDropUp(spaceBelow < 200 && rect.top > 220);
      }
      setSearchQuery('');
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click (mouse or touch) or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && shouldShowSearch && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldShowSearch]);

  // Filter options
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
    sm: 'px-3 py-1.5 text-xs rounded-xl min-h-[34px]',
    md: 'px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl min-h-[42px]',
    lg: 'px-4 py-3 text-sm rounded-2xl min-h-[48px]'
  }[size];

  const variantClasses = {
    default: isOpen
      ? 'border-forest-900 ring-2 ring-forest-900/15 bg-white text-forest-950 shadow-sm'
      : 'border-slate-200/90 hover:border-forest-900/40 bg-[#FAF8F5] hover:bg-white text-slate-800 shadow-2xs',
    pill: isOpen
      ? 'border-forest-900 ring-2 ring-forest-900/15 bg-white text-forest-950 rounded-full shadow-sm'
      : 'border-slate-200 hover:border-forest-900/40 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-2xs',
    minimal: isOpen
      ? 'border-forest-900 ring-1 ring-forest-900/20 bg-white text-forest-950'
      : 'border-transparent hover:border-slate-200 bg-transparent hover:bg-slate-50 text-slate-800'
  }[variant];

  return (
    <div ref={containerRef} className={`relative inline-block text-left w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-800 mb-1.5">
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
        className={`w-full flex items-center justify-between gap-2.5 text-left font-medium transition-all duration-150 cursor-pointer select-none border ${variantClasses} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        } ${sizeClasses}`}
      >
        <span className="flex items-center space-x-2 truncate">
          {LeadingIcon && (
            <LeadingIcon className="w-4 h-4 text-forest-800 shrink-0" />
          )}
          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 text-forest-800 shrink-0" />
          )}
          <span className={`truncate ${selectedOption ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <span className="flex items-center space-x-1.5 shrink-0 pl-1">
          {selectedOption?.badge && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-forest-900' : 'group-hover:text-slate-600'
            }`}
          />
        </span>
      </button>

      {/* Floating Dropdown Menu directly attached to trigger via CSS absolute */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } left-0 w-full min-w-[200px] bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col z-[100] animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {/* Search Input for fast filtering */}
          {shouldShowSearch && (
            <div className="p-2.5 border-b border-slate-100 bg-[#FAF8F5]/80 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-transparent">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-slate-400 font-medium">
                No matching options found
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-forest-900/10 text-forest-950 font-bold'
                        : 'text-slate-700 hover:bg-[#FAF8F5] hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      {OptionIcon && (
                        <OptionIcon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-forest-900' : 'text-slate-400'
                          }`}
                        />
                      )}
                      <div className="truncate">
                        <div className="truncate leading-snug">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            isSelected
                              ? 'bg-forest-900 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-forest-900 stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
