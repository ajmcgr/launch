import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Newsletter } from "@/components/Newsletter";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Submit from "./pages/Submit";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import LaunchDetail from "./pages/LaunchDetail";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";
import MyProducts from "./pages/MyProducts";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Blog from "./pages/Blog";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Followers from "./pages/Followers";
import Following from "./pages/Following";
import Notifications from "./pages/Notifications";
import FAQ from "./pages/FAQ";
import Advertise from "./pages/Advertise";
import TagPage from "./pages/TagPage";
import Tags from "./pages/Tags";
import CategoryPage from "./pages/CategoryPage";
import Categories from "./pages/Categories";
import CollectionPage from "./pages/CollectionPage";
import Pass from "./pages/Pass";
import PassGraphic from "./pages/PassGraphic";
import ProductHuntAlternative from "./pages/ProductHuntAlternative";
import ProductLaunchPlatform from "./pages/ProductLaunchPlatform";
import ProductLaunchStrategy from "./pages/ProductLaunchStrategy";
import LaunchArchive from "./pages/LaunchArchive";
import LaunchArchiveWeekly from "./pages/LaunchArchiveWeekly";

import DiscourseSso from "./pages/DiscourseSso";
import MediaKit from "./pages/MediaKit";

const queryClient = new QueryClient();

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppContent = () => {
  const location = useLocation();
  const staticPages = ['/about', '/terms', '/privacy'];
  const showNewsletter = !staticPages.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/launch/:slug" element={<LaunchDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/my-products" element={<MyProducts />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/advertise" element={<Advertise />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/newsletter" element={<Blog />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/discourse-sso" element={<DiscourseSso />} />
          <Route path="/api/discourse-sso" element={<DiscourseSso />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/collections/:slug" element={<CollectionPage />} />
          <Route path="/pass" element={<Pass />} />
          <Route path="/pass/graphic" element={<PassGraphic />} />
          <Route path="/product-hunt-alternative" element={<ProductHuntAlternative />} />
          <Route path="/product-launch-platform" element={<ProductLaunchPlatform />} />
          <Route path="/product-launch-strategy" element={<ProductLaunchStrategy />} />
          <Route path="/media-kit" element={<MediaKit />} />
          <Route path="/launches/today" element={<LaunchArchive />} />
          <Route path="/launches/:date" element={<LaunchArchive />} />
          <Route path="/launches/:year/w:week" element={<LaunchArchiveWeekly />} />
          <Route path="/:username/followers" element={<Followers />} />
          <Route path="/:username/following" element={<Following />} />
          <Route path="/:username" element={<UserProfile />} />
          <Route path="/:username" element={<UserProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {showNewsletter && (
        <div className="container mx-auto px-4 py-12">
          <Newsletter />
        </div>
      )}
      <Footer />
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
