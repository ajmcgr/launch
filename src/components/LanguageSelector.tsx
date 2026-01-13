import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'cs', name: 'Czech' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'he', name: 'Hebrew' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'el', name: 'Greek' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'bg', name: 'Bulgarian' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onToggle: (code: string) => void;
  maxSelections?: number;
}

export const LanguageSelector = ({ 
  selectedLanguages, 
  onToggle, 
  maxSelections = 5 
}: LanguageSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" />
        <span>Select up to {maxSelections} languages ({selectedLanguages.length}/{maxSelections})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((lang) => {
          const isSelected = selectedLanguages.includes(lang.code);
          const isDisabled = !isSelected && selectedLanguages.length >= maxSelections;
          
          return (
            <Badge
              key={lang.code}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all",
                isSelected && "bg-primary text-primary-foreground",
                isDisabled && "opacity-50 cursor-not-allowed",
                !isSelected && !isDisabled && "hover:bg-muted"
              )}
              onClick={() => !isDisabled && onToggle(lang.code)}
            >
              {lang.name}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

// Display component for showing selected languages
interface LanguageDisplayProps {
  languages: string[];
  size?: 'sm' | 'md';
}

export const LanguageDisplay = ({ languages, size = 'sm' }: LanguageDisplayProps) => {
  if (!languages || languages.length === 0) return null;
  
  const displayLanguages = languages
    .map(code => LANGUAGES.find(l => l.code === code)?.name || code)
    .slice(0, 3);
  
  const remaining = languages.length - 3;
  
  return (
    <div className="flex items-center gap-1.5">
      <Globe className={cn("text-muted-foreground", size === 'sm' ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <div className="flex flex-wrap gap-1">
        {displayLanguages.map((lang, i) => (
          <Badge 
            key={i} 
            variant="secondary" 
            className={cn(
              "font-normal",
              size === 'sm' ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
            )}
          >
            {lang}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge 
            variant="secondary" 
            className={cn(
              "font-normal",
              size === 'sm' ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
            )}
          >
            +{remaining}
          </Badge>
        )}
      </div>
    </div>
  );
};