import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Newsletter } from "@/components/Newsletter";
import { BookmarkPrompt } from "@/components/BookmarkPrompt";
import Home from "./pages/Home";

// Lazy-load every other route — keeps initial bundle small.
const Products = lazy(() => import("./pages/Products"));
const Submit = lazy(() => import("./pages/Submit"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Auth = lazy(() => import("./pages/Auth"));
const LaunchDetail = lazy(() => import("./pages/LaunchDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AchievementShare = lazy(() => import("./pages/AchievementShare"));
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
const Advertising = lazy(() => import("./pages/Advertising"));
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
const Traffic = lazy(() => import("./pages/Traffic"));
const ToolDetail = lazy(() => import("./pages/ToolDetail"));
const SeoCollection = lazy(() => import("./pages/SeoCollection"));
const BestPage = lazy(() => import("./pages/seo/BestPage"));
const VsPage = lazy(() => import("./pages/seo/VsPage"));
const AlternativesPage = lazy(() => import("./pages/seo/AlternativesPage"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetail"));
const PublicCollection = lazy(() => import("./pages/PublicCollection"));
const CollectionsDirectory = lazy(() => import("./pages/CollectionsDirectory"));
const Reserve = lazy(() => import("./pages/Reserve"));
const VibeCodeYourFuture = lazy(() => import("./pages/VibeCodeYourFuture"));
const Search = lazy(() => import("./pages/Search"));
const ClaimVerify = lazy(() => import("./pages/ClaimVerify"));
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
  const standalonePages = ['/reserve', '/vibecodeyourfuture'];
  const isStandalone = standalonePages.includes(location.pathname);
  const showNewsletter = !staticPages.includes(location.pathname) && !isStandalone;

  const path = location.pathname;
  const isCollectionsList = path === '/collections' || path === '/my-collections' || path === '/search';
  const isCollectionDetail = /^\/(c|collections|my-collections)\/[^/]+$/.test(path);
  const isPricing = path === '/pricing' || path === '/pass';
  const isAdvertise = path === '/advertise';
  const isArticle = ['/about', '/terms', '/privacy', '/contact', '/media-kit', '/faq'].includes(path)
    || path.startsWith('/blog/');
  const isListPage = [
    '/products', '/forums', '/newsletter', '/tags', '/categories', '/tech',
    '/vibecoders', '/makers', '/awards', '/success-stories', '/compare',
    '/vibe-coding', '/tools', '/traffic', '/notifications', '/blog',
  ].includes(path) || path.startsWith('/launches');
  const isStart = path === '/start';

  return (
    <div className="flex flex-col min-h-screen">
      {!isStandalone && <Header />}
      <main className="flex-1">
        <Suspense fallback={
          location.pathname === '/reserve' ? (
            <div className="min-h-screen bg-background flex items-center justify-center" aria-label="Loading" role="status">
              <div className="h-8 w-8 rounded-full border-2 border-muted border-t-foreground animate-spin opacity-60" />
              <span className="sr-only">Loading</span>
            </div>
          ) : isCollectionsList ? (
            <div className="container mx-auto px-4 max-w-7xl py-8" aria-label="Loading" role="status">
              <div className="mb-8 flex flex-col items-center gap-3">
                <div className="h-10 w-64 rounded-md bg-muted/60 animate-pulse" />
                <div className="h-4 w-80 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex flex-col rounded-xl overflow-hidden border bg-card">
                    <div className="aspect-[3/1.6] w-full bg-muted/50 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 w-2/3 rounded bg-muted/60 animate-pulse" />
                      <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                      <div className="h-4 w-4/5 rounded bg-muted/50 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : isCollectionDetail ? (
            <div className="container mx-auto px-4 max-w-7xl py-8" aria-label="Loading" role="status">
              <div className="mb-6 rounded-xl border bg-card overflow-hidden">
                <div className="aspect-[3/1] w-full bg-muted/50 animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-8 w-1/2 rounded bg-muted/60 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted/50 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-32 rounded bg-muted/60 animate-pulse" />
                        <div className="h-4 w-24 rounded bg-muted/50 animate-pulse" />
                      </div>
                    </div>
                    <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                  </div>
                ))}
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : isPricing ? (
            <div className="container mx-auto px-4 max-w-7xl py-12" aria-label="Loading" role="status">
              <div className="mb-10 flex flex-col items-center gap-3">
                <div className="h-10 w-72 rounded-md bg-muted/60 animate-pulse" />
                <div className="h-4 w-96 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="h-6 w-24 rounded bg-muted/60 animate-pulse" />
                    <div className="h-10 w-32 rounded bg-muted/60 animate-pulse" />
                    <div className="space-y-2 pt-2">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <div key={j} className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                    <div className="h-10 w-full rounded-md bg-muted/60 animate-pulse" />
                  </div>
                ))}
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : isAdvertise ? (
            <div className="container mx-auto px-4 max-w-7xl py-12" aria-label="Loading" role="status">
              <div className="mb-10 flex flex-col items-center gap-3">
                <div className="h-10 w-80 rounded-md bg-muted/60 animate-pulse" />
                <div className="h-4 w-2/3 max-w-lg rounded bg-muted/50 animate-pulse" />
                <div className="h-4 w-1/2 max-w-md rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
                    <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
                    <div className="h-8 w-24 rounded bg-muted/60 animate-pulse" />
                    <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                    <div className="h-4 w-4/5 rounded bg-muted/50 animate-pulse" />
                  </div>
                ))}
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : isArticle ? (
            <div className="container mx-auto px-4 max-w-3xl py-12" aria-label="Loading" role="status">
              <div className="space-y-4 mb-8">
                <div className="h-10 w-2/3 rounded-md bg-muted/60 animate-pulse" />
                <div className="h-4 w-1/3 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`h-4 ${i % 4 === 3 ? 'w-2/3' : 'w-full'} rounded bg-muted/50 animate-pulse`} />
                ))}
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : isListPage ? (
            <div className="container mx-auto px-4 max-w-7xl py-8" aria-label="Loading" role="status">
              <div className="mb-6 space-y-2">
                <div className="h-8 w-64 rounded-md bg-muted/60 animate-pulse" />
                <div className="h-4 w-80 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="space-y-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 px-2">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
                      <div className="h-3 w-64 rounded bg-muted/50 animate-pulse" />
                    </div>
                    <div className="h-9 w-10 rounded-md bg-muted/50 animate-pulse" />
                  </div>
                ))}
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : isStart ? (
            <div aria-label="Loading" role="status">
              <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 max-w-4xl flex flex-col items-center gap-6">
                  <div className="h-6 w-44 rounded-full bg-muted/60 animate-pulse" />
                  <div className="h-12 md:h-16 w-full max-w-3xl rounded-md bg-muted/60 animate-pulse" />
                  <div className="h-10 md:h-14 w-5/6 max-w-2xl rounded-md bg-muted/60 animate-pulse" />
                  <div className="h-4 w-2/3 max-w-xl rounded bg-muted/50 animate-pulse mt-2" />
                  <div className="h-4 w-1/2 max-w-md rounded bg-muted/50 animate-pulse" />
                  <div className="flex gap-3 mt-4">
                    <div className="h-11 w-40 rounded-md bg-muted/60 animate-pulse" />
                    <div className="h-11 w-40 rounded-md bg-muted/50 animate-pulse" />
                  </div>
                </div>
              </section>
              <div className="container mx-auto px-4 max-w-7xl pb-12">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_220px] gap-12 justify-center">
                  <div className="min-w-0 max-w-3xl mx-auto w-full space-y-12">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="space-y-4">
                        <div className="h-4 w-24 rounded bg-muted/60 animate-pulse" />
                        <div className="h-8 w-2/3 rounded-md bg-muted/60 animate-pulse" />
                        <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                        <div className="grid sm:grid-cols-3 gap-4 pt-2">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="h-32 rounded-lg bg-muted/40 animate-pulse" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    <div className="h-4 w-24 rounded bg-muted/60 animate-pulse mb-4" />
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-3 w-32 rounded bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : isStandalone ? (
            <div className="min-h-screen bg-background py-16" aria-label="Loading" role="status">
              <div className="container mx-auto px-4 max-w-3xl">
                <div className="border border-border rounded-lg p-8 md:p-12 bg-card space-y-6">
                  <div className="h-10 w-2/3 mx-auto rounded-md bg-muted/60 animate-pulse" />
                  <div className="h-4 w-1/2 mx-auto rounded bg-muted/50 animate-pulse" />
                  <div className="space-y-3 pt-6">
                    <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                    <div className="h-4 w-11/12 rounded bg-muted/50 animate-pulse" />
                    <div className="h-4 w-10/12 rounded bg-muted/50 animate-pulse" />
                    <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                    <div className="h-4 w-9/12 rounded bg-muted/50 animate-pulse" />
                  </div>
                  <div className="pt-8 space-y-3">
                    <div className="h-32 w-32 rounded bg-muted/50 animate-pulse" />
                    <div className="h-4 w-40 rounded bg-muted/50 animate-pulse" />
                    <div className="h-4 w-32 rounded bg-muted/50 animate-pulse" />
                  </div>
                </div>
              </div>
              <span className="sr-only">Loading</span>
            </div>
          ) : (
            <div className="container mx-auto px-4 max-w-7xl py-8" aria-label="Loading" role="status">
              <div className="mb-6 space-y-2">
                <div className="h-8 w-64 rounded-md bg-muted/60 animate-pulse" />
                <div className="h-4 w-80 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="space-y-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 px-2">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
                      <div className="h-3 w-64 rounded bg-muted/50 animate-pulse" />
                    </div>
                    <div className="h-9 w-10 rounded-md bg-muted/50 animate-pulse" />
                  </div>
                ))}
              </div>
              <span className="sr-only">Loading</span>
            </div>
          )
        }>


          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/start" element={<Start />} />
            <Route path="/products" element={<Products />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/claim/verify" element={<ClaimVerify />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/launch/:slug" element={<LaunchDetail />} />
            <Route path="/launch/:slug/analytics" element={<ProductAnalytics />} />
            <Route path="/go/:slug" element={<GoRedirect />} />
            <Route path="/achievement/:id" element={<AchievementShare />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-products" element={<MyProducts />} />
            <Route path="/launch/:productId/edit" element={<EditLaunch />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/advertise" element={<Advertise />} />
            <Route path="/advertising" element={<Advertising />} />
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
            <Route path="/collections/:slug" element={<PublicCollection />} />
            <Route path="/pass" element={<Pass />} />
            <Route path="/pass/graphic" element={<PassGraphic />} />
            <Route path="/product-hunt-alternative" element={<ProductHuntAlternative />} />
            <Route path="/product-launch-platform" element={<ProductLaunchPlatform />} />
            <Route path="/product-launch-strategy" element={<ProductLaunchStrategy />} />
            <Route path="/media-kit" element={<MediaKit />} />
            <Route path="/tech/:slug" element={<StackPage />} />
            <Route path="/tech" element={<TechLeaderboard />} />
            <Route path="/vibecoders" element={<Leaderboard />} />
            <Route path="/makers" element={<Navigate to="/vibecoders" replace />} />
            <Route path="/success-stories" element={<SuccessStories />} />
            <Route path="/awards" element={<Awards />} />
            <Route path="/compare" element={<CompareHub />} />
            <Route path="/compare/:slug" element={<ComparePage />} />
            <Route path="/vibe-coding" element={<VibeCodingHub />} />
            <Route path="/vibe-coding/:slug" element={<VibeCodingPlatform />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/traffic" element={<Traffic />} />
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
            <Route path="/collections" element={<CollectionsDirectory />} />
            <Route path="/reserve" element={<Reserve />} />
            <Route path="/vibecodeyourfuture" element={<VibeCodeYourFuture />} />
            <Route path="/search" element={<Search />} />
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
      {!isStandalone && <Footer />}
      <BookmarkPrompt />
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
