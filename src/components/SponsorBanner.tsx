import taskadeBanner from '@/assets/sponsors/taskade-banner.png';

interface SponsorBannerProps {
  className?: string;
}

export const SponsorBanner = ({ className }: SponsorBannerProps) => {
  // Temporarily disabled until Taskade confirms go-live
  const isEnabled = false;
  
  if (!isEnabled) return null;
  
  return (
    <div className={`w-full flex flex-col items-center py-6 ${className || ''}`}>
      <a 
        href="https://www.taskade.com/create?ref=launch" 
        target="_blank" 
        rel="noopener noreferrer sponsored"
        className="block w-full relative group"
      >
        <img 
          src={taskadeBanner} 
          alt="Taskade - AI Powered Project Management" 
          className="w-full h-auto transition-all duration-200 group-hover:opacity-95"
        />
      </a>
      <span className="text-[10px] text-muted-foreground opacity-60 mt-2">
        Featured Partner
      </span>
    </div>
  );
};
