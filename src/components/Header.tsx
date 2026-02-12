import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { User, Settings, Package, LogOut, Menu } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import logo from '@/assets/logo.png';
import logoDark from '@/assets/logo-dark.png';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';
import { useMemberCount } from '@/hooks/use-member-count';

export const Header = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { formattedMemberCount } = useMemberCount();
  
  // Check if we should show the Launch Pass promo (after Jan 26, 2026)
  const showLaunchPassPromo = new Date() >= new Date('2026-01-26T00:00:00');

  // Use ref to track scroll state without causing re-renders during scroll
  const scrolledRef = useRef(false);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldBeScrolled = scrollY > 50;
      
      // Only update state if value actually changed
      if (shouldBeScrolled !== scrolledRef.current) {
        scrolledRef.current = shouldBeScrolled;
        setIsScrolled(shouldBeScrolled);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmitClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Clear any existing submit form data to ensure fresh form
    localStorage.removeItem('submitFormData');
    localStorage.removeItem('submitMedia');
    localStorage.removeItem('submitStep');
    navigate('/submit');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Promotional Banner - smoothly hide when scrolled */}
      <div 
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isScrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
        }`}
        aria-hidden={isScrolled}
      >
        <Link 
          to={showLaunchPassPromo ? "/pass" : "/pricing"} 
          className="block py-2 hover:opacity-90 transition-opacity bg-muted dark:bg-[#333333] text-foreground"
          tabIndex={isScrolled ? -1 : 0}
        >
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-center text-sm font-medium">
              {showLaunchPassPromo 
                ? `Trusted by ${formattedMemberCount} makers → Get Launch Pass`
                : <>Save 20% on paid launches. Use code <span className="font-bold">LAUNCH20</span></>
              }
            </p>
          </div>
        </Link>
      </div>
      
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center">
              <img src={resolvedTheme === 'dark' ? logoDark : logo} alt="Launch" className="h-10 w-auto object-contain" />
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Launches
              </Link>
              <Link to="/products" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Products
              </Link>
              <Link to="/leaderboard" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Makers
              </Link>
              <a href="https://newsletter.trylaunch.ai/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Newsletter
              </a>
              <a href="https://forums.trylaunch.ai/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Forums
              </a>
              <Link to="/advertise" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Advertise
              </Link>
              <Link to="/pass" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Pass
              </Link>
            </nav>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-4 ml-2">

            {/* Desktop User Menu */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <ThemeToggle />
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage src={profile?.avatar_url} alt={profile?.username || 'User'} />
                        <AvatarFallback>
                          {profile?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                    <DropdownMenuItem asChild>
                      <Link to={`/@${profile?.username}`} className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-products" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        My Products
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={handleSubmitClick} className="ml-1">
                  Submit
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <ThemeToggle />
                <Link to="/auth" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                  Login
                </Link>
                <Button onClick={handleSubmitClick}>
                  Submit
                </Button>
              </div>
            )}

            {/* Mobile Theme Toggle */}
            <div className="md:hidden">
              <ThemeToggle />
            </div>

            {/* Mobile Hamburger Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link 
                    to="/" 
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Launches
                  </Link>
                  <Link 
                    to="/products" 
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Products
                  </Link>
                  <Link 
                    to="/leaderboard" 
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Makers
                  </Link>
                  <a 
                    href="https://newsletter.trylaunch.ai/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Newsletter
                  </a>
                  <a 
                    href="https://forums.trylaunch.ai/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Forums
                  </a>
                  <Link 
                    to="/advertise" 
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Advertise
                  </Link>
                  <Link 
                    to="/pass" 
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pass
                  </Link>
                  
                  {user ? (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar>
                            <AvatarImage src={profile?.avatar_url} alt={profile?.username || 'User'} />
                            <AvatarFallback>
                              {profile?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">@{profile?.username}</span>
                        </div>
                        <Link 
                          to={`/@${profile?.username}`}
                          className="flex items-center gap-2 text-lg font-medium text-nav-text hover:text-primary transition-colors mb-4"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <User className="h-5 w-5" />
                          Profile
                        </Link>
                        <Link 
                          to="/my-products"
                          className="flex items-center gap-2 text-lg font-medium text-nav-text hover:text-primary transition-colors mb-4"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Package className="h-5 w-5" />
                          My Products
                        </Link>
                        <Link 
                          to="/settings"
                          className="flex items-center gap-2 text-lg font-medium text-nav-text hover:text-primary transition-colors mb-4"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Settings className="h-5 w-5" />
                          Settings
                        </Link>
                      </div>
                      <Button 
                        onClick={(e) => {
                          handleSubmitClick(e);
                          setMobileMenuOpen(false);
                        }} 
                        className="w-full mb-2"
                      >
                        Submit
                      </Button>
                      <Button 
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/auth" 
                        className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Login
                      </Link>
                      <Button 
                        onClick={(e) => {
                          handleSubmitClick(e);
                          setMobileMenuOpen(false);
                        }} 
                        className="w-full"
                      >
                        Submit
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
