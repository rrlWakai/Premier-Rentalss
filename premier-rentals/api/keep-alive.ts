import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 🔥 disable caching completely
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  // 🔥 read dynamic query (optional)
  const timestamp = req.query.ts || new Date().toISOString()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  const { error } = await supabase
    .from('bookings')
    .select('*')
    .limit(1)

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      ts: timestamp
    })
  }

  return res.status(200).json({
    success: true,
    ts: timestamp
  })
}