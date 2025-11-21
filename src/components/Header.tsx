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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { User, Settings, Package, LogOut, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import logo from '@/assets/logo.png';

export const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Launch" className="h-10" />
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Launches
              </Link>
              <Link to="/products" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Products
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                Pricing
              </Link>
              {!user && (
                <Link to="/auth" className="text-sm font-medium text-nav-text hover:text-primary transition-colors">
                  Login
                </Link>
              )}
            </nav>

            {/* Desktop User Menu */}
            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <Button onClick={handleSubmitClick}>
                  Submit
                </Button>
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
                      <Link to="/me/products" className="flex items-center gap-2">
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
              </div>
            ) : (
              <Button onClick={handleSubmitClick} className="hidden md:flex">
                Submit
              </Button>
            )}

            {/* Mobile Hamburger Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
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
                    to="/pricing" 
                    className="text-lg font-medium text-nav-text hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
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
                          to="/me/products"
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
