import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { S3Client, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3'
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

    // 1. Sprawdzenie czy to Admin (uproszczone - sprawdza czy zalogowany)
    // W produkcji powinieneś tu sprawdzić np. if (user.role !== 'admin') return 401
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { file_id } = await req.json()
    if (!file_id) {
        return new Response(JSON.stringify({ error: 'Missing file_id' }), { headers: corsHeaders, status: 400 })
    }

    let storagePath = ''

    // 2. Szukamy w plikach PRZEDMIOTÓW
    const { data: itemFile } = await supabase
      .from('order_items_files')
      .select('storage_path') // Admin nie potrzebuje sprawdzać user_id, więc select jest prostszy
      .eq('id', file_id)
      .maybeSingle()

    if (itemFile) {
       storagePath = itemFile.storage_path
    } else {
       // 3. Szukamy w plikach OGÓLNYCH
       const { data: orderFile } = await supabase
         .from('order_files')
         .select('storage_path')
         .eq('id', file_id)
         .maybeSingle()
         
       if (orderFile) {
          storagePath = orderFile.storage_path
       }
    }

    if (!storagePath) {
        return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: corsHeaders })
    }

    // 4. Generowanie linku
    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    })

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_ORDERS,
      Key: storagePath,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return new Response(
      JSON.stringify({ url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (e: any) {
    console.error('Admin Get URL Error:', e)
    return new Response(
      JSON.stringify({ error: `EF Error: ${e.message}` }),
      { status: 500, headers: corsHeaders }
    )
  }
})