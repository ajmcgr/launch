import { Globe, Smartphone } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Apple icon as SVG since lucide doesn't have it
const AppleIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

// Android icon as SVG
const AndroidIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.523 2.418a.745.745 0 0 0-1.018.282l-1.097 1.9a7.672 7.672 0 0 0-6.816 0l-1.097-1.9a.745.745 0 1 0-1.3.736l1.052 1.82A7.665 7.665 0 0 0 4.005 12v.5h15.99V12a7.665 7.665 0 0 0-3.242-6.244l1.052-1.82a.745.745 0 0 0-.282-1.018zM8.5 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM4.005 13.5v6A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.495-2.5v-6H4.005z"/>
  </svg>
);

export type Platform = 'web' | 'ios' | 'android';

interface PlatformIconsProps {
  platforms?: Platform[];
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

const platformConfig: Record<Platform, { icon: React.ReactNode; label: string; color: string }> = {
  web: {
    icon: <Globe />,
    label: 'Web App',
    color: 'text-muted-foreground',
  },
  ios: {
    icon: <AppleIcon />,
    label: 'iOS App',
    color: 'text-muted-foreground',
  },
  android: {
    icon: <AndroidIcon />,
    label: 'Android App',
    color: 'text-muted-foreground',
  },
};

export const PlatformIcons = ({ platforms = [], size = 'sm', showTooltip = true }: PlatformIconsProps) => {
  if (!platforms || platforms.length === 0) return null;

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (!showTooltip) {
    return (
      <div className="flex items-center gap-0.5">
        {platforms.map((platform) => {
          const config = platformConfig[platform];
          if (!config) return null;
          return (
            <span key={platform} className={`${config.color} ${iconSize}`}>
              {platform === 'web' && <Globe className={iconSize} />}
              {platform === 'ios' && <AppleIcon className={iconSize} />}
              {platform === 'android' && <AndroidIcon className={iconSize} />}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5">
        {platforms.map((platform) => {
          const config = platformConfig[platform];
          if (!config) return null;
          return (
            <Tooltip key={platform}>
              <TooltipTrigger asChild>
                <span className={`${config.color} ${iconSize} cursor-help`}>
                  {platform === 'web' && <Globe className={iconSize} />}
                  {platform === 'ios' && <AppleIcon className={iconSize} />}
                  {platform === 'android' && <AndroidIcon className={iconSize} />}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {config.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'web', label: 'Web' },
  { id: 'ios', label: 'iOS' },
  { id: 'android', label: 'Android' },
];