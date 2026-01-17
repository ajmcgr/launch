import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log('Webhook event type:', event.type);

    // Handle subscription events
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;
      
      if (!metadata?.user_id) {
        console.log('No user_id in subscription metadata, skipping');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Calculate expiry date based on current period end
      const expiryDate = new Date(subscription.current_period_end * 1000);
      
      // Map Stripe status to our status
      const statusMap: Record<string, string> = {
        'active': 'active',
        'past_due': 'past_due',
        'canceled': 'canceled',
        'unpaid': 'unpaid',
        'trialing': 'active',
      };

      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          plan: 'annual_access',
          annual_access_expires_at: expiryDate.toISOString(),
          stripe_subscription_id: subscription.id,
          subscription_status: statusMap[subscription.status] || subscription.status,
          subscription_cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq('id', metadata.user_id);

      if (updateError) {
        console.error('Error updating user subscription:', updateError);
        throw updateError;
      }

      console.log(`Subscription ${event.type} processed for user ${metadata.user_id}`);

      // Send confirmation email for new subscriptions
      if (event.type === 'customer.subscription.created') {
        try {
          const { data: authUser } = await supabaseClient.auth.admin.getUserById(metadata.user_id);
          
          if (authUser?.user?.email) {
            const expiryFormatted = expiryDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            
            const emailHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
                    .logo { height: 32px; }
                    .content { padding: 30px; }
                    .content h1 { margin: 0 0 16px 0; font-size: 20px; color: #111; }
                    .content p { margin: 0 0 16px 0; color: #4b5563; }
                    .highlight { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb; }
                    .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="card">
                      <div class="header">
                        <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                      </div>
                      <div class="content">
                        <h1>Welcome to Launch Pass! 🎉</h1>
                        <p>Thank you for subscribing to Launch Pass. You now have unlimited access to all Launch features.</p>
                        <div class="highlight">
                          <p style="font-weight: 600; margin: 0;">Your subscription renews on</p>
                          <p style="font-size: 18px; font-weight: bold; color: #111; margin: 8px 0 0 0;">${expiryFormatted}</p>
                        </div>
                        <p><strong>What's included:</strong></p>
                        <ul>
                          <li>Unlimited product launches</li>
                          <li>Unlimited relaunches</li>
                          <li>Priority date scheduling</li>
                          <li>All future non-advertising features</li>
                        </ul>
                        <p style="color: #6b7280; font-size: 14px;"><em>Your subscription will automatically renew each year. You can cancel anytime from your account settings.</em></p>
                      </div>
                      <div class="footer">
                        <p>Thank you for being part of the Launch community.</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `;
            
            await resend.emails.send({
              from: 'Launch <notifications@trylaunch.ai>',
              to: [authUser.user.email],
              subject: 'Welcome to Launch Pass! 🚀',
              html: emailHtml,
            });
            
            console.log('Subscription confirmation email sent');
          }
        } catch (emailError) {
          console.error('Error sending subscription confirmation email:', emailError);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;
      
      if (!metadata?.user_id) {
        console.log('No user_id in subscription metadata, skipping');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          plan: null,
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        })
        .eq('id', metadata.user_id);

      if (updateError) {
        console.error('Error updating user after subscription deletion:', updateError);
        throw updateError;
      }

      console.log(`Subscription deleted for user ${metadata.user_id}`);

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle invoice payment for renewals
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
        // This is a renewal payment
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const metadata = subscription.metadata;
        
        if (metadata?.user_id) {
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          const expiryDate = new Date(subscription.current_period_end * 1000);
          
          await supabaseClient
            .from('users')
            .update({
              annual_access_expires_at: expiryDate.toISOString(),
              subscription_status: 'active',
            })
            .eq('id', metadata.user_id);

          console.log(`Subscription renewed for user ${metadata.user_id} until ${expiryDate.toISOString()}`);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (!metadata) {
        throw new Error('No metadata found in session');
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Check if this is an advertising checkout
      if (metadata.type === 'advertising') {
        console.log('Processing advertising checkout:', {
          sponsorship_type: metadata.sponsorship_type,
          product_slug: metadata.product_slug,
          months: metadata.months,
          selected_months: metadata.selected_months,
        });

        // For website/combined sponsorships, we need to create sponsored_products entries
        if ((metadata.sponsorship_type === 'website' || metadata.sponsorship_type === 'combined') && metadata.product_slug) {
          // Find the product by slug
          const { data: product, error: productError } = await supabaseClient
            .from('products')
            .select('id, name')
            .eq('slug', metadata.product_slug)
            .single();

          if (productError || !product) {
            console.error('Product not found for slug:', metadata.product_slug);
            // Don't fail the webhook - we'll handle this manually
          } else {
            // Parse selected months and create sponsored_products entries
            const selectedMonthsStr = metadata.selected_months || '';
            const monthStrings = selectedMonthsStr.split(', ').filter(Boolean);
            
            for (const monthStr of monthStrings) {
              // Parse "January 2025" format
              const monthDate = new Date(monthStr);
              if (!isNaN(monthDate.getTime())) {
                const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                
                // Bump all existing sponsors down by 1 position to make room at position 1
                const { data: existingSponsors } = await supabaseClient
                  .from('sponsored_products')
                  .select('id, position')
                  .lte('start_date', endDate.toISOString().split('T')[0])
                  .gte('end_date', startDate.toISOString().split('T')[0])
                  .order('position', { ascending: true });

                // Shift existing sponsors down (increment their positions)
                if (existingSponsors && existingSponsors.length > 0) {
                  // Update in reverse order (highest position first) to avoid conflicts
                  const sortedDesc = [...existingSponsors].sort((a, b) => b.position - a.position);
                  for (const sponsor of sortedDesc) {
                    const newPosition = sponsor.position + 1;
                    // Only keep sponsors in positions 1-4, remove if pushed beyond
                    if (newPosition <= 4) {
                      await supabaseClient
                        .from('sponsored_products')
                        .update({ position: newPosition })
                        .eq('id', sponsor.id);
                      console.log(`Bumped sponsor ${sponsor.id} from position ${sponsor.position} to ${newPosition}`);
                    } else {
                      // Remove sponsor pushed beyond position 4
                      await supabaseClient
                        .from('sponsored_products')
                        .delete()
                        .eq('id', sponsor.id);
                      console.log(`Removed sponsor ${sponsor.id} as it was pushed beyond position 4`);
                    }
                  }
                }

                // Insert new sponsor at position 1
                const { error: insertError } = await supabaseClient
                  .from('sponsored_products')
                  .insert({
                    product_id: product.id,
                    position: 1,
                    sponsorship_type: metadata.sponsorship_type,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                  });

                if (insertError) {
                  console.error('Error creating sponsored product:', insertError);
                } else {
                  console.log(`Created sponsored product for ${product.name} at position 1 for ${monthStr}`);
                }
              }
            }
          }
        }

        // Send confirmation email
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
                  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                  .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                  .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
                  .logo { height: 32px; }
                  .content { padding: 30px; }
                  .content h1 { margin: 0 0 16px 0; font-size: 20px; color: #111; }
                  .content p { margin: 0 0 16px 0; color: #4b5563; }
                  .highlight { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                  .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="card">
                    <div class="header">
                      <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                    </div>
                    <div class="content">
                      <h1>Sponsorship Payment Confirmed</h1>
                      <p>Thank you for your sponsorship purchase, ${metadata.name}!</p>
                      <div class="highlight">
                        <p><strong>Package:</strong> ${metadata.sponsorship_type === 'combined' ? 'Combined Package' : metadata.sponsorship_type === 'website' ? 'Website Placement' : 'Newsletter Sponsorship'}</p>
                        <p><strong>Company:</strong> ${metadata.company}</p>
                        <p><strong>Months:</strong> ${metadata.selected_months || metadata.months + ' month(s)'}</p>
                        ${metadata.launch_url ? `<p><strong>Product:</strong> ${metadata.launch_url}</p>` : ''}
                      </div>
                      <p>Your sponsorship has been activated. If you selected website placement, your product will appear in the sponsored section on our homepage during your selected months.</p>
                      <p>If you have any questions, please reply to this email.</p>
                    </div>
                    <div class="footer">
                      <p>Thank you for advertising with Launch.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: 'Launch <notifications@trylaunch.ai>',
            to: [session.customer_email || ''],
            subject: `Sponsorship Confirmed - ${metadata.company}`,
            html: emailHtml,
          });

          console.log('Advertising confirmation email sent');
        } catch (emailError) {
          console.error('Error sending advertising confirmation email:', emailError);
        }

        // Send admin notification for newsletter sponsorships
        if (metadata.sponsorship_type === 'newsletter' || metadata.sponsorship_type === 'combined') {
          try {
            const adminEmailHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
                    .logo { height: 32px; }
                    .content { padding: 30px; }
                    .content h1 { margin: 0 0 16px 0; font-size: 20px; color: #111; }
                    .content p { margin: 0 0 16px 0; color: #4b5563; }
                    .highlight { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d; }
                    .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="card">
                      <div class="header">
                        <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                      </div>
                      <div class="content">
                        <h1>📰 New Newsletter Sponsorship</h1>
                        <p>A new newsletter sponsorship has been purchased and needs to be added to the newsletter.</p>
                        <div class="highlight">
                          <p><strong>Package:</strong> ${metadata.sponsorship_type === 'combined' ? 'Combined Package' : 'Newsletter Sponsorship'}</p>
                          <p><strong>Product:</strong> ${metadata.launch_url || metadata.product_slug || 'N/A'}</p>
                          <p><strong>Months:</strong> ${metadata.selected_months || metadata.months + ' month(s)'}</p>
                          <p><strong>Customer Email:</strong> ${session.customer_email || 'N/A'}</p>
                          ${metadata.message ? `<p><strong>Message:</strong> ${metadata.message}</p>` : ''}
                        </div>
                        <p>Please add this product to the newsletter for the specified months.</p>
                      </div>
                      <div class="footer">
                        <p>Launch Admin Notification</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `;

            await resend.emails.send({
              from: 'Launch <notifications@trylaunch.ai>',
              to: ['alex@trylaunch.ai'],
              subject: `📰 New Newsletter Sponsorship - ${metadata.selected_months || 'Action Required'}`,
              html: adminEmailHtml,
            });

            console.log('Admin notification email sent for newsletter sponsorship');
          } catch (adminEmailError) {
            console.error('Error sending admin notification email:', adminEmailError);
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Helper function to find next available date with capacity
      // For Launch (skip) plan, only count other 'skip' plan products
      // For other plans, count all products
      const findNextAvailableDate = async (startDaysFromNow: number, planType?: string): Promise<string> => {
        const MAX_DAILY_CAPACITY = 100; // Cap at 100 launches per day
        let daysToCheck = startDaysFromNow;
        const maxAttempts = 365; // Don't check more than a year ahead
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + daysToCheck);
          checkDate.setHours(0, 1, 0, 0); // 12:01 AM PST
          
          // Calculate the start and end of the day for this date
          const dayStart = new Date(checkDate);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(checkDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          let count: number | null = 0;
          
          if (planType === 'skip') {
            // For Launch (skip) plan, only count other 'skip' plan products
            // This allows Launch plan to bump Free, Join, and Relaunch plans
            const { data: skipProducts } = await supabaseClient
              .from('orders')
              .select('product_id')
              .eq('plan', 'skip');
            
            const skipProductIds = skipProducts?.map(o => o.product_id).filter(Boolean) || [];
            
            if (skipProductIds.length > 0) {
              const { count: skipCount } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .in('id', skipProductIds)
                .in('status', ['scheduled', 'launched'])
                .gte('launch_date', dayStart.toISOString())
                .lte('launch_date', dayEnd.toISOString());
              count = skipCount;
            }
          } else if (planType === 'relaunch') {
            // For Relaunch plan, only count 'skip' and 'relaunch' plan products
            // This allows Relaunch to bump Free and Join plans, but not Launch
            const { data: priorityProducts } = await supabaseClient
              .from('orders')
              .select('product_id')
              .in('plan', ['skip', 'relaunch']);
            
            const priorityProductIds = priorityProducts?.map(o => o.product_id).filter(Boolean) || [];
            
            if (priorityProductIds.length > 0) {
              const { count: priorityCount } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .in('id', priorityProductIds)
                .in('status', ['scheduled', 'launched'])
                .gte('launch_date', dayStart.toISOString())
                .lte('launch_date', dayEnd.toISOString());
              count = priorityCount;
            }
          } else {
            // For Free and Join plans, count all products
            const { count: totalCount } = await supabaseClient
              .from('products')
              .select('*', { count: 'exact', head: true })
              .in('status', ['scheduled', 'launched'])
              .gte('launch_date', dayStart.toISOString())
              .lte('launch_date', dayEnd.toISOString());
            count = totalCount;
          }
          
          console.log(`Checking day ${checkDate.toDateString()} for ${planType || 'default'}: ${count}/${MAX_DAILY_CAPACITY} launches`);
          
          if ((count ?? 0) < MAX_DAILY_CAPACITY) {
            return checkDate.toISOString();
          }
          
          // Move to next day if this day is full
          daysToCheck += 1;
        }
        
        // Fallback if no date found (shouldn't happen)
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + daysToCheck);
        fallbackDate.setHours(0, 1, 0, 0); // 12:01 AM PST
        return fallbackDate.toISOString();
      };

      // Helper function to check if a specific date has capacity for Launch (skip) plan
      const checkLaunchPlanCapacity = async (dateStr: string): Promise<boolean> => {
        const MAX_DAILY_CAPACITY = 100;
        const checkDate = new Date(dateStr);
        
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Only count other 'skip' plan products
        const { data: skipProducts } = await supabaseClient
          .from('orders')
          .select('product_id')
          .eq('plan', 'skip');
        
        const skipProductIds = skipProducts?.map(o => o.product_id).filter(Boolean) || [];
        
        if (skipProductIds.length === 0) return true;
        
        const { count } = await supabaseClient
          .from('products')
          .select('*', { count: 'exact', head: true })
          .in('id', skipProductIds)
          .in('status', ['scheduled', 'launched'])
          .gte('launch_date', dayStart.toISOString())
          .lte('launch_date', dayEnd.toISOString());
        
        console.log(`Launch plan capacity check for ${checkDate.toDateString()}: ${count}/${MAX_DAILY_CAPACITY}`);
        return (count ?? 0) < MAX_DAILY_CAPACITY;
      };

      // Determine launch date based on plan
      let launchDate: string;
      const plan = metadata.plan;
      
      // Handle Annual Access plan - user-level subscription, not product-specific
      if (plan === 'annual_access') {
        console.log('Processing Annual Access purchase for user:', metadata.user_id);
        
        // Calculate expiry date (12 months from now)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        // Update user with annual access
        const { error: updateUserError } = await supabaseClient
          .from('users')
          .update({
            plan: 'annual_access',
            annual_access_expires_at: expiryDate.toISOString(),
          })
          .eq('id', metadata.user_id);
        
        if (updateUserError) {
          console.error('Error updating user with annual access:', updateUserError);
          throw updateUserError;
        }
        
        console.log('Annual Access activated until:', expiryDate.toISOString());
        
        // Send confirmation email
        try {
          const { data: authUser } = await supabaseClient.auth.admin.getUserById(metadata.user_id);
          
          if (authUser?.user?.email) {
            const expiryFormatted = expiryDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            
            const emailHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
                    .logo { height: 32px; }
                    .content { padding: 30px; }
                    .content h1 { margin: 0 0 16px 0; font-size: 20px; color: #111; }
                    .content p { margin: 0 0 16px 0; color: #4b5563; }
                    .highlight { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb; }
                    .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="card">
                      <div class="header">
                        <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                      </div>
                      <div class="content">
                        <h1>Annual Access Activated! 🎉</h1>
                        <p>Thank you for purchasing Launch Annual Access. You now have unlimited access to all Launch features for one year.</p>
                        <div class="highlight">
                          <p style="font-weight: 600; margin: 0;">Your access expires on</p>
                          <p style="font-size: 18px; font-weight: bold; color: #111; margin: 8px 0 0 0;">${expiryFormatted}</p>
                        </div>
                        <p><strong>What's included:</strong></p>
                        <ul>
                          <li>Unlimited product launches</li>
                          <li>Unlimited relaunches</li>
                          <li>Priority date scheduling</li>
                          <li>Newsletter and social media promotion</li>
                        </ul>
                        <p style="color: #6b7280; font-size: 14px;"><em>Note: Advertising and sponsored placements are not included in Annual Access.</em></p>
                      </div>
                      <div class="footer">
                        <p>Thank you for being part of the Launch community.</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `;
            
            await resend.emails.send({
              from: 'Launch <notifications@trylaunch.ai>',
              to: [authUser.user.email],
              subject: 'Your Annual Access is Active! 🚀',
              html: emailHtml,
            });
            
            console.log('Annual access confirmation email sent');
          }
        } catch (emailError) {
          console.error('Error sending annual access confirmation email:', emailError);
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      if (plan === 'skip') {
        // Launch plan: Use the selected date, but validate capacity
        if (metadata.selected_date) {
          const hasCapacity = await checkLaunchPlanCapacity(metadata.selected_date);
          if (hasCapacity) {
            launchDate = metadata.selected_date;
          } else {
            // If selected date is full of Launch plans, find next available
            console.log('Selected date full of Launch plans, finding next available...');
            launchDate = await findNextAvailableDate(1, 'skip');
          }
        } else {
          launchDate = await findNextAvailableDate(1, 'skip');
        }
      } else if (plan === 'join') {
        // Launch Lite: Launch immediately (1 minute from now)
        const immediateDate = new Date(Date.now() + 60000);
        launchDate = immediateDate.toISOString();
      } else if (plan === 'relaunch') {
        // Relaunch: First available date >30 days out (only counting Launch + Relaunch plans)
        launchDate = await findNextAvailableDate(31, 'relaunch');
      } else {
        // Default fallback (free plan) - launch immediately if capacity available
        const immediateDate = new Date(Date.now() + 60000);
        launchDate = immediateDate.toISOString();
      }

      console.log(`Assigning launch date for plan '${plan}': ${launchDate}`);

      // Determine if product should be 'scheduled' or 'launched'
      const now = new Date();
      const launchDateObj = new Date(launchDate);
      const shouldBeScheduled = launchDateObj > now;

      // Fetch the product by ID
      const { data: product, error: productError } = await supabaseClient
        .from('products')
        .select('id, slug')
        .eq('id', metadata.product_id)
        .single();

      if (productError || !product) {
        console.error('Error fetching product:', productError);
        throw new Error('Product not found');
      }

      console.log('Updating product:', product.id);
      
      // Update product with launch date and status
      const { error: updateError } = await supabaseClient
        .from('products')
        .update({
          status: shouldBeScheduled ? 'scheduled' : 'launched',
          launch_date: launchDate,
        })
        .eq('id', product.id);

      if (updateError) {
        console.error('Error updating product:', updateError);
        throw updateError;
      }
      
      console.log('Product updated successfully');

      // Create order record
      await supabaseClient
        .from('orders')
        .insert({
          user_id: metadata.user_id,
          product_id: product.id,
          stripe_session_id: session.id,
          plan: metadata.plan,
        });

      console.log('Order and product created successfully');

      // Send confirmation email to product owner
      try {
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(metadata.user_id);
        const { data: productData } = await supabaseClient
          .from('products')
          .select('name')
          .eq('id', product.id)
          .single();
        
        if (authUser?.user?.email && productData?.name) {
          const launchDateFormatted = new Date(launchDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles'
          });

          const productUrl = `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/launch/${product.slug}`;

          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
                  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                  .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                  .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
                  .logo { height: 32px; }
                  .content { padding: 30px; }
                  .content h1 { margin: 0 0 16px 0; font-size: 20px; color: #111; }
                  .content p { margin: 0 0 16px 0; color: #4b5563; }
                  .highlight { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb; }
                  .date { font-size: 18px; font-weight: 600; color: #111; margin: 8px 0 0 0; }
                  .button { display: inline-block; background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
                  ul { color: #4b5563; padding-left: 20px; }
                  li { margin-bottom: 8px; }
                  .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="card">
                    <div class="header">
                      <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                    </div>
                    <div class="content">
                      <h1>Launch Scheduled</h1>
                      <p>Your product <strong>${productData.name}</strong> has been scheduled for launch.</p>
                      <div class="highlight">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Launch Date (PST)</p>
                        <p class="date">${launchDateFormatted}</p>
                      </div>
                      <p><strong>What happens next:</strong></p>
                      <ul>
                        <li>We'll send you a reminder 24 hours before launch</li>
                        <li>On launch day, your product will go live automatically</li>
                        <li>You'll receive an email confirmation when it's live</li>
                      </ul>
                      <p style="text-align: center; margin-top: 24px;">
                        <a href="${productUrl}" class="button">View Your Product</a>
                      </p>
                    </div>
                    <div class="footer">
                      <p>You scheduled a launch on Launch.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: 'Launch <notifications@trylaunch.ai>',
            to: [authUser.user.email],
            subject: `🚀 Launch Scheduled: ${productData.name}`,
            html: emailHtml,
          });

          console.log('Launch confirmation email sent to owner');
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the webhook if email fails
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});