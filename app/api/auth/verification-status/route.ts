// app/api/auth/verification-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
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
    
    const userData = userSnapshot.docs[0].data();
    
    return NextResponse.json({
      uid: uid,
      emailVerified: userData.emailVerified || false,
      phoneVerified: userData.phoneVerified || false,
      emailVerifiedAt: userData.emailVerifiedAt,
      phoneVerifiedAt: userData.phoneVerifiedAt,
      lastUpdated: userData.updatedAt
    });
    
  } catch (error: any) {
    console.error("Verification status check error:", error);
    
    return NextResponse.json(
      { error: "Failed to get verification status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, emailVerified, phoneVerified } = await request.json();
    
    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
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
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified;
      if (emailVerified) {
        updateData.emailVerifiedAt = new Date().toISOString();
      }
    }
    
    if (phoneVerified !== undefined) {
      updateData.phoneVerified = phoneVerified;
      if (phoneVerified) {
        updateData.phoneVerifiedAt = new Date().toISOString();
      }
    }
    
    // Update verification status in Firestore
    await updateDoc(doc(db, "students", docId), updateData);
    
    return NextResponse.json({
      success: true,
      message: "Verification status updated successfully",
      uid: uid
    });
    
  } catch (error: any) {
    console.error("Verification status update error:", error);
    
    return NextResponse.json(
      { error: "Failed to update verification status" },
      { status: 500 }
    );
  }
}
