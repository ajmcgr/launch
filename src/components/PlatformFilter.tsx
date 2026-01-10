import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Smartphone, ChevronDown } from 'lucide-react';
import { Platform, PLATFORMS } from '@/components/PlatformIcons';

interface PlatformFilterProps {
  selectedPlatforms: Platform[];
  onPlatformToggle: (platform: Platform) => void;
}

export const PlatformFilter = ({ selectedPlatforms, onPlatformToggle }: PlatformFilterProps) => {
  const getButtonLabel = () => {
    if (selectedPlatforms.length === 0) return 'All Platforms';
    if (selectedPlatforms.length === 1) {
      return PLATFORMS.find(p => p.id === selectedPlatforms[0])?.label || 'Platform';
    }
    return `${selectedPlatforms.length} Platforms`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Smartphone className="h-4 w-4" />
          <span className="hidden sm:inline">{getButtonLabel()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {PLATFORMS.map((platform) => (
          <DropdownMenuCheckboxItem
            key={platform.id}
            checked={selectedPlatforms.includes(platform.id)}
            onCheckedChange={() => onPlatformToggle(platform.id)}
          >
            {platform.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
