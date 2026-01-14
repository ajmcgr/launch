export const CATEGORIES = [
  'Productivity',
  'Engineering & Development',
  'Design & Creative',
  'Finance',
  'Social & Community',
  'Marketing & Sales',
  'Health & Fitness',
  'Travel',
  'Platforms',
  'Product add-ons',
  'AI Agents',
  'Web3',
  'LLMs',
  'Physical Products',
  'Voice AI Tools',
  'Ecommerce',
  'No-code Platforms',
  'Data analysis tools',
] as const;

export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Launch immediately',
  },
  {
    id: 'join',
    name: 'Launch Lite',
    price: 9,
    description: 'Launch immediately, promoted on Launch socials',
  },
  {
    id: 'skip',
    name: 'Launch',
    price: 39,
    description: 'Choose any launch date and time, promoted on Launch socials and newsletter',
  },
  {
    id: 'relaunch',
    name: 'Relaunch',
    price: 19,
    description: 'Relaunch existing product into spotlight',
  },
] as const;
