import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'georgec.ignite@gmail.com' // Change this to your domain

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { email, name } = await req.json()
    
    // Send welcome email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Noord Pro <${FROM_EMAIL}>`,
        to: [email],
        subject: 'Welcome to Noord Pro Early Access! 🚀',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(90deg, #1e40af 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Noord Pro</h1>
              <p style="color: white; opacity: 0.9; margin: 5px 0 0 0;">PRO</p>
            </div>
            <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
              <h2>Welcome to the Early Access List! 🎉</h2>
              <p>Hi ${name || 'Trader'},</p>
              <p>Thank you for joining the Noord Pro early access list. You're now on the cutting edge of trading intelligence.</p>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 25px 0;">
                <h3>What to expect:</h3>
                <ul>
                  <li><strong>Launch Notification:</strong> First to know when we go live</li>
                  <li><strong>3 Months Free:</strong> Get extended trial access</li>
                  <li><strong>Exclusive Updates:</strong> Behind-the-scenes development insights</li>
                  <li><strong>Feature Requests:</strong> Help shape the platform</li>
                </ul>
              </div>
              
              <p>In the meantime, you can:</p>
              <ul>
                <li>Follow us on <a href="https://twitter.com/noordpro">Twitter</a> for updates</li>
                <li>Join our <a href="https://discord.gg/noordpro">Discord community</a></li>
                <li>Read our <a href="https://blog.noordpro.com">development blog</a></li>
              </ul>
              
              <p>We're building something special and can't wait to share it with you!</p>
              
              <p style="margin-top: 30px;">Best regards,<br>The Noord Pro Team</p>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p>This email was sent to ${email}. You're receiving this because you signed up for early access at noordpro.com.</p>
                <p><a href="{{{unsubscribe_url}}}">Unsubscribe</a> | <a href="{{{manage_preferences_url}}}">Manage Preferences</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    })

    const result = await resendResponse.json()

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      }
    )
  }
})
