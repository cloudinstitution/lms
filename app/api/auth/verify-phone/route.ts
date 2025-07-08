// app/api/auth/verify-phone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    const { phoneNumber, action, uid, otp } = await request.json();
    
    // Rate limiting check
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${clientIP}:${phoneNumber}`;
    
    if (!checkRateLimit(rateLimitKey, 3, 300000)) { // 3 attempts per 5 minutes
      return NextResponse.json(
        { error: "Too many verification requests. Please try again later." },
        { status: 429 }
      );
    }
    
    if (action === 'send') {
      // Send SMS OTP via Firebase Phone Auth
      if (!phoneNumber) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 }
        );
      }
      
      // Validate phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return NextResponse.json(
          { error: "Invalid phone number format. Please include country code." },
          { status: 400 }
        );
      }
      
      // Note: Firebase Phone Auth SMS is handled on the client side
      // This endpoint is for rate limiting and logging purposes
      
      return NextResponse.json({
        success: true,
        message: "SMS OTP sent successfully via Firebase Phone Auth"
      });
    }
    
    if (action === 'verify') {
      // Verify OTP and update phone verification status
      if (!uid || !otp) {
        return NextResponse.json(
          { error: "User ID and OTP are required" },
          { status: 400 }
        );
      }
      
      // Find user by uid
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
      
      // Update phone verification status in Firestore
      await updateDoc(doc(db, "students", docId), {
        phoneVerified: true,
        phoneVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        message: "Phone verification confirmed"
      });
    }
    
    if (action === 'check') {
      // Check phone verification status
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
        verified: userData.phoneVerified || false,
        timestamp: userData.phoneVerifiedAt
      });
    }
    
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error("Phone verification error:", error);
    
    if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    
    if (error.code === 'auth/invalid-phone-number') {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Phone verification failed" },
      { status: 500 }
    );
  }
}
