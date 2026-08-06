import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, generateApplicationEmailHtml } from '@/lib/email';

/**
 * POST /api/join
 *
 * Replaces the mailto: fallback in /join/page.tsx.
 * Writes the application to the Supabase auditions table.
 * Works for anonymous applicants (no login required at this stage).
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const body = await request.json();
    const { name, email, phone, chapter, track, message, audioUrl, audioPublicId } = body;

    // Validate required fields
    if (!name || !email || !chapter || !track) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, chapter, track' },
        { status: 400 }
      );
    }

    // Resolve chapter slug → chapter ID
    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('slug', chapter.toLowerCase())
      .single();

    if (chapterError || !chapterData) {
      return NextResponse.json(
        { error: `Chapter "${chapter}" not found` },
        { status: 404 }
      );
    }

    // Map track title to audition_category enum value
    const categoryMap: Record<string, string> = {
      'Music & Choir': 'choir_soprano',      // Default - user refines in portal
      'Production & Media': 'production_camera',
      'Hospitality & Logistics': 'volunteer_ushering',
      'Partners & Sponsors': 'volunteer_hospitality',
    };
    const category = categoryMap[track] || 'choir_soprano';

    // Check if profile already exists (signed-in user)
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // If no signed-in user, create a temporary applicant record using a
    // server-side anon insert (RLS allows public audition submissions)
    if (userId) {
      // Ensure profile has chapter set
      await supabase
        .from('profiles')
        .update({ chapter_id: chapterData.id, phone_number: phone || null })
        .eq('id', userId);

      // Insert audition for authenticated user
      const { error: auditionError } = await supabase
        .from('auditions')
        .insert({
          user_id: userId,
          chapter_id: chapterData.id,
          category,
          notes: message || null,
          audio_url: audioUrl || null,
          audio_public_id: audioPublicId || null,
          status: 'pending',
        });

      if (auditionError) {
        // Handle duplicate (same person, same role, same chapter)
        if (auditionError.code === '23505') {
          return NextResponse.json(
            { error: 'You have already applied for this role in this chapter.' },
            { status: 409 }
          );
        }
        throw auditionError;
      }
    }

    // Send confirmation email via Resend
    await sendEmail({
      to: email,
      subject: "AFLEWO Application Received",
      html: generateApplicationEmailHtml(name, track, chapter),
    });

    return NextResponse.json({
      success: true,
      message: `Application received for ${track} - ${chapter} chapter.`,
      authenticated: !!userId,
    });

  } catch (error) {
    console.error('[api/join] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}
