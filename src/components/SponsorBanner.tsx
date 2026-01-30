import taskadeBanner from '@/assets/sponsors/taskade-banner.png';

interface SponsorBannerProps {
  className?: string;
}

export const SponsorBanner = ({ className }: SponsorBannerProps) => {
  // Temporarily disabled until Taskade confirms go-live
  const isEnabled = false;
  
  if (!isEnabled) return null;
  
  return (
    <div className={`w-full flex justify-center py-3 ${className || ''}`}>
      <a 
        href="https://www.taskade.com/create?ref=launch" 
        target="_blank" 
        rel="noopener noreferrer sponsored"
        className="block relative group"
      >
        <img 
          src={taskadeBanner} 
          alt="Taskade - AI Powered Project Management" 
          className="max-w-full h-auto rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:opacity-95"
          style={{ maxHeight: '91px' }}
        />
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-60">
          Sponsored
        </span>
      </a>
    </div>
  );
};
