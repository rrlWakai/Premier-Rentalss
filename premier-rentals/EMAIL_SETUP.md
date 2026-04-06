# Email Receipt Setup Guide

This guide walks you through setting up automated email receipts for bookings using **Resend**.

## What's Implemented ✅

When a customer completes payment for a booking:
1. Payment is processed by PayMongo
2. Webhook receives payment confirmation
3. **Booking receipt email is automatically sent to customer's Gmail** (or any email address)
4. Receipt includes:
   - Guest information
   - Booking details (property, date, type)
   - Payment summary (total, down payment, remaining balance)
   - Booking confirmation ID

---

## Setup Instructions

### Step 1: Install Dependencies

Run this command to install Resend:

```bash
npm install
```

This will install `resend@^3.0.0` that was added to package.json.

### Step 2: Create Resend Account & Get API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to **API Keys** in your dashboard
4. Copy your **API Key** (starts with `re_`)
5. Keep this key safe - it's sensitive!

### Step 3: Configure Environment Variables

Add these variables to your deployment platform (Vercel, Netlify, or wherever you deploy):

**For Vercel:**
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add the following:

```
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=bookings@resend.dev
```

**For Local Development (.env file):**
Create a `.env.local` file in your project root (if it doesn't exist):

```env
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=bookings@resend.dev
```

> **Note:** `RESEND_FROM_EMAIL` can be:
> - The default Resend domain: `bookings@resend.dev`
> - Your custom domain (requires DNS verification in Resend dashboard)
> - Your business email (requires domain verification)

### Step 4: Test Email Sending

Once deployed, test by:
1. Creating a test booking on your website
2. Complete the payment flow
3. Check the customer's email for the receipt

If emails don't arrive, check:
- Resend dashboard → **Logs** for sending status
- Spam/Junk folder in email client
- `RESEND_API_KEY` is correctly set

### Step 5: Customize Email Template (Optional)

Edit the email template in `api/_shared/email.ts`:

- **Modify colors/branding:** Update CSS in `generateReceiptHTML()` function
- **Add your company details:** Update footer section
- **Change email subject:** Modify `subject` parameter in `sendBookingReceipt()`
- **Add company logo:** Modify the header section (add an `<img>` tag)

---

## How It Works

### File Structure

```
api/_shared/email.ts          # Email service & template
api/webhook/paymongo.ts       # Updated to trigger email on payment success
```

### Email Trigger Flow

```
Customer completes payment
        ↓
PayMongo webhook event received
        ↓
Verify webhook signature
        ↓
Mark payment as confirmed
        ↓
Fetch booking + property details
        ↓
Send receipt email via Resend
        ↓
Email arrives in customer's inbox!
```

---

## Pricing

**Resend Free Tier:**
- ✅ 100 emails/day
- ✅ Perfect for testing & small businesses
- ✅ No credit card required

**Paid Tiers:**
- Starting at $20/month for higher volume
- Pay-per-email option also available

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_xxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Email sender address | `bookings@yourdomain.com` |

---

## Troubleshooting

### Problem: Emails not sending

**Solution:**
1. Verify `RESEND_API_KEY` is set and valid
2. Check Resend dashboard **Logs** tab
3. Ensure the recipient email is valid
4. Check spam/junk folder

### Problem: Invalid API Key error

**Solution:**
1. Double-check key is copied exactly from Resend dashboard
2. Ensure no extra spaces in environment variable
3. Regenerate API key if uncertain

### Problem: Emails going to spam

**Solution:**
1. Verify email domain is set up in Resend
2. Enable DKIM authentication in Resend dashboard
3. Configure SPF/DMARC records (Resend provides guide)

---

## Production Checklist

- [ ] Resend account created
- [ ] API key generated and stored securely
- [ ] Environment variables configured in your deployment platform
- [ ] Test email received successfully
- [ ] Email template branding verified
- [ ] Spam folder checked for test emails

---

## Security Notes

🔒 **API Key Protection:**
- Never commit `.env` or API keys to version control
- Always use environment variables for sensitive data
- Rotate API keys periodically
- Delete old API keys from Resend dashboard

🔒 **Data:**
- Booking data is only fetched from Supabase
- Emails sent only to customer-provided addresses
- No data stored in Resend beyond sending

---

## Support

For Resend support: [https://resend.com/support](https://resend.com/support)
For project support: Check logs in your deployment platform

