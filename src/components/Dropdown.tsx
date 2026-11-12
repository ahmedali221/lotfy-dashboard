'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ElementType, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ElementType;
}

interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  /** Layout classes for the wrapper, e.g. width. */
  className?: string;
  /** Merged onto the trigger button to restyle it, e.g. as a status pill. */
  triggerClassName?: string;
  placeholder?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  required?: boolean;
  name?: string;
  /** Leave the current value out of the menu, for "move to" style choices. */
  hideSelected?: boolean;
  /** Minimum menu width in px when the trigger is narrower. */
  menuMinWidth?: number;
}

const MENU_MAX_HEIGHT = 288;
const GAP = 6;

// Replaces the native <select>, whose open list cannot be styled. The menu is
// portalled and fixed to the viewport so scrolling tables and modals never
// clip it.
export function Dropdown<T extends string>({
  value, onChange, options, className, triggerClassName, placeholder,
  disabled, busy, required, name, hideSelected, menuMinWidth = 0,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; rtl: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find(o => o.value === value);
  const items = hideSelected ? options.filter(o => o.value !== value) : options;
  const isDisabled = disabled || busy || items.length === 0;
  const SelectedIcon = selected?.icon;

  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const openMenu = () => {
    if (isDisabled) return;
    setActive(Math.max(0, items.findIndex(o => o.value === value)));
    setOpen(true);
  };

  const choose = (option: DropdownOption<T>) => {
    close(true);
    if (option.value !== value) onChange(option.value);
  };

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const rtl = getComputedStyle(triggerRef.current).direction === 'rtl';
    const width = Math.max(rect.width, menuMinWidth);
    const left = Math.min(Math.max(8, rtl ? rect.right - width : rect.left), window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < Math.min(MENU_MAX_HEIGHT, items.length * 40 + 12) && rect.top > spaceBelow;
    setPos(flip
      ? { bottom: window.innerHeight - rect.top + GAP, left, width, rtl }
      : { top: rect.bottom + GAP, left, width, rtl });
  }, [open, menuMinWidth, items.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    // Scrolling the page moves the trigger away from the fixed menu; scrolling
    // inside the menu itself is fine.
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    const onResize = () => close();
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) {
      menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(i => (i + 1) % items.length); break;
      case 'ArrowUp':   e.preventDefault(); setActive(i => (i - 1 + items.length) % items.length); break;
      case 'Home':      e.preventDefault(); setActive(0); break;
      case 'End':       e.preventDefault(); setActive(items.length - 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (items[active]) choose(items[active]);
        break;
      case 'Escape': e.preventDefault(); close(true); break;
      case 'Tab': close(); break;
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={isDisabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-secondary text-start shadow-sm transition-all',
          'hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          isDisabled ? 'opacity-60 cursor-default' : 'cursor-pointer',
          open && 'border-primary ring-2 ring-primary/30',
          triggerClassName,
        )}
      >
        {busy
          ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          : SelectedIcon && <SelectedIcon className="w-4 h-4 shrink-0" />}
        <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        {items.length > 0 && (
          <ChevronDown className={cn('w-4 h-4 shrink-0 opacity-70 transition-transform duration-200', open && 'rotate-180')} />
        )}
      </button>

      {/* Lets the browser's own form validation enforce `required`. */}
      {(required || name) && (
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          required={required}
          value={value}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
        />
      )}

      {open && pos && createPortal(
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          dir={pos.rtl ? 'rtl' : 'ltr'}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: MENU_MAX_HEIGHT }}
          className="z-[100] p-1.5 overflow-y-auto bg-white rounded-xl border border-border shadow-xl dropdown-in"
        >
          {items.map((option, i) => {
            const Icon = option.icon;
            const isSelected = option.value === value;
            const isActive = i === active;
            return (
              <div
                key={option.value}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(option)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer select-none transition-colors',
                  isActive ? 'bg-primary text-white' : isSelected ? 'bg-primary/10 text-secondary font-medium' : 'text-secondary',
                )}
              >
                {Icon && <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-muted-foreground')} />}
                <span className="flex-1">{option.label}</span>
                {isSelected && !hideSelected && <Check className="w-4 h-4 shrink-0" />}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
