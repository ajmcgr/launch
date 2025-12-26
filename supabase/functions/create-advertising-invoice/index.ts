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
      name, 
      email, 
      company, 
      website, 
      launchUrl, 
      websiteSponsorship, 
      newsletterSponsorship, 
      months,
      message 
    } = await req.json();

    console.log('Creating invoice for:', { email, company, websiteSponsorship, newsletterSponsorship, months });

    // Validate required fields
    if (!email || !name || !company) {
      throw new Error('Missing required fields: email, name, company');
    }

    if (!websiteSponsorship && !newsletterSponsorship) {
      throw new Error('At least one sponsorship type must be selected');
    }

    // Calculate pricing
    let unitAmount: number;
    let description: string;

    if (websiteSponsorship && newsletterSponsorship) {
      unitAmount = 125000; // $1,250 in cents
      description = 'Combined Package (Website + Newsletter)';
    } else if (websiteSponsorship) {
      unitAmount = 100000; // $1,000 in cents
      description = 'Website Placement';
    } else {
      unitAmount = 50000; // $500 in cents
      description = 'Newsletter Sponsorship';
    }

    // Create or retrieve customer
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('Found existing customer:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          company: company,
          website: website || '',
          launch_url: launchUrl || '',
        },
      });
      console.log('Created new customer:', customer.id);
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 7,
      metadata: {
        type: 'advertising',
        company: company,
        website: website || '',
        launch_url: launchUrl || '',
        message: message || '',
      },
    });

    console.log('Created invoice:', invoice.id);

    // Add invoice item(s)
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      quantity: parseInt(months),
      unit_amount: unitAmount,
      currency: 'usd',
      description: `${description} - ${months} month(s)`,
    });

    console.log('Added invoice item');

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id);

    console.log('Invoice finalized and sent:', finalizedInvoice.id);

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: finalizedInvoice.id,
        invoiceUrl: finalizedInvoice.hosted_invoice_url,
        amount: finalizedInvoice.amount_due,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error creating invoice:', error);
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
