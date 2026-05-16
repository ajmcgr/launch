export type ToolField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type ToolOutput = { title: string; body: string };

export type FreeTool = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  fields: ToolField[];
  generate: (values: Record<string, string>) => ToolOutput[];
  staticOutput?: ToolOutput[];
};

const v = (values: Record<string, string>, key: string, fallback = '') =>
  (values[key] || fallback).trim();

export const freeTools: FreeTool[] = [
  {
    slug: 'tagline-generator',
    name: 'Tagline Generator',
    category: 'Copywriting',
    tagline: 'Generate 10 tagline variations for your product.',
    description:
      'Paste your product name and what it does. Get 10 tagline angles you can A/B test on your landing page, social, or launch listing.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', placeholder: 'Briefly', required: true },
      { name: 'what', label: 'What it does (one sentence)', type: 'textarea', placeholder: 'Summarises long YouTube videos into bullet notes.', required: true },
    ],
    generate: (vals) => {
      const p = v(vals, 'product', 'Your product');
      const w = v(vals, 'what', 'does something useful');
      const variants = [
        `${p} — ${w}`,
        `The fastest way to ${w.toLowerCase().replace(/\.$/, '')}.`,
        `${p}: ${w.toLowerCase().replace(/\.$/, '')}, in seconds.`,
        `Stop wasting time. ${p} ${w.toLowerCase().replace(/\.$/, '')}.`,
        `${w} Without the busywork.`,
        `${p} is how modern teams ${w.toLowerCase().replace(/\.$/, '')}.`,
        `${w} Powered by AI.`,
        `Built for makers who ${w.toLowerCase().replace(/\.$/, '')}.`,
        `${p} — the ${w.toLowerCase().replace(/\.$/, '')} tool you'll actually use.`,
        `Skip the manual work. ${p} handles ${w.toLowerCase().replace(/\.$/, '')}.`,
      ];
      return [{ title: '10 tagline variations', body: variants.join('\n') }];
    },
  },
  {
    slug: 'product-name-generator',
    name: 'Product Name Generator',
    category: 'Branding',
    tagline: 'Generate brandable product name ideas from keywords.',
    description: 'Enter 2-3 keywords. Get name combinations using common prefixes, suffixes, and patterns used by successful launches.',
    fields: [
      { name: 'keywords', label: 'Keywords (comma separated)', type: 'text', placeholder: 'fast, ship, build', required: true },
    ],
    generate: (vals) => {
      const kws = v(vals, 'keywords', 'launch').split(',').map((s) => s.trim()).filter(Boolean);
      const prefixes = ['Try', 'Get', 'Use', 'Hey', 'Go'];
      const suffixes = ['ly', 'ify', 'io', 'ai', 'hq', 'kit', 'lab', 'flow', 'base', 'stack'];
      const out: string[] = [];
      kws.forEach((k) => {
        const cap = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
        prefixes.forEach((pre) => out.push(`${pre}${cap}`));
        suffixes.forEach((suf) => out.push(`${cap}${suf}`));
        out.push(cap);
      });
      if (kws.length >= 2) {
        out.push(kws[0] + kws[1].charAt(0).toUpperCase() + kws[1].slice(1));
        out.push(kws[1] + kws[0].charAt(0).toUpperCase() + kws[0].slice(1));
      }
      return [{ title: 'Name ideas', body: Array.from(new Set(out)).slice(0, 30).join('\n') }];
    },
  },
  {
    slug: 'launch-tweet-writer',
    name: 'Launch Tweet Writer',
    category: 'Social',
    tagline: 'Draft a launch tweet that converts.',
    description: 'Fill in your product, link, and main benefit. Get a launch tweet ready to schedule.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'benefit', label: 'Main benefit', type: 'text', placeholder: 'turn screenshots into clean React code', required: true },
      { name: 'url', label: 'Product URL', type: 'text', placeholder: 'https://...', required: true },
    ],
    generate: (vals) => {
      const p = v(vals, 'product');
      const b = v(vals, 'benefit');
      const u = v(vals, 'url');
      return [
        {
          title: 'Launch tweet',
          body: `🚀 Launching ${p} today.\n\nIt helps you ${b}.\n\nNo waitlist. No fluff. Try it free:\n${u}\n\nReply with feedback — building in public 💬`,
        },
        {
          title: 'Alternate (story angle)',
          body: `I built ${p} because I was tired of ${b.includes('without') ? b : `doing ${b} the slow way`}.\n\nLaunching it today.\n\n${u}`,
        },
      ];
    },
  },
  {
    slug: 'launch-thread-generator',
    name: 'Launch Thread Generator',
    category: 'Social',
    tagline: 'Create a 5-tweet launch thread template.',
    description: 'Generate a structured 5-tweet launch thread covering hook, problem, solution, proof, and CTA.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'problem', label: 'Problem you solve', type: 'textarea', required: true },
      { name: 'url', label: 'Product URL', type: 'text', required: true },
    ],
    generate: (vals) => {
      const p = v(vals, 'product');
      const pr = v(vals, 'problem');
      const u = v(vals, 'url');
      return [
        {
          title: '5-tweet thread',
          body: `1/ Today I'm launching ${p} 🚀\n\nA quick thread on why I built it 🧵\n\n2/ The problem:\n${pr}\n\n3/ How ${p} fixes it:\n• [benefit 1]\n• [benefit 2]\n• [benefit 3]\n\n4/ What's inside:\n• [feature 1]\n• [feature 2]\n• [feature 3]\n\n5/ Try ${p} free today 👇\n${u}\n\nWould love your feedback — RTs appreciated 🙏`,
        },
      ];
    },
  },
  {
    slug: 'cold-dm-writer',
    name: 'Cold DM Writer',
    category: 'Outreach',
    tagline: 'Draft a non-spammy cold DM to a creator or founder.',
    description: 'Generate a personal, concise DM template you can adapt for X, LinkedIn, or email.',
    fields: [
      { name: 'recipient', label: 'Recipient first name', type: 'text', required: true },
      { name: 'compliment', label: 'Specific thing you like about their work', type: 'textarea', required: true },
      { name: 'ask', label: 'What you want from them', type: 'text', placeholder: 'feedback on my launch / a quick chat', required: true },
    ],
    generate: (vals) => [
      {
        title: 'Cold DM',
        body: `Hey ${v(vals, 'recipient')} 👋\n\n${v(vals, 'compliment')} — genuinely changed how I think about this stuff.\n\nQuick ask: ${v(vals, 'ask')}. Totally fine if it's a no.\n\nEither way, keep shipping 🙏`,
      },
    ],
  },
  {
    slug: 'show-hn-title-generator',
    name: 'Show HN Title Generator',
    category: 'Distribution',
    tagline: 'Generate Hacker News-friendly Show HN titles.',
    description: 'Paste your product name and a brief description. Get title variants in the Show HN: <name> – <description> format Hacker News expects.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'desc', label: 'One-line description', type: 'text', placeholder: 'open-source alternative to Google Analytics', required: true },
    ],
    generate: (vals) => {
      const p = v(vals, 'product');
      const d = v(vals, 'desc').replace(/\.$/, '');
      return [
        {
          title: 'Show HN titles',
          body: [
            `Show HN: ${p} – ${d}`,
            `Show HN: ${p} – a faster, simpler ${d.replace(/^an? /, '')}`,
            `Show HN: I built ${p}, ${d}`,
            `Show HN: ${p} (${d})`,
            `Show HN: ${p} – ${d}, built in public`,
          ].join('\n'),
        },
        {
          title: 'Tip',
          body: 'HN strips emojis and most punctuation. Keep titles factual, under 80 chars, no marketing fluff.',
        },
      ];
    },
  },
  {
    slug: 'reddit-post-drafter',
    name: 'Reddit Post Drafter',
    category: 'Distribution',
    tagline: 'Draft a Reddit launch post that won\'t get removed.',
    description: 'Generate a Reddit-friendly self-post with story, problem, and a soft link at the end.',
    fields: [
      { name: 'subreddit', label: 'Target subreddit (e.g. r/SideProject)', type: 'text', required: true },
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'story', label: 'Why you built it (1-2 sentences)', type: 'textarea', required: true },
      { name: 'url', label: 'Product URL', type: 'text', required: true },
    ],
    generate: (vals) => [
      {
        title: 'Reddit post',
        body: `**Title:** I built ${v(vals, 'product')} — would love feedback from ${v(vals, 'subreddit')}\n\n**Body:**\n\nHey everyone 👋\n\n${v(vals, 'story')}\n\nIt's called ${v(vals, 'product')}. Free to try.\n\nWhat I'm looking for:\n• Honest reactions to the landing page\n• Features you'd kill for\n• Anything that feels broken\n\nLink (mods, happy to remove if this breaks rules): ${v(vals, 'url')}\n\nThanks 🙏`,
      },
    ],
  },
  {
    slug: 'linkedin-launch-post',
    name: 'LinkedIn Launch Post',
    category: 'Social',
    tagline: 'A LinkedIn post for your launch that doesn\'t sound corporate.',
    description: 'Generate a LinkedIn post with a strong hook, story, and CTA — formatted for LinkedIn\'s feed.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'lesson', label: 'One lesson from building it', type: 'textarea', required: true },
      { name: 'url', label: 'Product URL', type: 'text', required: true },
    ],
    generate: (vals) => [
      {
        title: 'LinkedIn post',
        body: `I just launched ${v(vals, 'product')}.\n\nHere's the one thing I learned building it:\n\n${v(vals, 'lesson')}\n\nIf that resonates, I'd love your thoughts.\n\nLink in the first comment 👇\n\n(then comment: ${v(vals, 'url')})`,
      },
    ],
  },
  {
    slug: 'founder-bio-generator',
    name: 'Founder Bio Generator',
    category: 'Branding',
    tagline: 'Generate short, medium, and long founder bios.',
    description: 'For your X/LinkedIn/about page. Three lengths from the same inputs.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true },
      { name: 'role', label: 'Role / title', type: 'text', placeholder: 'Founder of Launch', required: true },
      { name: 'niche', label: 'What you build / who you help', type: 'text', placeholder: 'tools for indie makers', required: true },
    ],
    generate: (vals) => {
      const n = v(vals, 'name');
      const r = v(vals, 'role');
      const ni = v(vals, 'niche');
      return [
        { title: 'Short bio (X / Twitter)', body: `${r}. Building ${ni}. Shipping in public.` },
        { title: 'Medium bio (LinkedIn headline)', body: `${r} — building ${ni}. Previously: [add 1-2 credentials].` },
        {
          title: 'Long bio (About page)',
          body: `${n} is the ${r.toLowerCase()}, currently building ${ni}. They've been shipping software for [N] years, with a focus on [your focus]. When they're not coding, they're [hobby / interest]. Find them on X @[handle].`,
        },
      ];
    },
  },
  {
    slug: 'product-hunt-tagline',
    name: 'Product Hunt Tagline Builder',
    category: 'Copywriting',
    tagline: 'Craft a 60-character tagline that fits launch directory rules.',
    description: 'Most launch directories cap taglines at 60 characters. Get tight, punchy variants.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'what', label: 'What it does', type: 'text', placeholder: 'AI meeting notes for sales teams', required: true },
    ],
    generate: (vals) => {
      const w = v(vals, 'what');
      const trim = (s: string) => (s.length > 60 ? s.slice(0, 57) + '...' : s);
      return [
        {
          title: 'Tagline variants (≤60 chars)',
          body: [
            trim(`${w}.`),
            trim(`The fastest way to ${w.toLowerCase()}.`),
            trim(`${w} — without the busywork.`),
            trim(`AI-powered ${w.toLowerCase()}.`),
            trim(`${w}, in one click.`),
          ].join('\n'),
        },
      ];
    },
  },
  {
    slug: 'seo-title-optimizer',
    name: 'SEO Title Optimizer',
    category: 'SEO',
    tagline: 'Generate SEO title variants for a topic + brand.',
    description: 'Get 8 SEO-friendly title tags using proven patterns (year, list, comparison, how-to).',
    fields: [
      { name: 'topic', label: 'Page topic', type: 'text', placeholder: 'product hunt alternatives', required: true },
      { name: 'brand', label: 'Brand name', type: 'text', required: true },
    ],
    generate: (vals) => {
      const t = v(vals, 'topic');
      const b = v(vals, 'brand');
      const year = new Date().getFullYear();
      const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
      return [
        {
          title: 'SEO title variants',
          body: [
            `${cap(t)} (${year}) — ${b}`,
            `Best ${cap(t)} in ${year} | ${b}`,
            `${cap(t)}: The Complete Guide | ${b}`,
            `Top 10 ${cap(t)} (${year} Edition) — ${b}`,
            `How to Choose ${cap(t)} — ${b}`,
            `${cap(t)} vs Alternatives: Which Is Best in ${year}?`,
            `${b}: ${cap(t)} Made Simple`,
            `The Honest Guide to ${cap(t)} — ${b}`,
          ].join('\n'),
        },
        { title: 'Tip', body: 'Keep titles under 60 chars to avoid truncation in Google SERPs.' },
      ];
    },
  },
  {
    slug: 'meta-description-writer',
    name: 'Meta Description Writer',
    category: 'SEO',
    tagline: 'Get 3 meta descriptions under 155 characters.',
    description: 'Hand-tuned meta description variants you can drop straight into your <head>.',
    fields: [
      { name: 'product', label: 'Product / page name', type: 'text', required: true },
      { name: 'what', label: 'What it does / page topic', type: 'textarea', required: true },
    ],
    generate: (vals) => {
      const p = v(vals, 'product');
      const w = v(vals, 'what').replace(/\.$/, '');
      const trim = (s: string) => (s.length > 155 ? s.slice(0, 152) + '...' : s);
      return [
        {
          title: '3 meta description variants',
          body: [
            trim(`${p} helps you ${w.toLowerCase()}. Free to try. No signup required.`),
            trim(`Looking to ${w.toLowerCase()}? ${p} is the fastest, most reliable way. Get started free.`),
            trim(`${p} — ${w}. Built for makers, founders, and indie hackers. Try it free today.`),
          ].join('\n\n'),
        },
      ];
    },
  },
  {
    slug: 'landing-page-headline-generator',
    name: 'Landing Page Headline Generator',
    category: 'Copywriting',
    tagline: 'Above-the-fold headline ideas, ranked by angle.',
    description: 'Get 6 headline variants across angles: benefit, outcome, contrarian, social proof, urgency, and curiosity.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'audience', label: 'Target audience', type: 'text', placeholder: 'indie hackers', required: true },
      { name: 'outcome', label: 'Outcome you deliver', type: 'text', placeholder: 'ship a landing page in 10 minutes', required: true },
    ],
    generate: (vals) => {
      const p = v(vals, 'product');
      const a = v(vals, 'audience');
      const o = v(vals, 'outcome');
      return [
        {
          title: '6 headline angles',
          body: [
            `Benefit: ${p} — ${o}.`,
            `Outcome: ${o.charAt(0).toUpperCase() + o.slice(1)} with ${p}.`,
            `Contrarian: Everything you've been told about ${o.split(' ').slice(-2).join(' ')} is wrong.`,
            `Social proof: Trusted by 1,000+ ${a} to ${o}.`,
            `Urgency: Stop wasting weeks. ${p} helps you ${o} today.`,
            `Curiosity: The unfair way ${a} ${o}.`,
          ].join('\n\n'),
        },
      ];
    },
  },
  {
    slug: 'email-subject-line-tester',
    name: 'Email Subject Line Tester',
    category: 'Email',
    tagline: 'Generate 10 subject line variants for A/B testing.',
    description: 'Across patterns proven to drive opens: question, number, curiosity, personal, urgency.',
    fields: [
      { name: 'topic', label: 'Email topic', type: 'text', placeholder: 'our biggest launch ever', required: true },
      { name: 'brand', label: 'Brand / sender name', type: 'text', required: true },
    ],
    generate: (vals) => {
      const t = v(vals, 'topic');
      const b = v(vals, 'brand');
      return [
        {
          title: '10 subject lines',
          body: [
            `${t}`,
            `Quick: ${t}?`,
            `[${b}] ${t}`,
            `Re: ${t}`,
            `${t} (open inside)`,
            `3 things about ${t}`,
            `You + ${t}?`,
            `An honest take on ${t}`,
            `Don't open this if you hate ${t}`,
            `${t} — and what it means for you`,
          ].join('\n'),
        },
        { title: 'Tip', body: 'Lowercase, no emojis, and under 50 chars typically wins inbox attention.' },
      ];
    },
  },
  {
    slug: 'newsletter-pitch-template',
    name: 'Newsletter Pitch Template',
    category: 'Outreach',
    tagline: 'Pitch a newsletter to feature your product.',
    description: 'A non-spammy template to email newsletter operators about your launch.',
    fields: [
      { name: 'newsletter', label: 'Newsletter name', type: 'text', required: true },
      { name: 'writer', label: 'Writer first name', type: 'text', required: true },
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'angle', label: 'Why their readers will care', type: 'textarea', required: true },
      { name: 'url', label: 'Product URL', type: 'text', required: true },
    ],
    generate: (vals) => [
      {
        title: 'Newsletter pitch email',
        body: `Subject: ${v(vals, 'product')} for ${v(vals, 'newsletter')} readers?\n\nHi ${v(vals, 'writer')},\n\nLong-time reader — your piece on [reference a specific post] was excellent.\n\nQuick pitch: I just launched ${v(vals, 'product')} (${v(vals, 'url')}).\n\nWhy I think ${v(vals, 'newsletter')} readers will care:\n${v(vals, 'angle')}\n\nHappy to send you a free account, a unique discount for readers, or a short founder Q&A if useful.\n\nNo pressure either way — thanks for reading.\n\n— [Your name]`,
      },
    ],
  },
  {
    slug: 'press-release-template',
    name: 'Press Release Template',
    category: 'PR',
    tagline: 'Fill-in-the-blanks press release for your launch.',
    description: 'A clean press release skeleton you can hand to journalists or post on your blog.',
    fields: [
      { name: 'company', label: 'Company name', type: 'text', required: true },
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text', placeholder: 'San Francisco, CA', required: true },
      { name: 'desc', label: 'One-line description', type: 'text', required: true },
    ],
    generate: (vals) => {
      const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return [
        {
          title: 'Press release',
          body: `FOR IMMEDIATE RELEASE\n\n${v(vals, 'company')} launches ${v(vals, 'product')} — ${v(vals, 'desc')}\n\n${v(vals, 'city')} — ${today} — ${v(vals, 'company')} today announced ${v(vals, 'product')}, ${v(vals, 'desc').toLowerCase()}.\n\n[Paragraph 2: the problem in the market and why it matters now.]\n\n"[Quote from founder]," said [Name], [title] of ${v(vals, 'company')}.\n\n[Paragraph 4: features, pricing, availability.]\n\nAbout ${v(vals, 'company')}\n${v(vals, 'company')} is [one-sentence company description]. Learn more at [URL].\n\nMedia contact:\n[Name]\n[Email]`,
        },
      ];
    },
  },
  {
    slug: 'faq-generator',
    name: 'FAQ Generator',
    category: 'Copywriting',
    tagline: 'Generate 6 FAQ questions for your landing page.',
    description: 'The most common questions buyers ask, templated for your product.',
    fields: [
      { name: 'product', label: 'Product name', type: 'text', required: true },
      { name: 'category', label: 'Category (e.g. CRM, analytics)', type: 'text', required: true },
    ],
    generate: (vals) => {
      const p = v(vals, 'product');
      const c = v(vals, 'category');
      return [
        {
          title: 'FAQ questions',
          body: [
            `What is ${p}?`,
            `How is ${p} different from other ${c} tools?`,
            `How much does ${p} cost?`,
            `Do I need a credit card to try ${p}?`,
            `Can I cancel ${p} anytime?`,
            `Is my data secure with ${p}?`,
          ].join('\n'),
        },
      ];
    },
  },
  {
    slug: 'testimonial-request-email',
    name: 'Testimonial Request Email',
    category: 'Email',
    tagline: 'Ask a happy customer for a testimonial without the cringe.',
    description: 'A short, low-friction email template that actually gets responses.',
    fields: [
      { name: 'customer', label: 'Customer first name', type: 'text', required: true },
      { name: 'product', label: 'Product name', type: 'text', required: true },
    ],
    generate: (vals) => [
      {
        title: 'Testimonial request email',
        body: `Subject: Quick favour?\n\nHi ${v(vals, 'customer')},\n\nThanks again for using ${v(vals, 'product')} — your feedback has shaped a lot of what we've built.\n\nWould you be open to a short testimonial? Even 1-2 sentences on what's changed for you would mean a lot.\n\nIf it helps, here are three prompts (answer any):\n\n• What were you using before ${v(vals, 'product')}?\n• What's the one thing it lets you do that you couldn't before?\n• Who would you recommend it to?\n\nNo pressure if not — and thanks either way 🙏\n\n— [Your name]`,
      },
    ],
  },
  {
    slug: 'utm-link-builder',
    name: 'UTM Link Builder',
    category: 'Analytics',
    tagline: 'Build clean, tagged URLs for any campaign.',
    description: 'Generate a URL with utm_source, utm_medium, and utm_campaign appended correctly.',
    fields: [
      { name: 'url', label: 'Destination URL', type: 'text', placeholder: 'https://trylaunch.ai', required: true },
      { name: 'source', label: 'utm_source', type: 'text', placeholder: 'twitter', required: true },
      { name: 'medium', label: 'utm_medium', type: 'text', placeholder: 'social', required: true },
      { name: 'campaign', label: 'utm_campaign', type: 'text', placeholder: 'launch-day', required: true },
    ],
    generate: (vals) => {
      try {
        const url = new URL(v(vals, 'url'));
        url.searchParams.set('utm_source', v(vals, 'source'));
        url.searchParams.set('utm_medium', v(vals, 'medium'));
        url.searchParams.set('utm_campaign', v(vals, 'campaign'));
        return [{ title: 'Tagged URL', body: url.toString() }];
      } catch {
        return [{ title: 'Invalid URL', body: 'Make sure your URL starts with https:// or http://' }];
      }
    },
  },
  {
    slug: 'launch-day-checklist',
    name: 'Launch Day Checklist',
    category: 'Workflow',
    tagline: 'The 30-item checklist for shipping a launch that lands.',
    description: 'A no-fluff checklist covering everything from pre-launch prep to post-launch follow-up.',
    fields: [],
    generate: () => [
      {
        title: 'T-7 days',
        body: [
          '☐ Finalise tagline (≤60 chars)',
          '☐ Publish landing page with clear CTA',
          '☐ Submit to Launch + 3 other directories',
          '☐ Schedule launch tweet + thread',
          '☐ Line up 5 friends to share',
          '☐ Write LinkedIn launch post',
          '☐ Email your existing list with a heads-up',
        ].join('\n'),
      },
      {
        title: 'T-1 day',
        body: [
          '☐ Verify all links work',
          '☐ Test signup flow end-to-end',
          '☐ Confirm analytics + UTMs firing',
          '☐ Prep founder bio + screenshots',
          '☐ Queue 3 backup tweets',
          '☐ Add launch banner to your X header',
          '☐ Set a reminder for 6am launch day',
        ].join('\n'),
      },
      {
        title: 'Launch day',
        body: [
          '☐ Post launch tweet at peak time',
          '☐ Drop launch in 3 relevant Slack/Discord groups',
          '☐ Post on LinkedIn',
          '☐ Submit to Hacker News (Show HN)',
          '☐ Post to r/SideProject + niche subreddit',
          '☐ Reply to every comment within 30 min',
          '☐ Send personal DMs to 10 supporters',
          '☐ Email warm contacts directly',
        ].join('\n'),
      },
      {
        title: 'Day +1 to +7',
        body: [
          '☐ Thank everyone who shared',
          '☐ Post a "lessons learned" thread',
          '☐ Ask 3 early users for a testimonial',
          '☐ Pitch to 2 newsletters',
          '☐ Write a launch retro blog post',
          '☐ Update the landing page with social proof',
          '☐ Plan v2 based on feedback',
          '☐ Celebrate ✨',
        ].join('\n'),
      },
    ],
  },
];

export const TOOL_CATEGORIES = Array.from(new Set(freeTools.map((t) => t.category)));

export const getFreeTool = (slug: string) => freeTools.find((t) => t.slug === slug);
