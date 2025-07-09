// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import nodemailer from "nodemailer";

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

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email using Nodemailer
async function sendOTPEmail(email: string, otp: string, userName: string) {
  try {
    // Configure nodemailer transporter
    let transporter;
    
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      throw new Error('No email configuration found');
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Password Reset OTP - Cloud Institution</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px; }
              .otp-box { 
                  background: #fff; 
                  padding: 20px; 
                  border: 2px solid #dc2626; 
                  border-radius: 8px; 
                  margin: 20px 0; 
                  text-align: center;
              }
              .otp-code { 
                  font-size: 32px; 
                  font-weight: bold; 
                  color: #dc2626; 
                  letter-spacing: 5px;
                  margin: 10px 0;
              }
              .warning { 
                  background: #fef3c7; 
                  padding: 15px; 
                  border-left: 4px solid #f59e0b; 
                  margin: 20px 0; 
                  border-radius: 4px;
              }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔐 Password Reset Request</h1>
                  <p>Cloud Institution LMS</p>
              </div>
              
              <div class="content">
                  <p>Hello <strong>${userName}</strong>,</p>
                  
                  <p>We received a request to reset your password for your Cloud Institution LMS account.</p>
                  
                  <div class="otp-box">
                      <h3>Your OTP Code</h3>
                      <div class="otp-code">${otp}</div>
                      <p>This code will expire in <strong>5 minutes</strong></p>
                  </div>
                  
                  <p>Please enter this OTP code on the password reset page to continue with resetting your password.</p>
                  
                  <div class="warning">
                      <h4>⚠️ Security Notice:</h4>
                      <ul>
                          <li>Never share this OTP with anyone</li>
                          <li>This code is valid for 5 minutes only</li>
                          <li>If you didn't request this reset, please ignore this email</li>
                          <li>Contact support if you have concerns about your account security</li>
                      </ul>
                  </div>
                  
                  <p>If you have any questions or need assistance, please contact our support team.</p>
                  
                  <p>Best regards,<br>
                  <strong>Cloud Institution Team</strong></p>
              </div>
              
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this email address.</p>
                  <p>© ${new Date().getFullYear()} Cloud Institution. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const textTemplate = `
Password Reset OTP - Cloud Institution

Hello ${userName},

We received a request to reset your password for your Cloud Institution LMS account.

Your OTP Code: ${otp}

This code will expire in 5 minutes.

Please enter this OTP code on the password reset page to continue with resetting your password.

SECURITY NOTICE:
- Never share this OTP with anyone
- This code is valid for 5 minutes only
- If you didn't request this reset, please ignore this email
- Contact support if you have concerns about your account security

If you have any questions or need assistance, please contact our support team.

Best regards,
Cloud Institution Team

---
This is an automated email. Please do not reply to this email address.
© ${new Date().getFullYear()} Cloud Institution. All rights reserved.
    `;

    const mailOptions = {
      from: `"Cloud Institution" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset OTP - Cloud Institution LMS",
      text: textTemplate,
      html: htmlTemplate
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('\n✅ PASSWORD RESET OTP EMAIL SENT:');
    console.log('=====================================');
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Message ID: ${result.messageId}`);
    console.log('=====================================\n');
    
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('Failed to send OTP email:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, step, otp, newPassword } = await request.json();
    
    // Rate limiting check
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP, 3, 300000)) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429 }
      );
    }

    if (step === 'send-otp' || step === 'resend-otp') {
      // Step 1: Send OTP
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Check if user exists in students collection
      const studentsQuery = query(
        collection(db, "students"),
        where("username", "==", email)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      
      let userDoc = null;
      let userData = null;
      let userType = null;
      
      if (!studentsSnapshot.empty) {
        userDoc = studentsSnapshot.docs[0];
        userData = userDoc.data();
        userType = "student";
      } else {
        // Check if user exists in admin collection (teachers and admins)
        const adminQuery = query(
          collection(db, "admin"),
          where("username", "==", email)
        );
        const adminSnapshot = await getDocs(adminQuery);
        
        if (!adminSnapshot.empty) {
          userDoc = adminSnapshot.docs[0];
          userData = userDoc.data();
          userType = userData.role === "admin" ? "admin" : "teacher";
        }
      }
      
      if (!userDoc || !userData) {
        return NextResponse.json(
          { error: "No account found with this email address" },
          { status: 404 }
        );
      }
      
      // Generate OTP
      const otpCode = generateOTP();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      
      // Store OTP in Firestore with user type
      await addDoc(collection(db, "password_reset_otps"), {
        email: email,
        otp: otpCode,
        expiresAt: otpExpiry.toISOString(),
        used: false,
        userType: userType,
        createdAt: new Date().toISOString()
      });

      // Send OTP email
      await sendOTPEmail(email, otpCode, userData.name);

      // Log OTP generation
      await addDoc(collection(db, "email_logs"), {
        type: 'password_reset_otp',
        recipient: email,
        status: 'sent',
        sentAt: new Date().toISOString(),
        userType: userType,
        emailData: {
          subject: "Password Reset OTP - Cloud Institution LMS",
          otp: otpCode,
          userName: userData.name
        }
      });

      return NextResponse.json({
        success: true,
        message: step === 'resend-otp' ? "New OTP sent successfully to your email" : "OTP sent successfully to your email",
        userType: userType,
        expiresAt: otpExpiry.toISOString()
      });

    } else if (step === 'verify-otp') {
      // Step 2: Verify OTP
      if (!email || !otp) {
        return NextResponse.json(
          { error: "Email and OTP are required" },
          { status: 400 }
        );
      }

      // Find valid OTP
      const otpQuery = query(
        collection(db, "password_reset_otps"),
        where("email", "==", email),
        where("otp", "==", otp),
        where("used", "==", false)
      );
      const otpSnapshot = await getDocs(otpQuery);

      if (otpSnapshot.empty) {
        return NextResponse.json(
          { error: "Invalid or expired OTP" },
          { status: 400 }
        );
      }

      const otpDoc = otpSnapshot.docs[0];
      const otpData = otpDoc.data();
      
      // Check if OTP is expired
      const now = new Date();
      const expiryTime = new Date(otpData.expiresAt);
      
      if (now > expiryTime) {
        return NextResponse.json(
          { error: "OTP has expired. Please request a new one." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "OTP verified successfully",
        expiresAt: otpData.expiresAt,
        userType: otpData.userType
      });

    } else if (step === 'reset-password') {
      // Step 3: Reset Password
      if (!email || !otp || !newPassword) {
        return NextResponse.json(
          { error: "Email, OTP, and new password are required" },
          { status: 400 }
        );
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long" },
          { status: 400 }
        );
      }

      // Find and validate OTP
      const otpQuery = query(
        collection(db, "password_reset_otps"),
        where("email", "==", email),
        where("otp", "==", otp),
        where("used", "==", false)
      );
      const otpSnapshot = await getDocs(otpQuery);

      if (otpSnapshot.empty) {
        return NextResponse.json(
          { error: "Invalid or expired OTP" },
          { status: 400 }
        );
      }

      const otpDoc = otpSnapshot.docs[0];
      const otpData = otpDoc.data();
      
      // Check if OTP is expired
      const now = new Date();
      const expiryTime = new Date(otpData.expiresAt);
      
      if (now > expiryTime) {
        return NextResponse.json(
          { error: "OTP has expired. Please request a new one." },
          { status: 400 }
        );
      }

      // Update user password based on user type
      const userType = otpData.userType;
      
      if (userType === "student") {
        // Update student password
        const studentsQuery = query(
          collection(db, "students"),
          where("username", "==", email)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        if (studentsSnapshot.empty) {
          return NextResponse.json(
            { error: "Student account not found" },
            { status: 404 }
          );
        }

        const studentDoc = studentsSnapshot.docs[0];
        await updateDoc(doc(db, "students", studentDoc.id), {
          password: newPassword,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Update admin/teacher password
        const adminQuery = query(
          collection(db, "admin"),
          where("username", "==", email)
        );
        const adminSnapshot = await getDocs(adminQuery);
        
        if (adminSnapshot.empty) {
          return NextResponse.json(
            { error: "Admin/Teacher account not found" },
            { status: 404 }
          );
        }

        const adminDoc = adminSnapshot.docs[0];
        await updateDoc(doc(db, "admin", adminDoc.id), {
          password: newPassword,
          updatedAt: new Date().toISOString()
        });
      }

      // Mark OTP as used
      await updateDoc(doc(db, "password_reset_otps", otpDoc.id), {
        used: true,
        usedAt: new Date().toISOString()
      });

      // Log password reset
      await addDoc(collection(db, "email_logs"), {
        type: 'password_reset_complete',
        recipient: email,
        status: 'completed',
        completedAt: new Date().toISOString(),
        userType: userType,
        emailData: {
          subject: "Password Reset Completed",
          userType: userType
        }
      });

      console.log('Password reset completed for:', email, 'UserType:', userType);

      return NextResponse.json({
        success: true,
        message: "Password reset successfully"
      });

    } else {
      return NextResponse.json(
        { error: "Invalid step" },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error("Password reset error:", error);
    
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
