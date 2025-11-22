import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from 'https://esm.sh/@aws-sdk/client-s3'
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

// Helper do sprawdzania UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: corsHeaders })

    const { lookup } = await req.json()

    // 🛑 POPRAWKA: Inteligentne szukanie (naprawia błąd UUID vs Text)
    let query = supabase.from('orders').select('id, order_number, user_id')
    
    if (UUID_REGEX.test(lookup)) {
        query = query.eq('id', lookup)
    } else {
        query = query.eq('order_number', lookup)
    }

    const { data: orderData, error: orderErr } = await query.single()

    if (orderErr || !orderData) {
        console.error('Order lookup failed:', orderErr)
        return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    if (orderData.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    // 2. Wyczyść R2 (wszystko z prefixem numeru zamówienia)
    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
      signingService: 's3',
      forcePathStyle: true,
    })

    const prefix = `${orderData.order_number}/`;
    console.log(`Cleaning up R2 prefix: ${prefix}`)
    
    let continuationToken;
    do {
        const listCmd = new ListObjectsV2Command({
            Bucket: R2_BUCKET_ORDERS,
            Prefix: prefix,
            ContinuationToken: continuationToken
        });
        const listRes = await s3Client.send(listCmd);
        
        if (listRes.Contents && listRes.Contents.length > 0) {
            const objectsToDelete = listRes.Contents.map(obj => ({ Key: obj.Key }));
            const deleteCmd = new DeleteObjectsCommand({
                Bucket: R2_BUCKET_ORDERS,
                Delete: { Objects: objectsToDelete }
            });
            await s3Client.send(deleteCmd);
            console.log(`Deleted ${objectsToDelete.length} files.`);
        }
        continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    // 3. Wywołaj SQL Delete
    const { error: rpcError } = await supabase.rpc('user_order_delete', {
        p_lookup: lookup
    })

    if (rpcError) {
        console.error('RPC Delete Error:', rpcError)
        return new Response(JSON.stringify({ error: rpcError.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e: any) {
    console.error('Full Delete Error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})