import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Infinity as InfinityIcon,
  Sun,
  Award,
  SlidersHorizontal,
  ChevronDown,
  Check
} from 'lucide-react';

export type TimeRangeCasing = 'uppercase' | 'lowercase';

export interface TimeRangeDropdownProps {
  value: string;
  onChange: (period: string) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomStartDateChange?: (start: string) => void;
  onCustomEndDateChange?: (end: string) => void;
  onApplyCustom?: (start: string, end: string) => void;
  onResetCustom?: () => void;
  className?: string;
  label?: string;
  format?: TimeRangeCasing;
  showInlineInputs?: boolean;
}

interface OptionItem {
  id: string;
  label: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  icon: React.ElementType;
}

export const TimeRangeDropdown: React.FC<TimeRangeDropdownProps> = ({
  value,
  onChange,
  customStartDate = '',
  customEndDate = '',
  onCustomStartDateChange,
  onCustomEndDateChange,
  onApplyCustom,
  onResetCustom,
  className = '',
  label = 'TIME PERIOD:',
  format,
  showInlineInputs = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect uppercase vs lowercase
  const isUpper = format ? format === 'uppercase' : value === value.toUpperCase();
  const normalizedValue = (value || '').toLowerCase();

  const customKey = isUpper ? 'CUSTOM' : 'custom';
  const isCustomActive = normalizedValue === 'custom';

  // Novis Herbal Luxury Ayurvedic Theme Options
  const options: OptionItem[] = [
    {
      id: isUpper ? 'ALL' : 'all',
      label: 'All Time',
      iconBg: 'bg-forest-900/10',
      iconColor: 'text-forest-900',
      iconBorder: 'border-forest-900/15',
      icon: InfinityIcon
    },
    {
      id: isUpper ? 'TODAY' : 'today',
      label: 'Today',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      iconBorder: 'border-amber-200/70',
      icon: Sun
    },
    {
      id: isUpper ? 'THIS_WEEK' : 'week',
      label: 'This Week',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
      iconBorder: 'border-emerald-200/70',
      icon: Calendar
    },
    {
      id: isUpper ? 'THIS_MONTH' : 'month',
      label: 'This Month',
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-700',
      iconBorder: 'border-teal-200/70',
      icon: Calendar
    },
    {
      id: isUpper ? 'THIS_YEAR' : 'year',
      label: 'This Year',
      iconBg: 'bg-gold-50',
      iconColor: 'text-gold-700',
      iconBorder: 'border-gold-300/80',
      icon: Award
    },
    {
      id: isUpper ? 'CUSTOM' : 'custom',
      label: 'Custom Date Range',
      iconBg: 'bg-stone-100',
      iconColor: 'text-stone-700',
      iconBorder: 'border-stone-300/70',
      icon: SlidersHorizontal
    }
  ];

  // Find active option
  const activeOption = options.find((opt) => {
    if (isCustomActive && (opt.id === 'CUSTOM' || opt.id === 'custom')) return true;
    return opt.id.toLowerCase() === normalizedValue;
  }) || options[0];

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    if (optionId !== customKey && onResetCustom) {
      onResetCustom();
    }
    setIsOpen(false);
  };

  const handleTriggerApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onApplyCustom) {
      onApplyCustom(customStartDate, customEndDate);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-wrap items-center gap-2.5 sm:gap-3 ${className}`}
    >
      {/* Label with Novis Brand Icon */}
      {label && (
        <span className="flex items-center space-x-1.5 text-forest-950 font-bold uppercase tracking-wider text-xs shrink-0 select-none">
          <Calendar className="w-4 h-4 text-forest-900 shrink-0" />
          <span>{label}</span>
        </span>
      )}

      {/* Main Trigger Button matching Novis Herbal Brand Design */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group inline-flex items-center space-x-2 px-3.5 py-2 bg-white rounded-xl sm:rounded-2xl border text-xs font-semibold transition cursor-pointer shadow-2xs select-none ${isOpen
              ? 'border-forest-900 ring-2 ring-forest-900/10 text-forest-950'
              : 'border-slate-300 hover:border-forest-900/60 text-slate-800'
            }`}
        >
          <Calendar className="w-4 h-4 text-forest-900 shrink-0" />
          <span className="font-bold">{activeOption.label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-forest-900 transition-transform duration-200 ${isOpen ? 'rotate-180 text-forest-900' : ''
              }`}
          />
        </button>

        {/* Dropdown Menu - Luxury Novis Herbal Theme */}
        {isOpen && (
          <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-56 sm:w-60 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-1.5 space-y-0.5 z-[9999] animate-in fade-in duration-100 max-w-[calc(100vw-28px)]">
            {options.map((opt) => {
              const isSelected =
                opt.id === (isCustomActive ? customKey : activeOption.id);
              const IconComponent = opt.icon;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${isSelected
                      ? 'bg-forest-900 text-gold-400 font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-[#FAF8F5] hover:text-forest-950'
                    }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 transition ${isSelected
                          ? 'bg-forest-950 text-gold-400 border-forest-800'
                          : `${opt.iconBg} ${opt.iconColor} ${opt.iconBorder}`
                        }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[12.5px]">{opt.label}</span>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-gold-400 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline Date Inputs when Custom Date Range is active */}
      {showInlineInputs && isCustomActive && (
        <form
          onSubmit={handleTriggerApply}
          className="flex flex-wrap items-center gap-2 text-xs"
        >
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              FROM:
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                const val = e.target.value;
                if (onCustomStartDateChange) onCustomStartDateChange(val);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-forest-900/60 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900 transition shadow-2xs"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TO:
            </span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                const val = e.target.value;
                if (onCustomEndDateChange) onCustomEndDateChange(val);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-forest-900/60 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-900/15 focus:border-forest-900 transition shadow-2xs"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
};
