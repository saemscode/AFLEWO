import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/mpesa/callback
 *
 * Safaricom calls this URL after an STK Push completes (success or failure).
 * We write the FULL raw payload immediately to donation_ledger (so we NEVER
 * lose a donation record), then parse the receipt and update status.
 *
 * This endpoint must be publicly accessible - no auth header required.
 * Register it in Safaricom Developer Portal as your callback URL.
 *
 * Important: Respond with 200 OK within 5 seconds or Safaricom retries.
 */
export async function POST(request: Request) {
  // Use service role key to bypass RLS on the webhook write
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let rawBody: Record<string, unknown> = {};

  try {
    rawBody = await request.json();
  } catch {
    // Malformed JSON - still return 200 to stop retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  try {
    const body = rawBody?.Body as Record<string, unknown> | undefined;
    const stkCallback = body?.stkCallback as Record<string, unknown> | undefined;

    const resultCode = stkCallback?.ResultCode;
    const checkoutRequestId = stkCallback?.CheckoutRequestID as string | undefined;
    const merchantRequestId = stkCallback?.MerchantRequestID as string | undefined;

    if (!checkoutRequestId) {
      console.error('[mpesa/callback] Missing CheckoutRequestID');
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const isSuccess = resultCode === 0;

    // Extract payment details from CallbackMetadata (only present on success)
    let amount: number | null = null;
    let mpesaReceipt: string | null = null;
    let phoneNumber: string | null = null;

    if (isSuccess) {
      const metadata = stkCallback?.CallbackMetadata as Record<string, unknown> | undefined;
      const items = (metadata?.Item as Array<{ Name: string; Value: unknown }>) || [];

      for (const item of items) {
        if (item.Name === 'Amount') amount = Number(item.Value);
        if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = String(item.Value);
        if (item.Name === 'PhoneNumber') phoneNumber = String(item.Value);
      }
    }

    // Upsert: first try to find existing pending record by checkoutRequestId
    const { data: existing } = await supabase
      .from('donation_ledger')
      .select('id')
      .eq('mpesa_request_id', checkoutRequestId)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('donation_ledger')
        .update({
          status: isSuccess ? 'completed' : 'failed',
          mpesa_receipt: mpesaReceipt,
          amount_kes: amount,
          phone_number: phoneNumber,
          raw_callback: rawBody as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new record (webhook arrived before STK push was logged)
      await supabase.from('donation_ledger').insert({
        mpesa_request_id: checkoutRequestId,
        mpesa_receipt: mpesaReceipt,
        amount_kes: amount,
        phone_number: phoneNumber,
        status: isSuccess ? 'completed' : 'failed',
        account_ref: merchantRequestId || 'AFLEWO',
        raw_callback: rawBody,
      });
    }

    // Acknowledge to Safaricom immediately
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  } catch (error) {
    console.error('[mpesa/callback] Processing error:', error);
    // ALWAYS return 200 - never let a bug cause Safaricom to retry indefinitely
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
