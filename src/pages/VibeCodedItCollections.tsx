import { Helmet } from 'react-helmet-async';
import CampaignHeader from '@/components/campaign/CampaignHeader';
import CampaignSideNav from '@/components/campaign/CampaignSideNav';
import CollectionsPreview from '@/components/CollectionsPreview';
import { isCampaignHost, CAMPAIGN_ORIGIN } from '@/lib/campaignHost';

const VibeCodedItCollections = () => {
  const pageUrl = isCampaignHost()
    ? `${CAMPAIGN_ORIGIN}/collections`
    : 'https://trylaunch.ai/vibecodedit/collections';

  return (
    <>
      <Helmet>
        <title>Collections — Vibe Coded It</title>
        <meta
          name="description"
          content="Browse curated collections of vibe coded apps and startups, hand-picked by the Launch community."
        />
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <CampaignHeader />
      <CampaignSideNav />

      <main className="lg:pl-16">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <h1 className="font-reckless text-3xl sm:text-4xl">Collections</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Curated sets of vibe coded apps from the Launch community.
          </p>

          <div className="mt-8">
            <CollectionsPreview limit={60} />
          </div>
        </div>
      </main>
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
};

export default VibeCodedItCollections;
