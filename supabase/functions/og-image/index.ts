import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return new Response('Missing slug parameter', { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch product data
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        name,
        tagline,
        description,
        slug,
        product_media(url, type)
      `)
      .eq('slug', slug)
      .single()

    if (error || !product) {
      return new Response('Product not found', { status: 404, headers: corsHeaders })
    }

    const thumbnail = product.product_media?.find((m: any) => m.type === 'thumbnail')?.url
    const description = product.tagline || product.description?.substring(0, 160) || ''
    const title = `${product.name} - Launch AI`
    const productUrl = `https://trylaunch.ai/launch/${product.slug}`
    const imageUrl = thumbnail || 'https://trylaunch.ai/social-card.png'

    // Generate HTML with proper meta tags for crawlers
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta property="og:site_name" content="Launch AI">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@Lovable">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  
  <link rel="canonical" href="${escapeHtml(productUrl)}">
  
  <!-- Redirect non-crawlers to the actual page -->
  <script>
    window.location.href = "${escapeHtml(productUrl)}";
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
  </noscript>
</head>
<body>
  <h1>${escapeHtml(product.name || '')}</h1>
  <p>${escapeHtml(description)}</p>
  <a href="${escapeHtml(productUrl)}">View on Launch AI</a>
</body>
</html>`

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
