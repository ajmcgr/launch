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
    description: 'Only scheduled after paid launch queue',
  },
  {
    id: 'join',
    name: 'Join the Line',
    price: 9,
    description: 'Scheduled before free but not before launch & relaunch',
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
