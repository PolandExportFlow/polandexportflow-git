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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: corsHeaders })
    }

    const { file_id } = await req.json()
    if (!file_id) {
        return new Response(JSON.stringify({ error: 'Missing file_id' }), { headers: corsHeaders, status: 400 })
    }

    let storagePath = ''

    // KROK 1: Szukamy w plikach przedmiotów (order_items_files)
    const { data: itemFile } = await supabase
      .from('order_items_files')
      .select('storage_path, item:order_items!inner(order:orders!inner(user_id))')
      .eq('id', file_id)
      .maybeSingle()

    if (itemFile) {
       // Znaleziono w przedmiotach - sprawdzamy uprawnienia
       // @ts-ignore
       if (itemFile.item?.order?.user_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
       }
       storagePath = itemFile.storage_path
    } 
    else {
       // KROK 2: Nie znaleziono w przedmiotach, szukamy w plikach ogólnych (order_files)
       const { data: orderFile } = await supabase
         .from('order_files')
         .select('storage_path, user_id')
         .eq('id', file_id)
         .maybeSingle()
         
       if (orderFile) {
          // Znaleziono w ogólnych - sprawdzamy uprawnienia
          if (orderFile.user_id !== user.id) {
             return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
          }
          storagePath = orderFile.storage_path
       }
    }

    // Jeśli w żadnej tabeli nie znaleziono ścieżki
    if (!storagePath) {
        return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: corsHeaders })
    }

    // KROK 3: Generujemy link do R2
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
    console.error('Get URL Error:', e)
    return new Response(
      JSON.stringify({ error: `EF Error: ${e.message}` }),
      { status: 500, headers: corsHeaders }
    )
  }
})