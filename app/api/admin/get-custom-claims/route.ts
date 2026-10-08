import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase credentials.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export async function GET(request: NextRequest) {
  try {
    initFirebaseAdmin(); // only runs when the route is actually called, not at build

    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const user = await admin.auth().getUser(uid);
    const customClaims = user.customClaims || {};

    return NextResponse.json({
      success: true,
      claims: customClaims,
      role: customClaims.role || null,
    });
  } catch (error) {
    console.error('Error getting custom claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get custom claims' },
      { status: 500 }
    );
  }
}
