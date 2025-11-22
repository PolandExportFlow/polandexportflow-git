import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const R2_ACCESS_KEY = Deno.env.get('R2_ACCESS_KEY')!
const R2_SECRET_KEY = Deno.env.get('R2_SECRET_KEY')!
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!
const R2_BUCKET_ORDERS = Deno.env.get('R2_BUCKET_ORDERS')!

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { headers: corsHeaders, status: 401 })
    }

    const { storage_path, file_size, mime_type, order_id } = await req.json()

    if (!storage_path || !file_size || !mime_type || !order_id) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { headers: corsHeaders, status: 400 })
    }

    if (file_size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large' }), { headers: corsHeaders, status: 400 })
    }

    if (!ALLOWED_MIME_PREFIXES.some(prefix => mime_type.startsWith(prefix))) {
      return new Response(JSON.stringify({ error: 'File type not allowed' }), { headers: corsHeaders, status: 400 })
    }

    // Sprawdź czy user jest właścicielem zamówienia
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', order_id)
      .single()

    if (orderError || !orderRow || orderRow.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { headers: corsHeaders, status: 403 })
    }

    const fileName = storage_path.split('/').pop() || 'file'

    // ATOMIC INSERT (order_files)
    const { error: dbInsertError } = await supabase
      .from('order_files')
      .insert({
        order_id: order_id,
        user_id: user.id,
        storage_path: storage_path,
        file_name: fileName,
        file_size: file_size,
        mime_type: mime_type,
        status: 'uploaded', 
      })

    if (dbInsertError) {
      console.error('DB Insert Error:', dbInsertError)
      return new Response(JSON.stringify({ error: 'Database insert failed' }), { headers: corsHeaders, status: 500 })
    }

    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
      signingService: 's3',
      forcePathStyle: true,
    })

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_ORDERS,
      Key: storage_path,
      ContentType: mime_type,
      ContentSha256: 'UNSIGNED-PAYLOAD',
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return new Response(
      JSON.stringify({
        presignedUrl,
        orderId: order_id,
        storagePath: storage_path,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (e: any) {
    console.error('Upload Generate Error:', e)
    return new Response(
      JSON.stringify({ error: `EF Error: ${e.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})