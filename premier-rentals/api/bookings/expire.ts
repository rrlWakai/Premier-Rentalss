import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason: 'auto-expired',
    })
    .eq('status', 'pending')
    .eq('payment_status', 'unpaid')
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.setHeader('Cache-Control', 'no-store, no-cache')
  return res.status(200).json({
    expired: data?.length ?? 0,
    ids: data?.map((r) => r.id) ?? [],
  })
}
