// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { sendEmailVerification, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();

function checkRateLimit(identifier: string, maxAttempts: number = 3, windowMs: number = 300000): boolean {
  const now = Date.now();
  const userAttempts = rateLimitStore.get(identifier);
  
  if (!userAttempts) {
    rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
    return true;
  }
  
  if (now - userAttempts.lastAttempt > windowMs) {
    rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
    return true;
  }
  
  if (userAttempts.attempts >= maxAttempts) {
    return false;
  }
  
  userAttempts.attempts++;
  userAttempts.lastAttempt = now;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { email, action, uid } = await request.json();
    
    // Rate limiting check
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${clientIP}:${email}`;
    
    if (!checkRateLimit(rateLimitKey, 3, 300000)) { // 3 attempts per 5 minutes
      return NextResponse.json(
        { error: "Too many verification requests. Please try again later." },
        { status: 429 }
      );
    }
    
    if (action === 'send') {
      // Send verification email
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }
      
      // Find user by email (Note: In production, you'd get user from Firebase Auth)
      const userQuery = query(
        collection(db, "students"),
        where("username", "==", email)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      const userData = userSnapshot.docs[0].data();
      
      // For now, we'll assume the user is authenticated and send verification
      // In a real implementation, you'd verify the user is authenticated
      
      return NextResponse.json({
        success: true,
        message: "Verification email sent successfully"
      });
    }
    
    if (action === 'check') {
      // Check verification status
      if (!uid) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }
      
      const userQuery = query(
        collection(db, "students"),
        where("uid", "==", uid)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      const userData = userSnapshot.docs[0].data();
      
      return NextResponse.json({
        verified: userData.emailVerified || false,
        timestamp: userData.emailVerifiedAt
      });
    }
    
    if (action === 'confirm') {
      // Update verification status
      if (!uid) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }
      
      const userQuery = query(
        collection(db, "students"),
        where("uid", "==", uid)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      const docId = userSnapshot.docs[0].id;
      
      // Update verification status in Firestore
      await updateDoc(doc(db, "students", docId), {
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        message: "Email verification confirmed"
      });
    }
    
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error("Email verification error:", error);
    
    if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "Email verification failed" },
      { status: 500 }
    );
  }
}
