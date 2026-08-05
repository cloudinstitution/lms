// lib/email-service.ts
import { addDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";

export interface EmailStatus {
  id: string;
  type: string;
  recipient: string;
  status: 'queued' | 'sent' | 'failed';
  queuedAt: string;
  sentAt?: string;
  error?: string;
}

export class EmailService {
  /**
   * Get recent email logs for a student
   */
  static async getEmailLogs(studentEmail: string, limitCount: number = 10): Promise<EmailStatus[]> {
    try {
      const q = query(
        collection(db, "email_logs"),
        where("recipient", "==", studentEmail),
        orderBy("queuedAt", "desc"),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailStatus[];
    } catch (error) {
      console.error("Error fetching email logs:", error);
      return [];
    }
  }

  /**
   * Get all pending emails (queued but not sent)
   */
  static async getPendingEmails(): Promise<EmailStatus[]> {
    try {
      const q = query(
        collection(db, "email_logs"),
        where("status", "==", "queued"),
        orderBy("queuedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailStatus[];
    } catch (error) {
      console.error("Error fetching pending emails:", error);
      return [];
    }
  }

  /**
   * Check if a welcome email was already sent to a student
   */
  static async hasWelcomeEmailBeenSent(studentEmail: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, "email_logs"),
        where("recipient", "==", studentEmail),
        where("type", "==", "welcome_email"),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking welcome email status:", error);
      return false;
    }
  }

  /**
   * Queue a custom email (for admin use)
   */
  static async queueCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const emailDocument = {
        to: [to],
        message: {
          subject,
          html: htmlContent,
          text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML if no text provided
        },
        metadata: {
          type: 'custom_email',
          createdAt: new Date().toISOString(),
          ...metadata
        }
      };

      // Add to Firebase Extensions mail collection
      await addDoc(collection(db, "mail"), emailDocument);
      
      // Log to our tracking collection
      await addDoc(collection(db, "email_logs"), {
        type: 'custom_email',
        recipient: to,
        status: 'queued',
        queuedAt: new Date().toISOString(),
        emailData: {
          subject,
          metadata
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error queueing custom email:", error);
      return { success: false, error: error.message };
    }
  }
}
