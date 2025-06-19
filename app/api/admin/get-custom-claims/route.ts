import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been already
if (!admin.apps.length) {
  // You should use environment variables for these values in production
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key needs to have newlines replaced
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
