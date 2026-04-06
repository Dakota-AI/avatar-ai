export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, name, website_url } = req.body || {}

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        website_url: website_url?.trim() || null,
        source: 'landing_page'
      })
    })

    // Unique constraint violation = already signed up
    if (response.status === 409 || response.status === 23505) {
      return res.status(200).json({ success: true, duplicate: true })
    }

    // Supabase returns 201 on insert with Prefer: return=minimal
    if (response.status === 201 || response.status === 200) {
      return res.status(200).json({ success: true })
    }

    const errorText = await response.text()
    // Check for unique violation in error body
    if (errorText.includes('23505') || errorText.includes('unique')) {
      return res.status(200).json({ success: true, duplicate: true })
    }

    console.error('Supabase error:', response.status, errorText)
    return res.status(500).json({ error: 'Failed to save email' })
  } catch (err) {
    console.error('Fetch error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
