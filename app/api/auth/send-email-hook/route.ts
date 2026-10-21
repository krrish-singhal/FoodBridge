import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/nodemailer'

// This endpoint receives Supabase Auth Webhooks for Custom Email Sending
// It bypasses the Supabase 2 emails/hour limit by processing it on your own server.
export async function POST(req: NextRequest) {
  try {
    // 1. Verify a secret header to ensure this request came from your Supabase project
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { user, email_data } = body

    if (!user || !user.email) {
      return NextResponse.json({ error: 'No user email provided' }, { status: 400 })
    }

    // Determine what kind of email Supabase is trying to send
    const subject = email_data?.subject || 'Message from FoodBridge'
    
    // Construct an HTML template (you can customize this based on email_data.token_hash etc)
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Hello ${user.user_metadata?.full_name || ''},</h2>
        <p>Here is your action link from FoodBridge:</p>
        <p><a href="${email_data?.confirmation_url || email_data?.recovery_url || '#'}" style="display:inline-block; padding:10px 20px; background-color:#16a34a; color:white; text-decoration:none; border-radius:5px;">Click Here</a></p>
        <hr />
        <p style="font-size: 12px; color: gray;">If the button above does not work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: gray;">${email_data?.confirmation_url || email_data?.recovery_url || ''}</p>
      </div>
    `

    const result = await sendEmail({
      to: user.email,
      subject,
      html,
    })

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
