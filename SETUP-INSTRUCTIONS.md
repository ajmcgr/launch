# TryLaunch.ai Setup Instructions

## Step 1: Database Setup

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL script
5. Verify all tables were created successfully

## Step 2: Configure Google OAuth (Optional)

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials (from Google Cloud Console)
4. Add authorized redirect URLs:
   - Development: `http://localhost:8080`
   - Production: Your deployed domain

## Step 3: Set Up Stripe Integration

### Backend Setup Required
You need to create a backend endpoint to handle Stripe checkout sessions:

```javascript
// Example: /api/create-checkout-session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { plan, productId, successUrl, cancelUrl } = await req.json();
  
  const prices = {
    join: 999,  // $9.99 in cents
    skip: 1999, // $19.99 in cents
    relaunch: 1299, // $12.99 in cents
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `TryLaunch - ${plan}`,
          },
          unit_amount: prices[plan],
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      plan,
      productId,
    },
  });

  return { id: session.id };
}
```

### Webhook Setup
1. Create a webhook endpoint to handle `checkout.session.completed` events
2. Update the `orders` table in Supabase after successful payment
3. Update product status to 'scheduled' or assign launch date

## Step 4: Resend Email Integration

### Email Templates Needed

Create these email templates in your backend:

1. **Welcome Email** - Sent after signup
2. **Launch Submission Confirmation** - Sent after product submission
3. **Launch Scheduled Confirmation** - Sent after payment
4. **Launch Live Notification** - Sent when product goes live

### Example Resend Integration:

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Welcome email
await resend.emails.send({
  from: 'TryLaunch <onboarding@trylaunch.ai>',
  to: [userEmail],
  subject: 'Welcome to TryLaunch!',
  html: '<h1>Welcome!</h1><p>Start discovering amazing products...</p>',
});

// Launch confirmation
await resend.emails.send({
  from: 'TryLaunch <launches@trylaunch.ai>',
  to: [userEmail],
  subject: 'Your Product Launch is Scheduled!',
  html: `<h1>Launch Scheduled</h1><p>Your product "${productName}" will launch on ${launchDate}</p>`,
});
```

## Step 5: Beehiiv Newsletter Integration

The newsletter subscription is already integrated on the frontend. When users sign up, they'll be automatically added to your Beehiiv publication.

To add existing users to Beehiiv, create a backend script:

```javascript
// Add all users to Beehiiv
const { data: users } = await supabase.from('users').select('*');

for (const user of users) {
  await fetch('https://api.beehiiv.com/v2/publications/0a9afc96-5b2f-4f1f-bdd8-896a877ec01d/subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
    },
    body: JSON.stringify({
      email: user.email,
      reactivate_existing: false,
    }),
  });
}
```

## Step 6: Environment Variables Checklist

Make sure all these secrets are properly configured in Lovable:

- ✅ VITE_NEXT_PUBLIC_SUPABASE_URL
- ✅ VITE_NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ VITE_RESEND_API_KEY
- ✅ VITE_STRIPE_PUBLIC_KEY
- ✅ STRIPE_SECRET_KEY (backend only)
- ✅ STRIPE_WEBHOOK_SECRET (backend only)
- ✅ VITE_BEEHIIV_API_KEY
- ✅ VITE_BEEHIIV_PUB_ID

## Step 7: File Upload Configuration

For product images and media:

1. In Supabase Dashboard, go to Storage
2. Create a bucket named `product-media`
3. Set it to public
4. Update RLS policies to allow authenticated users to upload
5. Implement file upload in the submit form

## Step 8: Launch Scheduler

Create a cron job or scheduled function to:
1. Check for products with `status = 'scheduled'` and `launch_date <= NOW()`
2. Update their status to `'launched'`
3. Send launch notification emails to makers

## Testing Checklist

- [ ] User can sign up and create profile
- [ ] Google OAuth works correctly
- [ ] Users can submit products (form validation)
- [ ] Stripe checkout opens correctly
- [ ] Products appear in "My Products" after submission
- [ ] Voting system works (upvote/downvote)
- [ ] User profiles display correctly
- [ ] Follow/unfollow functionality works
- [ ] Newsletter subscription works
- [ ] Category filtering works on Products page
- [ ] Search functionality works

## Production Deployment

1. Deploy to your hosting platform
2. Update Supabase redirect URLs with production domain
3. Update Stripe redirect URLs
4. Configure custom domain (optional)
5. Set up monitoring and error tracking
6. Test all payment flows in production mode

## Support

For issues or questions:
- Email: alex@trylaunch.ai
- Discord: https://discord.gg/uTgwQsJWdS
