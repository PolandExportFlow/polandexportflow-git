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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { storage_path, file_size, mime_type, item_id } = await req.json()

    if (!storage_path || !file_size || !mime_type || !item_id) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders })
    }

    const fileName = storage_path.split('/').pop() || 'file'

    // INSERT do bazy (Jako Admin) - tabela: order_items_files
    const { error: dbInsertError } = await supabase
      .from('order_items_files')
      .insert({
        item_id: item_id,
        user_id: user.id, // ID Admina
        storage_path: storage_path,
        file_name: fileName,
        file_size: file_size,
        mime_type: mime_type,
        status: 'uploaded', 
      })

    if (dbInsertError) {
      console.error('DB Insert Error:', dbInsertError)
      return new Response(JSON.stringify({ error: 'Database insert failed' }), { status: 500, headers: corsHeaders })
    }

    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
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
      JSON.stringify({ presignedUrl, itemId: item_id, storagePath: storage_path }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e: any) {
    console.error('Upload Generate Error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})