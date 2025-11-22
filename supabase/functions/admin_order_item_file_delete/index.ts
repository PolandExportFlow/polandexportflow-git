import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { S3Client, DeleteObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3'
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

    const { file_id } = await req.json()
    if (!file_id) {
      return new Response(JSON.stringify({ error: 'Missing file_id' }), { status: 400, headers: corsHeaders })
    }
    
    // Pobierz ścieżkę (BEZ sprawdzania właściciela) - tabela: order_items_files
    const { data: row, error } = await supabase
      .from('order_items_files')
      .select('storage_path')
      .eq('id', file_id)
      .maybeSingle()

    if (error) {
      return new Response(JSON.stringify({ error: 'DB Error' }), { status: 500, headers: corsHeaders })
    }

    if (!row) {
      return new Response(JSON.stringify({ success: true, skipped: true }), { status: 200, headers: corsHeaders })
    }

    console.log(`Admin deleting Item File from R2: ${row.storage_path}`)

    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
    })

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_ORDERS,
      Key: row.storage_path,
    })

    await s3Client.send(command)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e: any) {
    console.error('Delete Error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})