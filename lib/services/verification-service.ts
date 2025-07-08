// lib/services/verification-service.ts
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
}

export class VerificationService {
  /**
   * Check email verification status from Firestore
   */
  static async checkEmailVerification(uid: string): Promise<boolean> {
    try {
      const studentDoc = await getDoc(doc(db, "students", uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        return data.emailVerified || false;
      }
      return false;
    } catch (error) {
      console.error("Error checking email verification:", error);
      return false;
    }
  }

  /**
   * Check phone verification status from Firestore
   */
  static async checkPhoneVerification(uid: string): Promise<boolean> {
    try {
      const studentDoc = await getDoc(doc(db, "students", uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        return data.phoneVerified || false;
      }
      return false;
    } catch (error) {
      console.error("Error checking phone verification:", error);
      return false;
    }
  }

  /**
   * Update verification status in Firestore
   */
  static async updateVerificationStatus(
    uid: string, 
    type: 'email' | 'phone', 
    verified: boolean = true
  ): Promise<void> {
    try {
      const updateData: any = {};
      updateData[`${type}Verified`] = verified;
      
      if (verified) {
        updateData[`${type}VerifiedAt`] = new Date().toISOString();
      }

      await updateDoc(doc(db, "students", uid), updateData);
    } catch (error) {
      console.error(`Error updating ${type} verification status:`, error);
      throw error;
    }
  }

  /**
   * Get complete verification status
   */
  static async getVerificationStatus(uid: string): Promise<VerificationStatus> {
    try {
      const studentDoc = await getDoc(doc(db, "students", uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        return {
          emailVerified: data.emailVerified || false,
          phoneVerified: data.phoneVerified || false,
          emailVerifiedAt: data.emailVerifiedAt,
          phoneVerifiedAt: data.phoneVerifiedAt
        };
      }
      return {
        emailVerified: false,
        phoneVerified: false
      };
    } catch (error) {
      console.error("Error getting verification status:", error);
      return {
        emailVerified: false,
        phoneVerified: false
      };
    }
  }
}
