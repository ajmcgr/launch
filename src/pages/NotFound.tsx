import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Coffee } from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo.png";
import { useTheme } from "next-themes";

const NotFound = () => {
  const location = useLocation();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const logo = resolvedTheme === "dark" ? logoDark : logoLight;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-6 max-w-md">
        <img 
          src={logo} 
          alt="Launch" 
          className="h-12 mx-auto mb-8"
        />
        <div className="flex items-center justify-center gap-3 mb-6">
          <Coffee className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-4 text-2xl font-semibold text-foreground">
          Sorry, Launch appears to be temporarily down!
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Make yourself a coffee and check back later ☕
        </p>
        <a 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
