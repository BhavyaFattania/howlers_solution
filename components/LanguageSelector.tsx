"use client";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { usePathname } from 'next/navigation';
import '@/lib/i18n'; 

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' }
];

interface LanguageSelectorProps {
  inline?: boolean;
}

export function LanguageSelector({ inline = false }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "";
  
  // Return null for landing page when not inline to avoid duplicates
  if (pathname === '/' && !inline) {
    return null;
  }
  
  // Determine position based on route
  const isDashboard = pathname.includes('/coordinator') || pathname.includes('/volunteer');
  const positionClass = inline 
    ? "relative z-50 inline-block" 
    : (isDashboard ? "fixed bottom-6 right-6 z-50" : "absolute top-4 right-4 z-50");

  return (
    <div className={positionClass}>
      <div className="relative">
        <button 
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full shadow-sm text-sm font-medium transition-all"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{LANGUAGES.find(l => l.code === i18n.language)?.label || 'English'}</span>
        </button>
        
        {open && (
          <div className={`absolute right-0 ${inline ? "top-full mt-2" : (isDashboard ? "bottom-full mb-2" : "top-full mt-2")} w-32 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden`}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${i18n.language === lang.code ? 'text-brand font-bold bg-brand-50/50' : 'text-slate-600'}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
