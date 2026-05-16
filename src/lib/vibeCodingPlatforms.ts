export interface VibeCodingPlatform {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  bestFor: string;
  strengths: string[];
  workflow: string;
  launchPitch: string;
}

export const vibeCodingPlatforms: VibeCodingPlatform[] = [
  {
    slug: 'codex',
    name: 'Codex',
    tagline: 'OpenAI\'s coding agent for shipping software with natural language.',
    description:
      'Codex is OpenAI\'s coding agent that turns natural language into working software. It runs tasks in a sandboxed environment, executes commands, edits files, and ships pull requests — built for developers who want an AI pair programmer that can actually do the work.',
    website: 'https://openai.com/codex',
    bestFor: 'Developers who want an AI coding agent inside their existing repo and workflow.',
    strengths: [
      'Runs agentic coding tasks end-to-end',
      'Deep integration with GitHub and CLI workflows',
      'Backed by OpenAI\'s frontier models',
      'Strong at refactors, tests, and bug fixes',
    ],
    workflow:
      'Describe the change you want, Codex plans and edits the repo, runs tests, and opens a PR you can review and merge.',
    launchPitch:
      'Built something with Codex? Launch puts your project in front of 50,000+ founders, makers, and indie hackers who care about AI-built tools.',
  },
  {
    slug: 'claude-code',
    name: 'Claude Code',
    tagline: 'Anthropic\'s terminal-native coding agent powered by Claude.',
    description:
      'Claude Code is Anthropic\'s agentic CLI for software engineering. It lives in your terminal, understands your codebase, and ships changes — from one-line fixes to multi-file refactors — using Claude\'s strong reasoning and tool use.',
    website: 'https://www.anthropic.com/claude-code',
    bestFor: 'Engineers who live in the terminal and want a powerful local coding agent.',
    strengths: [
      'Terminal-native, scriptable, composable',
      'Excellent long-context codebase reasoning',
      'Strong agentic loops with tool use',
      'Pairs naturally with git and existing dev tooling',
    ],
    workflow:
      'Open Claude Code in your repo, describe the task in plain English, let Claude plan, edit, run, and verify changes.',
    launchPitch:
      'Shipped a product with Claude Code? Launch helps you get discovered by an audience that actively hunts for new AI-built tools.',
  },
  {
    slug: 'lovable',
    name: 'Lovable',
    tagline: 'The AI app builder for full-stack web apps — prompt to production.',
    description:
      'Lovable is an AI-native platform for building full-stack web applications by chatting. It generates React, Tailwind, and Supabase code, runs a live preview, and lets you publish to a real domain — no setup required.',
    website: 'https://lovable.dev',
    bestFor: 'Founders and makers who want to ship a real product without configuring a stack.',
    strengths: [
      'Prompt-driven full-stack app generation',
      'Integrated database, auth, and storage via Lovable Cloud',
      'Live preview and one-click publish',
      'Built-in deploys with custom domains',
    ],
    workflow:
      'Describe your app, iterate via chat with a live preview, connect a database, and publish — all in one place.',
    launchPitch:
      'Built something with Lovable? Launch your project to 50,000+ founders, indie hackers, and AI builders looking for what\'s new.',
  },
  {
    slug: 'bolt-new',
    name: 'Bolt.new',
    tagline: 'StackBlitz\'s in-browser AI dev environment — prompt to deploy.',
    description:
      'Bolt.new is an AI-powered web development agent from StackBlitz. It spins up a full Node.js environment in your browser, generates code, runs it instantly, and lets you deploy without touching a terminal.',
    website: 'https://bolt.new',
    bestFor: 'Builders who want an instant in-browser sandbox with AI-generated code.',
    strengths: [
      'Full Node.js runtime in the browser via WebContainers',
      'Instant preview with no local setup',
      'Fast prototyping of full-stack apps',
      'Easy deploys to Netlify and similar',
    ],
    workflow:
      'Open bolt.new, describe what you want, watch it scaffold and run the app live in your browser, then deploy.',
    launchPitch:
      'Made something cool with Bolt.new? Launch gets your project in front of the people who love trying new AI-built apps.',
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    tagline: 'The AI-first code editor built on top of VS Code.',
    description:
      'Cursor is a VS Code-based editor designed around AI. It offers inline edits, multi-file changes, agent mode, and deep codebase context — built for developers who want AI baked into every keystroke.',
    website: 'https://cursor.com',
    bestFor: 'Professional developers who want AI deeply integrated into their editor.',
    strengths: [
      'Familiar VS Code experience with AI superpowers',
      'Inline edits, tab completion, agent mode',
      'Strong multi-file and repo-wide context',
      'Works with your existing extensions and workflow',
    ],
    workflow:
      'Open your project in Cursor, prompt the agent or use inline edits, accept diffs, and keep shipping in the editor you already know.',
    launchPitch:
      'Built a product in Cursor? Launch puts it in front of an audience of founders and makers who care about well-crafted AI tools.',
  },
  {
    slug: 'base44',
    name: 'Base44',
    tagline: 'All-in-one platform for building custom apps with AI.',
    description:
      'Base44 is an AI app builder that lets you describe internal tools, dashboards, and full apps in plain English and get a working product with database, auth, and UI included.',
    website: 'https://base44.com',
    bestFor: 'Operators and teams building internal tools and custom business apps quickly.',
    strengths: [
      'All-in-one app platform (UI, data, auth)',
      'Great for internal tools and dashboards',
      'No infra setup required',
      'Fast iteration on business logic',
    ],
    workflow:
      'Describe the app you need, Base44 builds the UI, schema, and logic, then you refine it via prompts.',
    launchPitch:
      'Shipped something with Base44? Launch helps you reach an audience hungry for new AI-built products and tools.',
  },
  {
    slug: 'replit',
    name: 'Replit',
    tagline: 'Cloud dev environment with Replit Agent for prompt-to-app building.',
    description:
      'Replit is a browser-based development platform with a built-in AI Agent that can scaffold, edit, and deploy full applications from natural language — all without leaving the browser.',
    website: 'https://replit.com',
    bestFor: 'Developers and learners who want a complete cloud IDE plus an AI agent to build with them.',
    strengths: [
      'Full cloud IDE with instant hosting',
      'Replit Agent for prompt-driven app building',
      'Multiplayer collaboration',
      'Easy databases, secrets, and deployments',
    ],
    workflow:
      'Use Replit Agent to spin up an app from a prompt, edit it live in the cloud IDE, and deploy with one click.',
    launchPitch:
      'Built something on Replit? Launch gets your project discovered by 50,000+ founders, makers, and indie hackers.',
  },
  {
    slug: 'v0',
    name: 'V0',
    tagline: 'Vercel\'s generative UI tool for React and shadcn/ui.',
    description:
      'V0 is Vercel\'s AI tool for generating React, Tailwind, and shadcn/ui components and full pages from prompts or screenshots. Designed to plug directly into Next.js projects.',
    website: 'https://v0.dev',
    bestFor: 'React and Next.js developers who want fast, on-brand UI from prompts.',
    strengths: [
      'Generates clean React + Tailwind + shadcn/ui code',
      'Image-to-UI and prompt-to-UI',
      'Tight integration with Vercel and Next.js',
      'Great starting point for production UIs',
    ],
    workflow:
      'Prompt or upload a screenshot, iterate on the generated component, then copy the code into your Next.js project.',
    launchPitch:
      'Designed and shipped a product with v0? Launch helps you put it in front of an audience that genuinely cares about good UI.',
  },
  {
    slug: 'shipper',
    name: 'Shipper',
    tagline: 'AI-native platform for shipping apps fast.',
    description:
      'Shipper is an AI-native tool focused on helping makers ship apps quickly — from idea to deployed product with as little friction as possible.',
    website: 'https://shipper.so',
    bestFor: 'Indie makers who want the fastest path from idea to live app.',
    strengths: [
      'Opinionated, ship-first workflow',
      'AI-assisted scaffolding and iteration',
      'Built for solo founders and small teams',
      'Quick deploys to a live URL',
    ],
    workflow:
      'Describe the app, let Shipper scaffold and iterate, then push it live.',
    launchPitch:
      'Built something with Shipper? Launch your product to 50,000+ founders, makers, and indie hackers ready to try it.',
  },
];

export const getVibeCodingPlatform = (slug: string) =>
  vibeCodingPlatforms.find((p) => p.slug === slug);
