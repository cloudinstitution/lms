// lib/services/auth-service.ts
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export class AuthService {
  /**
   * Create user with email and password, then send verification email
   */
  static async createUserWithEmailVerification(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      return userCredential;
    } catch (error) {
      console.error("Error creating user with email verification:", error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  }

  /**
   * Setup phone authentication - Firebase handles SMS automatically
   */
  static async setupPhoneAuth(phoneNumber: string): Promise<ConfirmationResult> {
    try {
      // Create RecaptchaVerifier for phone auth
      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log("reCAPTCHA verified:", response);
        },
        'expired-callback': () => {
          console.log("reCAPTCHA expired");
        }
      });

      // Send SMS OTP via Firebase (no external SMS service needed)
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return confirmationResult;
    } catch (error) {
      console.error("Error setting up phone auth:", error);
      throw error;
    }
  }

  /**
   * Verify phone OTP
   */
  static async verifyPhoneOTP(confirmationResult: ConfirmationResult, otp: string) {
    try {
      const result = await confirmationResult.confirm(otp);
      return result;
    } catch (error) {
      console.error("Error verifying phone OTP:", error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser() {
    return auth.currentUser;
  }

  /**
   * Check if user's email is verified
   */
  static isEmailVerified(): boolean {
    const user = auth.currentUser;
    return user ? user.emailVerified : false;
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification() {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
    } else {
      throw new Error("No user is currently signed in");
    }
  }
}
