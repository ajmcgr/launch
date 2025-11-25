import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">
          Everything you need to know about Launch
        </p>

        <Accordion type="multiple" defaultValue={["what-is-trylaunch", "how-to-submit", "voting-system", "top-products", "archives", "categories", "notifications", "following", "comments", "badge", "pricing", "scheduled-launches", "profile", "winners", "search", "support"]} className="w-full space-y-4">
          <AccordionItem value="what-is-trylaunch" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What is Launch?
            </AccordionTrigger>
            <AccordionContent>
              Launch is a platform for launching and discovering new AI products. Makers can submit their products, get feedback from the community, and compete for daily, weekly, monthly, and yearly rankings. Users can discover innovative AI tools, vote for their favorites, and stay updated with the latest launches.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="how-to-submit" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do I submit my product?
            </AccordionTrigger>
            <AccordionContent>
              To submit your product:
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Create an account and log in</li>
                <li>Click "Submit" in the navigation menu</li>
                <li>Fill out your product details including name, tagline, description, and media</li>
                <li>Select relevant categories</li>
                <li>Choose your launch date (you can schedule launches in advance)</li>
                <li>Submit for review</li>
              </ol>
              <p className="mt-2">
                Your product will be reviewed and launched on your scheduled date.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="voting-system" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How does the voting system work?
            </AccordionTrigger>
            <AccordionContent>
              Users can upvote products they find interesting or valuable. Each product displays its net vote count (upvotes minus downvotes). Products are ranked based on their votes within specific time periods. You must be logged in to vote. You can change your vote at any time or remove it completely.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="top-products" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What are "Top Products"?
            </AccordionTrigger>
            <AccordionContent>
              Top Products are rankings of the most popular products across different time periods:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li><strong>Today:</strong> Top 100 products launched today</li>
                <li><strong>This Week:</strong> Top 100 products from the past 7 days</li>
                <li><strong>This Month:</strong> Top 100 products from the past 30 days</li>
                <li><strong>This Year:</strong> Top 100 products launched this year</li>
              </ul>
              <p className="mt-2">
                Rankings are determined by net votes and update in real-time.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="archives" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What are Archives?
            </AccordionTrigger>
            <AccordionContent>
              At the end of each year, we automatically archive the top 100 products for each time period (Today, Week, Month, Year). These archives preserve historical rankings and allow you to explore past winners. You can access archives from the Products page sidebar under "Archived" where you'll find previous years listed.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="categories" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do categories work?
            </AccordionTrigger>
            <AccordionContent>
              Products can be tagged with multiple categories to help users discover relevant tools. You can filter products by category on the Products page by selecting one or more categories from the sidebar. This helps you find specific types of AI tools like productivity apps, design tools, developer tools, and more.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notifications" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do notifications work?
            </AccordionTrigger>
            <AccordionContent>
              You'll receive notifications for various activities:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>When someone votes on your product</li>
                <li>When someone comments on your product</li>
                <li>When someone you follow launches a new product</li>
                <li>When someone follows you</li>
              </ul>
              <p className="mt-2">
                You can customize notification preferences in your Settings. Notifications appear in the bell icon in the header, and you can view all notifications on the dedicated Notifications page.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="following" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              Can I follow other users and products?
            </AccordionTrigger>
            <AccordionContent>
              Yes! You can follow both users and products:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li><strong>Follow Users:</strong> Visit their profile and click the "Follow" button to get notified of their new launches</li>
                <li><strong>Follow Products:</strong> Click the follow button on any product to stay updated</li>
              </ul>
              <p className="mt-2">
                View your followers and who you're following from your profile page.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="comments" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do comments work?
            </AccordionTrigger>
            <AccordionContent>
              Users can leave comments on product launch pages to provide feedback, ask questions, or share their thoughts. To comment, you must be logged in. You can edit or delete your own comments. Product owners receive notifications when someone comments on their products.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="badge" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What is the product badge?
            </AccordionTrigger>
            <AccordionContent>
              The product badge is an embeddable widget you can add to your product's website to showcase your Launch ranking and votes. After your product is launched, you'll receive HTML code that you can paste into your website. The badge displays real-time vote counts and links back to your product page on Launch.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pricing" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What are the pricing plans?
            </AccordionTrigger>
            <AccordionContent>
              Launch offers different plans for makers who want to maximize their product's visibility:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li><strong>Free:</strong> Submit products and compete in rankings</li>
                <li><strong>Premium Plans:</strong> Access additional features like priority support, advanced analytics, and promotional opportunities</li>
              </ul>
              <p className="mt-2">
                Visit the Pricing page for detailed plan information and pricing.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="scheduled-launches" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              Can I schedule my product launch?
            </AccordionTrigger>
            <AccordionContent>
              Yes! When submitting your product, you can choose a specific launch date in the future. Your product will automatically go live on that date. This allows you to plan your launch strategy and coordinate with other marketing activities. You can manage your scheduled launches from the My Products page.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="profile" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do I customize my profile?
            </AccordionTrigger>
            <AccordionContent>
              Go to Settings to customize your profile:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Upload a profile photo</li>
                <li>Add your bio and description</li>
                <li>Link your social media accounts (Twitter, LinkedIn, etc.)</li>
                <li>Add your website URL</li>
                <li>Set notification preferences</li>
              </ul>
              <p className="mt-2">
                Your profile is public and showcases all your launched products.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="winners" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How are daily, weekly, and monthly winners determined?
            </AccordionTrigger>
            <AccordionContent>
              Winners are automatically determined based on the highest net votes within each time period. The system runs daily to identify and mark winning products. Winners may receive special badges and recognition on the platform. These achievements are permanently recorded and visible on product pages.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="search" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do I search for products?
            </AccordionTrigger>
            <AccordionContent>
              Use the search bar on the Products page to find specific products by name or tagline. You can also filter by categories and time periods to narrow down results. The search works in real-time as you type, and you can combine it with category filters for more precise results.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="support" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do I get support?
            </AccordionTrigger>
            <AccordionContent>
              For support, you can:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Email us at alex@trylaunch.ai</li>
                <li>Join our Discord community for community support</li>
                <li>Follow us on X (Twitter) @trylaunchai for updates</li>
              </ul>
              <p className="mt-2">
                We typically respond within 24 hours during business days.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default FAQ;