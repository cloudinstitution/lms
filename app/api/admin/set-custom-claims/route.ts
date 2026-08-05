import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

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

interface SetCustomClaimsBody {
  uid: string;
  claims: {
    role: 'admin' | 'teacher';
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin(); // runs only when the route is actually called

    const body = await request.json() as SetCustomClaimsBody;
    const { uid, claims } = body;

    if (!uid || !claims || !claims.role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await admin.auth().setCustomUserClaims(uid, claims);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set custom claims' },
      { status: 500 }
    );
  }
}
