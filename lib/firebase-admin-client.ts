"use client"

import { getAuth, User } from "firebase/auth";

/**
 * Fetches the custom claims for the current user from Firebase
 * This uses an API route as custom claims are typically only available on the backend
 */
export async function getUserCustomClaims(user: User | null): Promise<any> {
  if (!user) return null;

  try {
    // First, force token refresh to ensure we have the latest claims
    await user.getIdToken(true);
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    // Call our API endpoint to decode and return the claims
    const response = await fetch(`/api/admin/get-custom-claims?uid=${user.uid}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get custom claims: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.claims;
  } catch (error) {
    console.error("Error getting custom claims:", error);
    return null;
  }
}

/**
 * Sets custom claims for a user (requires admin privileges)
 */
export async function setUserCustomClaims(uid: string, claims: any): Promise<boolean> {
  try {
    // Get the current user's ID token to authorize the request
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }
    
    const idToken = await currentUser.getIdToken();
    
    // Call our API endpoint to set the claims
    const response = await fetch('/api/admin/set-custom-claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ uid, claims })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set custom claims: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error setting custom claims:", error);
    return false;
  }
}

/**
 * Helper function to check if a user has a specific role
 */
export function hasRole(claims: any | null, role: string): boolean {
  return claims?.role === role;
}

/**
 * Helper function to check if a user has admin role
 */
export function isAdmin(claims: any | null): boolean {
  return hasRole(claims, 'admin');
}

/**
 * Helper function to check if a user has teacher role
 */
export function isTeacher(claims: any | null): boolean {
  return hasRole(claims, 'teacher');
}
