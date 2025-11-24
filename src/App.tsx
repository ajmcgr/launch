import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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

const queryClient = new QueryClient();

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
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/newsletter" element={<Blog />} />
          <Route path="/admin" element={<Admin />} />
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
