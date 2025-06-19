import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been already
if (!admin.apps.length) {
  // Make sure all required fields are present
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Missing Firebase credentials. Check that all environment variables are set: 
      FIREBASE_PROJECT_ID: ${projectId ? 'Set' : 'Missing'}, 
      FIREBASE_CLIENT_EMAIL: ${clientEmail ? 'Set' : 'Missing'}, 
      FIREBASE_PRIVATE_KEY: ${privateKey ? 'Set' : 'Missing'}`
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// Endpoint to get a user's custom claims
export async function GET(request: NextRequest) {
  try {
    // Get the user ID from the URL parameter
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    
    // Get the user's custom claims
    const user = await admin.auth().getUser(uid);
    const customClaims = user.customClaims || {};
    
    // Return the claims
    return NextResponse.json({ 
      success: true, 
      claims: customClaims,
      role: customClaims.role || null 
    });
    
  } catch (error) {
    console.error('Error getting custom claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get custom claims' }, 
      { status: 500 }
    );
  }
}
