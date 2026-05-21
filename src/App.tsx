import { useEffect, lazy, Suspense } from "react";
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

// Lazy-load every other route — keeps initial bundle small.
const Products = lazy(() => import("./pages/Products"));
const Submit = lazy(() => import("./pages/Submit"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Auth = lazy(() => import("./pages/Auth"));
const LaunchDetail = lazy(() => import("./pages/LaunchDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const MyProducts = lazy(() => import("./pages/MyProducts"));
const EditLaunch = lazy(() => import("./pages/EditLaunch"));
const About = lazy(() => import("./pages/About"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NewsletterRedirect = lazy(() => import("./pages/NewsletterRedirect"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const Outreach = lazy(() => import("./pages/admin/Outreach"));
const Followers = lazy(() => import("./pages/Followers"));
const Following = lazy(() => import("./pages/Following"));
const Notifications = lazy(() => import("./pages/Notifications"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Advertise = lazy(() => import("./pages/Advertise"));
const TagPage = lazy(() => import("./pages/TagPage"));
const Tags = lazy(() => import("./pages/Tags"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const Categories = lazy(() => import("./pages/Categories"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const Pass = lazy(() => import("./pages/Pass"));
const PassGraphic = lazy(() => import("./pages/PassGraphic"));
const ProductHuntAlternative = lazy(() => import("./pages/ProductHuntAlternative"));
const ProductLaunchPlatform = lazy(() => import("./pages/ProductLaunchPlatform"));
const ProductLaunchStrategy = lazy(() => import("./pages/ProductLaunchStrategy"));
const LaunchArchive = lazy(() => import("./pages/LaunchArchive"));
const LaunchArchivePeriod = lazy(() => import("./pages/LaunchArchivePeriod"));
const LaunchArchiveYearly = lazy(() => import("./pages/LaunchArchiveYearly"));
const StackPage = lazy(() => import("./pages/StackPage"));
const TechLeaderboard = lazy(() => import("./pages/TechLeaderboard"));
const ProductAnalytics = lazy(() => import("./pages/ProductAnalytics"));
const GoRedirect = lazy(() => import("./pages/GoRedirect"));
const SuccessStories = lazy(() => import("./pages/SuccessStories"));
const Awards = lazy(() => import("./pages/Awards"));
const CompareHub = lazy(() => import("./pages/CompareHub"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const DiscourseSso = lazy(() => import("./pages/DiscourseSso"));
const MediaKit = lazy(() => import("./pages/MediaKit"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Start = lazy(() => import("./pages/Start"));
const VibeCodingPlatform = lazy(() => import("./pages/VibeCodingPlatform"));
const VibeCodingHub = lazy(() => import("./pages/VibeCodingHub"));
const Tools = lazy(() => import("./pages/Tools"));
const ToolDetail = lazy(() => import("./pages/ToolDetail"));
const SeoCollection = lazy(() => import("./pages/SeoCollection"));
const BestPage = lazy(() => import("./pages/seo/BestPage"));
const VsPage = lazy(() => import("./pages/seo/VsPage"));
const AlternativesPage = lazy(() => import("./pages/seo/AlternativesPage"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetail"));
const PublicCollection = lazy(() => import("./pages/PublicCollection"));
import { SEO_COLLECTION_SLUGS } from "@/lib/seoCollections";

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
        <Suspense fallback={
          <div className="min-h-[60vh] py-12" aria-label="Loading" role="status">
            <div className="container mx-auto px-4 max-w-7xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-8 w-2/3 rounded-md bg-muted/60 animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                  <div className="h-4 w-5/6 rounded bg-muted/50 animate-pulse" />
                  <div className="aspect-video w-full rounded-xl bg-muted/40 animate-pulse" />
                </div>
                <div className="space-y-4">
                  <div className="h-12 w-full rounded-lg bg-muted/50 animate-pulse" />
                  <div className="h-12 w-full rounded-lg bg-muted/50 animate-pulse" />
                  <div className="h-32 w-full rounded-xl bg-muted/40 animate-pulse" />
                </div>
              </div>
            </div>
            <span className="sr-only">Loading</span>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/start" element={<Start />} />
            <Route path="/products" element={<Products />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/launch/:slug" element={<LaunchDetail />} />
            <Route path="/launch/:slug/analytics" element={<ProductAnalytics />} />
            <Route path="/go/:slug" element={<GoRedirect />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-products" element={<MyProducts />} />
            <Route path="/launch/:productId/edit" element={<EditLaunch />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/advertise" element={<Advertise />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/newsletter" element={<NewsletterRedirect />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/outreach" element={<Outreach />} />
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
            <Route path="/tech/:slug" element={<StackPage />} />
            <Route path="/tech" element={<TechLeaderboard />} />
            <Route path="/makers" element={<Leaderboard />} />
            <Route path="/success-stories" element={<SuccessStories />} />
            <Route path="/awards" element={<Awards />} />
            <Route path="/compare" element={<CompareHub />} />
            <Route path="/compare/:slug" element={<ComparePage />} />
            <Route path="/vibe-coding" element={<VibeCodingHub />} />
            <Route path="/vibe-coding/:slug" element={<VibeCodingPlatform />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/:slug" element={<ToolDetail />} />
            <Route path="/launches/today" element={<LaunchArchive />} />
            <Route path="/launches/:year/:period" element={<LaunchArchivePeriod />} />
            <Route path="/launches/:param" element={<LaunchArchive />} />
            <Route path="/:username/followers" element={<Followers />} />
            <Route path="/:username/following" element={<Following />} />
            <Route path="/:username" element={<UserProfile />} />
            {/* Programmatic SEO landing pages */}
            {SEO_COLLECTION_SLUGS.map((slug) => (
              <Route key={slug} path={`/${slug}`} element={<SeoCollection />} />
            ))}
            {/* High-intent SEO templates */}
            <Route path="/best/:slug" element={<BestPage />} />
            <Route path="/vs/:slug" element={<VsPage />} />
            <Route path="/alternatives/:slug" element={<AlternativesPage />} />
            <Route path="/my-collections" element={<Collections />} />
            <Route path="/my-collections/:slug" element={<CollectionDetailPage />} />
            <Route path="/c/:slug" element={<PublicCollection />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
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
