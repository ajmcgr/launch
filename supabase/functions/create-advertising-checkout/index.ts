import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { 
      launchUrl, 
      sponsorshipType,
      months,
      selectedMonths,
      message 
    } = await req.json();

    console.log('Creating checkout for:', { sponsorshipType, months, launchUrl });

    if (!sponsorshipType) {
      throw new Error('Sponsorship type is required');
    }

    // Launch URL is required for all sponsorship types
    if (!launchUrl) {
      throw new Error('Launch URL is required');
    }
    
    // Validate Launch URL format
    if (!launchUrl.includes('trylaunch.ai/launch/')) {
      throw new Error('Please provide a valid Launch URL');
    }

    // Calculate pricing
    let unitAmount: number;
    let productName: string;
    let description: string;

    const monthsLabel = selectedMonths?.length > 0 ? ` (${selectedMonths.join(', ')})` : '';

    if (sponsorshipType === 'combined') {
      unitAmount = 100000; // $1,000 in cents
      productName = 'Combined Sponsorship Package';
      description = `Website + Newsletter sponsorship${monthsLabel}`;
    } else if (sponsorshipType === 'website') {
      unitAmount = 75000; // $750 in cents
      productName = 'Website Placement';
      description = `Sponsored homepage listing${monthsLabel}`;
    } else {
      unitAmount = 50000; // $500 in cents
      productName = 'Newsletter Sponsorship';
      description = `Newsletter sponsorship${monthsLabel}`;
    }

    // Extract product slug from launch URL if provided
    let productSlug = '';
    if (launchUrl) {
      const match = launchUrl.match(/\/launch\/([^/?#]+)/);
      if (match) {
        productSlug = match[1];
      }
    }

    // Create checkout session with billing address collection for company invoices
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: description,
            },
            unit_amount: unitAmount,
          },
          quantity: parseInt(months),
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/advertise?success=true`,
      cancel_url: `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/advertise?canceled=true`,
      metadata: {
        type: 'advertising',
        sponsorship_type: sponsorshipType,
        launch_url: launchUrl || '',
        product_slug: productSlug,
        months: months,
        selected_months: selectedMonths?.join(', ') || '',
        message: message || '',
      },
    });

    console.log('Created checkout session:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error creating checkout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
