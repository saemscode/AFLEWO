import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/upload-signature
 *
 * Generates a Cloudinary signed upload credential.
 * The client uses this signature to upload files DIRECTLY from the browser
 * to Cloudinary - bypassing the Next.js 4.5MB serverless payload limit.
 *
 * Security: The CLOUDINARY_API_SECRET never leaves this server route.
 */
export async function POST(request: Request) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

  if (!apiSecret || !cloudName || !apiKey) {
    console.error('[upload-signature] Missing Cloudinary env vars');
    return NextResponse.json(
      { error: 'Cloudinary not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const folder: string = body.folder || 'aflewo_general';
    const uploadPreset: string = body.uploadPreset;

    // Whitelist allowed upload folders to prevent abuse
    const allowedFolders = [
      'aflewo_auditions',
      'aflewo_resources',
      'aflewo_media',
    ];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 });
    }

    const timestamp = Math.round(Date.now() / 1000);

    // Build the exact parameter string Cloudinary expects for signing
    const params: Record<string, string | number> = {
      folder,
      timestamp,
    };
    if (uploadPreset) params.upload_preset = uploadPreset;

    // Sort params alphabetically and build key=value string
    const toSign = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    // SHA-1 signature (Cloudinary's required algo for signed uploads)
    const signature = crypto
      .createHash('sha1')
      .update(toSign + apiSecret)
      .digest('hex');

    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder,
      uploadPreset,
    });
  } catch (error) {
    console.error('[upload-signature] Error generating signature:', error);
    return NextResponse.json({ error: 'Failed to generate signature' }, { status: 500 });
  }
}
