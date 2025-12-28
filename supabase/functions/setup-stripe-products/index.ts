import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    console.log('Setting up Stripe products...');

    // Define the products
    const products = [
      // Launch plans
      {
        name: 'Join the Line',
        description: 'Automatic next available launch date',
        amount: 900, // $9 in cents
        metadata: { plan_id: 'join' }
      },
      {
        name: 'Launch',
        description: 'Choose any available launch date and time',
        amount: 3900, // $39 in cents
        metadata: { plan_id: 'skip' }
      },
      {
        name: 'Relaunch',
        description: 'Relaunch existing product into spotlight',
        amount: 1900, // $19 in cents
        metadata: { plan_id: 'relaunch' }
      },
      // Advertising products
      {
        name: 'Website Placement',
        description: 'Sponsored homepage listing for one month',
        amount: 75000, // $750 in cents
        metadata: { plan_id: 'ad_website' }
      },
      {
        name: 'Newsletter Sponsorship',
        description: 'Newsletter sponsorship for one month',
        amount: 50000, // $500 in cents
        metadata: { plan_id: 'ad_newsletter' }
      },
      {
        name: 'Combined Sponsorship Package',
        description: 'Website + Newsletter sponsorship for one month',
        amount: 100000, // $1,000 in cents
        metadata: { plan_id: 'ad_combined' }
      }
    ];

    const createdProducts = [];

    for (const productData of products) {
      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `metadata['plan_id']:'${productData.metadata.plan_id}'`,
      });

      let product;
      let price;

      if (existingProducts.data.length > 0) {
        // Update existing product
        product = existingProducts.data[0];
        console.log(`Updating existing product: ${product.id}`);
        
        product = await stripe.products.update(product.id, {
          name: productData.name,
          description: productData.description,
        });

        // Get existing prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        // Deactivate old prices
        for (const oldPrice of prices.data) {
          await stripe.prices.update(oldPrice.id, { active: false });
        }

        // Create new price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: productData.amount,
          currency: 'usd',
        });
      } else {
        // Create new product
        console.log(`Creating new product: ${productData.name}`);
        product = await stripe.products.create({
          name: productData.name,
          description: productData.description,
          metadata: productData.metadata,
        });

        // Create price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: productData.amount,
          currency: 'usd',
        });
      }

      createdProducts.push({
        plan_id: productData.metadata.plan_id,
        product_id: product.id,
        price_id: price.id,
        amount: productData.amount,
      });

      console.log(`✓ ${productData.name}: Product ${product.id}, Price ${price.id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        products: createdProducts,
        message: 'Stripe products setup complete'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to setup Stripe products',
        details: error 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});