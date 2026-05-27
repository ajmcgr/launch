import { useEffect, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Languages with flag emoji + native name. Codes are Google Translate codes.
const LANGS = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

const COOKIE_NAME = 'googtrans';

function setCookie(value: string) {
  // Set on current host AND parent domain so it sticks across subdomains
  const host = window.location.hostname;
  document.cookie = `${COOKIE_NAME}=${value};path=/`;
  document.cookie = `${COOKIE_NAME}=${value};path=/;domain=${host}`;
  const parts = host.split('.');
  if (parts.length > 1) {
    const root = '.' + parts.slice(-2).join('.');
    document.cookie = `${COOKIE_NAME}=${value};path=/;domain=${root}`;
  }
}

function getCurrentLang(): string {
  const m = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/);
  return m ? m[1] : 'en';
}

export const GoogleTranslate = () => {
  const [current, setCurrent] = useState('en');

  useEffect(() => {
    setCurrent(getCurrentLang());

    // Inject Google Translate init + script once
    if (document.getElementById('google-translate-script')) return;

    (window as any).googleTranslateElementInit = function () {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: LANGS.map((l) => l.code).join(','),
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };

    const s = document.createElement('script');
    s.id = 'google-translate-script';
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const handleSelect = (code: string) => {
    if (code === 'en') {
      setCookie('/auto/en');
    } else {
      setCookie(`/en/${code}`);
    }
    setCurrent(code);
    window.location.reload();
  };

  const currentLang = LANGS.find((l) => l.code === current) || LANGS[0];

  return (
    <>
      {/* Hidden container required by Google Translate widget */}
      <div id="google_translate_element" style={{ display: 'none' }} />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm font-medium text-nav-text hover:text-primary transition-colors notranslate">
          <span className="text-base leading-none">{currentLang.flag}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background max-h-[420px] overflow-y-auto w-52 notranslate">
          {LANGS.map((lang) => {
            const active = lang.code === current;
            return (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="w-4 flex items-center justify-center">
                  {active && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="text-base leading-none">{lang.flag}</span>
                <span className={active ? 'font-semibold' : ''}>{lang.name}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
