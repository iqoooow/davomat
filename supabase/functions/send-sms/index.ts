import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const ESKIZ_TOKEN_URL = 'https://notify.eskiz.uz/api/auth/login'
const ESKIZ_SMS_URL = 'https://notify.eskiz.uz/api/message/sms/send'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Authenticate with Eskiz and get a bearer token. */
async function getEskizToken(email: string, password: string): Promise<string> {
  const formData = new FormData()
  formData.append('email', email)
  formData.append('password', password)

  const res = await fetch(ESKIZ_TOKEN_URL, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Eskiz auth failed: ${res.status} ${text}`)
  }

  const json = await res.json()
  const token = json?.data?.token
  if (!token) throw new Error('Eskiz token not found in response')
  return token
}

/** Send a single SMS via Eskiz. */
async function sendEskizSms(
  token: string,
  phone: string,
  message: string,
  from: string
): Promise<void> {
  const formData = new FormData()
  formData.append('mobile_phone', phone)
  formData.append('message', message)
  formData.append('from', from)

  const res = await fetch(ESKIZ_SMS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Eskiz SMS failed: ${res.status} ${text}`)
  }

  const json = await res.json()
  if (json?.status !== 'waiting' && json?.id === undefined) {
    // Eskiz returns { id, status: "waiting" } on success
    throw new Error(`Eskiz SMS unexpected response: ${JSON.stringify(json)}`)
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate request
    const { phone, message } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'phone va message majburiy' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get secrets from environment
    const eskizEmail = Deno.env.get('ESKIZ_EMAIL')
    const eskizPassword = Deno.env.get('ESKIZ_PASSWORD')
    const eskizFrom = Deno.env.get('ESKIZ_FROM') || '4546'

    if (!eskizEmail || !eskizPassword) {
      throw new Error('ESKIZ_EMAIL yoki ESKIZ_PASSWORD environment variable topilmadi')
    }

    // Normalize phone: remove non-digits
    const normalizedPhone = phone.replace(/[^0-9]/g, '')

    // Auth + send
    const token = await getEskizToken(eskizEmail, eskizPassword)
    await sendEskizSms(token, normalizedPhone, message, eskizFrom)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-sms edge function error:', err)
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
