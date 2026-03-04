import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, tagline, description, domain_url, forum_thread_url')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Skip if already has a forum thread
    if (product.forum_thread_url) {
      console.log(`Product ${product.id} already has forum thread: ${product.forum_thread_url}`);
      return new Response(
        JSON.stringify({ forum_thread_url: product.forum_thread_url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const discourseUrl = Deno.env.get('DISCOURSE_FORUM_URL');
    const discourseApiKey = Deno.env.get('DISCOURSE_API_KEY');

    if (!discourseUrl || !discourseApiKey) {
      console.error('Discourse configuration missing');
      return new Response(
        JSON.stringify({ error: 'Forum configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const productUrl = `https://trylaunch.ai/launch/${product.slug}`;
    const description = product.description
      ? product.description.substring(0, 500) + (product.description.length > 500 ? '...' : '')
      : product.tagline || '';

    const topicBody = `## ${product.name}\n\n${product.tagline || ''}\n\n${description}\n\n**🔗 [View on Launch](${productUrl})**${product.domain_url ? `\n**🌐 [Visit Website](${product.domain_url})**` : ''}\n\n---\n\nWhat do you think? Share your feedback, questions, or suggestions below! 💬`;

    // Create Discourse topic in "Show Launch" category
    // Category ID for "Show Launch" needs to be configured - we'll use category name lookup
    // First, try to find the "Show Launch" category
    const categoryResponse = await fetch(`${discourseUrl}/categories.json`, {
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': 'system',
      },
    });

    let categoryId = null;
    if (categoryResponse.ok) {
      const categoriesData = await categoryResponse.json();
      const showLaunchCategory = categoriesData.category_list?.categories?.find(
        (c: any) => c.name === 'Show Launch' || c.slug === 'show-launch'
      );
      categoryId = showLaunchCategory?.id;
    }

    if (!categoryId) {
      console.warn('Show Launch category not found in Discourse, using default category');
      categoryId = 1; // Uncategorized fallback
    }

    // Create the topic
    const createTopicResponse = await fetch(`${discourseUrl}/posts.json`, {
      method: 'POST',
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': 'system',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${product.name} - ${product.tagline || 'New Launch'}`,
        raw: topicBody,
        category: categoryId,
      }),
    });

    if (!createTopicResponse.ok) {
      const errorText = await createTopicResponse.text();
      console.error(`Discourse API error [${createTopicResponse.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create forum thread' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const topicData = await createTopicResponse.json();
    const forumThreadUrl = `${discourseUrl}/t/${topicData.topic_slug}/${topicData.topic_id}`;

    console.log(`Created forum thread for ${product.name}: ${forumThreadUrl}`);

    // Save the forum thread URL to the product
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ forum_thread_url: forumThreadUrl })
      .eq('id', product.id);

    if (updateError) {
      console.error('Failed to save forum thread URL:', updateError);
    }

    return new Response(
      JSON.stringify({ forum_thread_url: forumThreadUrl, topic_id: topicData.topic_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error creating forum thread:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
