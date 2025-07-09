import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if it hasn't been already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Get Firestore instance
const db = admin.firestore();

// Create transporter for email sending
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Email template for student notifications
const createEmailTemplate = (subject: string, message: string, recipientName: string) => {
  return {
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          .institution-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { opacity: 0.9; }
          .greeting { font-size: 18px; color: #1e293b; margin-bottom: 15px; }
          .message-content { white-space: pre-wrap; line-height: 1.8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="institution-name">🎓 Cloud Institution</div>
          <div class="subtitle">Learning Management System</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${recipientName},</div>
          <div class="message">
            <div class="message-content">${message}</div>
          </div>
        </div>
        <div class="footer">
          <p>This email was sent from Cloud Institution LMS</p>
          <p>© ${new Date().getFullYear()} Cloud Institution. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${recipientName},

${message}

---
This email was sent from Cloud Institution LMS
© ${new Date().getFullYear()} Cloud Institution. All rights reserved.
    `
  };
};

export async function POST(request: NextRequest) {
  try {
    const { studentIds, subject, message } = await request.json();

    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student IDs are required' },
        { status: 400 }
      );
    }

    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Check if email configuration is available
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Email configuration is not available' },
        { status: 500 }
      );
    }

    // Create email transporter
    const transporter = createTransporter();

    // Fetch student data from Firestore
    const studentsRef = db.collection('students');
    const studentEmails: { email: string; name: string; id: string }[] = [];

    // Get student details for each ID
    for (const studentId of studentIds) {
      try {
        const studentDoc = await studentsRef.doc(studentId).get();
        if (studentDoc.exists) {
          const studentData = studentDoc.data();
          if (studentData?.username && studentData?.name) {
            studentEmails.push({
              email: studentData.username,
              name: studentData.name,
              id: studentId
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching student ${studentId}:`, error);
      }
    }

    if (studentEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid student emails found' },
        { status: 400 }
      );
    }

    // Send emails to all students
    const emailPromises = studentEmails.map(async (student) => {
      try {
        const emailTemplate = createEmailTemplate(subject, message, student.name);
        
        const mailOptions = {
          from: `"Cloud Institution LMS" <${process.env.GMAIL_USER}>`,
          to: student.email,
          subject: subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Log email activity
        await db.collection('email_logs').add({
          type: 'bulk_student_email',
          recipient: student.email,
          recipientName: student.name,
          recipientId: student.id,
          subject: subject,
          message: message,
          messageId: info.messageId,
          status: 'sent',
          timestamp: new Date().toISOString(),
          sentBy: 'admin' // You can get this from session/auth
        });

        return { success: true, email: student.email, messageId: info.messageId };
      } catch (error) {
        console.error(`Error sending email to ${student.email}:`, error);
        
        // Log failed email
        await db.collection('email_logs').add({
          type: 'bulk_student_email',
          recipient: student.email,
          recipientName: student.name,
          recipientId: student.id,
          subject: subject,
          message: message,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          sentBy: 'admin'
        });

        return { success: false, email: student.email, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Wait for all emails to be processed
    const results = await Promise.all(emailPromises);
    
    // Count successful and failed emails
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Emails sent to ${successful} students${failed > 0 ? ` (${failed} failed)` : ''}`,
      results: {
        total: studentEmails.length,
        successful,
        failed,
        details: results
      }
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send emails' 
      },
      { status: 500 }
    );
  }
}
