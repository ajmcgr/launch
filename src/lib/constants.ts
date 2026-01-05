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
    description: 'Launches 7+ days out, after paid queue',
  },
  {
    id: 'join',
    name: 'Join the Line',
    price: 9,
    description: 'Launches 3+ days out, priority over free',
  },
  {
    id: 'skip',
    name: 'Launch',
    price: 39,
    description: 'Choose any available launch date and time',
  },
  {
    id: 'relaunch',
    name: 'Relaunch',
    price: 19,
    description: 'Relaunch existing product into spotlight',
  },
] as const;
