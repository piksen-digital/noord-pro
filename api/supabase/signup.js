import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured'
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { email, name, source = 'website' } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('early_access_signups')
      .select('email, created_at')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already subscribed',
        data: existing,
        alreadyExists: true
      });
    }

    // Insert new signup
    const { data, error } = await supabase
      .from('early_access_signups')
      .insert([
        {
          email,
          name: name || null,
          source,
          created_at: new Date().toISOString(),
          metadata: {
            userAgent: req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            referer: req.headers.referer || 'direct'
          }
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    // Optional: Send to n8n webhook if configured
    const n8nWebhook = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhook) {
      try {
        await fetch(n8nWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            source,
            timestamp: new Date().toISOString(),
            type: 'early_access_signup'
          })
        });
      } catch (webhookError) {
        console.warn('Failed to send to n8n:', webhookError);
        // Don't fail the request if webhook fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed to early access',
      data
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle Supabase specific errors
    if (error.code === '23505') {
      return res.status(200).json({
        success: true,
        message: 'Already subscribed',
        alreadyExists: true
      });
    }

    return res.status(500).json({
      error: 'Failed to process signup',
      message: error.message || 'An unexpected error occurred'
    });
  }
}
