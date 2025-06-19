// This is a server-side function that sets custom claims for Firebase users
// It requires Firebase Admin SDK which should be initialized server-side only

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
    // If you're using other Firebase services like Storage, include them here
    // storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

// Define types for the request body
interface SetCustomClaimsBody {
  uid: string;
  claims: {
    role: 'admin' | 'teacher';
    [key: string]: any; // Allow for additional claims
  };
}

// Endpoint to set custom claims for a user
export async function POST(request: NextRequest) {
  try {
    // Verify that the request is from an authenticated admin user
    // In a real app, this would include validating the requesting user's token
    // to ensure they are an admin
    
    // Parse the request body
    const body = await request.json() as SetCustomClaimsBody;
    const { uid, claims } = body;
    
    // Validate required fields
    if (!uid || !claims || !claims.role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Set the custom claims on the user
    await admin.auth().setCustomUserClaims(uid, claims);
    
    // Return success response
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set custom claims' }, 
      { status: 500 }
    );
  }
}
