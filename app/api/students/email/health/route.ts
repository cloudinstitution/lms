import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin if it hasn't been already
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (initError) {
    console.error('Firebase Admin initialization failed:', initError);
  }
}

export async function GET(request: NextRequest) {
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      status: 'checking...',
      checks: {
        resendApiKey: {
          configured: !!process.env.RESEND_API_KEY,
          keyLength: process.env.RESEND_API_KEY?.length || 0,
          keyPreview: process.env.RESEND_API_KEY ? 
            `${process.env.RESEND_API_KEY.substring(0, 8)}...` : 'not set'
        },
        firebase: {
          projectId: {
            configured: !!process.env.FIREBASE_PROJECT_ID,
            value: process.env.FIREBASE_PROJECT_ID || 'not set'
          },
          clientEmail: {
            configured: !!process.env.FIREBASE_CLIENT_EMAIL,
            value: process.env.FIREBASE_CLIENT_EMAIL ? 
              `${process.env.FIREBASE_CLIENT_EMAIL.substring(0, 20)}...` : 'not set'
          },
          privateKey: {
            configured: !!process.env.FIREBASE_PRIVATE_KEY,
            hasNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\n') || false,
            length: process.env.FIREBASE_PRIVATE_KEY?.length || 0
          }
        },
        firebaseAdmin: {
          appsInitialized: admin.apps.length,
          canConnectToFirestore: false,
          documentsFound: undefined as number | undefined,
          firestoreError: undefined as string | undefined
        }
      }
    };

    // Test Firestore connection
    try {
      const db = admin.firestore();
      const testCollection = db.collection('students');
      const snapshot = await testCollection.limit(1).get();
      healthCheck.checks.firebaseAdmin.canConnectToFirestore = true;
      healthCheck.checks.firebaseAdmin.documentsFound = snapshot.size;
    } catch (firestoreError) {
      healthCheck.checks.firebaseAdmin.firestoreError = firestoreError instanceof Error ? 
        firestoreError.message : 'Unknown Firestore error';
    }

    // Determine overall status
    const allChecksPass = 
      healthCheck.checks.resendApiKey.configured &&
      healthCheck.checks.firebase.projectId.configured &&
      healthCheck.checks.firebase.clientEmail.configured &&
      healthCheck.checks.firebase.privateKey.configured &&
      healthCheck.checks.firebaseAdmin.canConnectToFirestore;

    healthCheck.status = allChecksPass ? 'healthy' : 'unhealthy';

    return NextResponse.json(healthCheck);

  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown health check error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
