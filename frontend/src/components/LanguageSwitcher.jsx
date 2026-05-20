import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { LANGUAGES } from '../i18n/i18n';

/**
 * LanguageSwitcher — Navbar ma dropdown language selector
 * Usage: <LanguageSwitcher />
 */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen]     = useState(false);
  const dropdownRef         = useRef(null);

  const current = LANGUAGES.find(l => l.code === i18n.language)
    || LANGUAGES.find(l => i18n.language?.startsWith(l.code))
    || LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        title="Change language"
      >
        <Languages size={16} />
        <span className="text-xs font-medium hidden sm:block">{current.flag} {current.nativeLabel}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[160px]">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                current.code === lang.code ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <div className="flex-1 text-left">
                <p className="font-medium leading-tight">{lang.nativeLabel}</p>
                <p className="text-xs text-slate-400">{lang.label}</p>
              </div>
              {current.code === lang.code && (
                <Check size={14} className="text-indigo-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}