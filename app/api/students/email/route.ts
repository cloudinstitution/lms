import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if it hasn't been already
if (!admin.apps.length) {
  console.log('🔍 Initializing Firebase Admin for production...');
  console.log('🔍 Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('🔍 Client Email exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log('🔍 Private Key exists:', !!process.env.FIREBASE_PRIVATE_KEY);
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  console.log('✅ Firebase Admin initialized successfully');
} else {
  console.log('🔍 Firebase Admin already initialized');
}

// Get Firestore instance
const db = admin.firestore();

// Email validation helper function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Create transporter for email sending with proper fallback logic
const createTransporter = () => {
  // Check for Gmail configuration first
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  // Check for custom SMTP configuration
  else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  // If no configuration is found, throw an error
  else {
    throw new Error('No email configuration found. Please set up Gmail or SMTP credentials.');
  }
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
    const { 
      studentIds, 
      subject, 
      message, 
      filters, 
      recipientType = 'selected' 
    } = await request.json();

    // Validate required fields
    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Validate recipient type and required data
    if (recipientType === 'selected' && (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Student IDs are required for selected recipients' },
        { status: 400 }
      );
    }

    if (recipientType === 'filtered' && !filters) {
      return NextResponse.json(
        { success: false, error: 'Filters are required for filtered recipients' },
        { status: 400 }
      );
    }

    // Check if email configuration is available (supports both Gmail and SMTP)
    if (!((process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) || 
          (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD))) {
      return NextResponse.json(
        { success: false, error: 'Email configuration is not available. Please configure Gmail or SMTP settings.' },
        { status: 500 }
      );
    }

    // Create email transporter with fallback logic
    const transporter = createTransporter();

    // Fetch student data from Firestore
    const studentsRef = db.collection('students');
    const studentEmails: { email: string; name: string; id: string }[] = [];

    if (recipientType === 'selected') {
      // Get student details for selected IDs
      for (const studentId of studentIds) {
        try {
          const studentDoc = await studentsRef.doc(studentId).get();
          if (studentDoc.exists) {
            const studentData = studentDoc.data();
            console.log(`🔍 Processing student ${studentId}:`, {
              hasEmail: !!studentData?.email,
              hasUsername: !!studentData?.username,
              hasName: !!studentData?.name,
              email: studentData?.email,
              username: studentData?.username
            });
            
            // Check both email and username fields for email address
            const emailAddress = studentData?.email || studentData?.username;
            
            // Validate email format
            if (emailAddress && isValidEmail(emailAddress) && studentData?.name) {
              studentEmails.push({
                email: emailAddress,
                name: studentData.name,
                id: studentId
              });
              console.log(`✅ Added student ${studentId} with email ${emailAddress}`);
            } else {
              console.log(`❌ Skipped student ${studentId}:`, {
                emailAddress,
                isValidEmail: emailAddress ? isValidEmail(emailAddress) : false,
                hasName: !!studentData?.name
              });
            }
          } else {
            console.log(`❌ Student ${studentId} does not exist`);
          }
        } catch (error) {
          console.error(`Error fetching student ${studentId}:`, error);
        }
      }
    } else if (recipientType === 'filtered') {
      // Get all students and apply filters
      try {
        const allStudentsSnapshot = await studentsRef.get();
        const allStudents = allStudentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        // Apply filters
        let filteredStudents = allStudents;

        // Filter by status
        if (filters.status && filters.status.length > 0) {
          filteredStudents = filteredStudents.filter((student: any) => 
            filters.status.includes(student.status)
          );
        }

        // Filter by course name
        if (filters.courseName) {
          filteredStudents = filteredStudents.filter((student: any) => 
            student.courseName && student.courseName.some((course: string) => 
              course.toLowerCase().includes(filters.courseName.toLowerCase())
            )
          );
        }

        // Filter by course ID
        if (filters.courseID) {
          filteredStudents = filteredStudents.filter((student: any) => 
            student.courseID && student.courseID.includes(filters.courseID)
          );
        }

        // Filter by courses enrolled count
        if (filters.coursesEnrolled) {
          filteredStudents = filteredStudents.filter((student: any) => 
            student.coursesEnrolled >= filters.coursesEnrolled
          );
        }

        // Filter by date range
        if (filters.dateRange?.from || filters.dateRange?.to) {
          filteredStudents = filteredStudents.filter((student: any) => {
            if (!student.joinedDate) return false;
            
            const joinedDate = new Date(student.joinedDate);
            const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
            const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : null;
            
            if (fromDate && joinedDate < fromDate) return false;
            if (toDate && joinedDate > toDate) return false;
            
            return true;
          });
        }

        // Extract email information
        filteredStudents.forEach((student: any) => {
          // Check both email and username fields for email address
          const emailAddress = student.email || student.username;
          if (emailAddress && student.name) {
            studentEmails.push({
              email: emailAddress,
              name: student.name,
              id: student.id
            });
          }
        });
      } catch (error) {
        console.error('Error fetching filtered students:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch filtered students' },
          { status: 500 }
        );
      }
    } else if (recipientType === 'all') {
      // Get all active students
      try {
        console.log('🔍 Fetching all active students...');
        const allStudentsSnapshot = await studentsRef.where('status', '==', 'Active').get();
        console.log(`🔍 Found ${allStudentsSnapshot.size} active students`);
        
        if (allStudentsSnapshot.empty) {
          // Try without status filter as fallback
          console.log('🔍 No active students found, trying all students...');
          const allStudentsSnapshot2 = await studentsRef.limit(10).get();
          console.log(`🔍 Found ${allStudentsSnapshot2.size} total students`);
          
          allStudentsSnapshot2.docs.forEach((doc, index) => {
            const studentData = doc.data();
            console.log(`🔍 Student ${index + 1}:`, {
              id: doc.id,
              status: studentData?.status,
              hasEmail: !!studentData?.email,
              hasUsername: !!studentData?.username,
              email: studentData?.email,
              username: studentData?.username
            });
            
            // Check both email and username fields for email address
            const emailAddress = studentData?.email || studentData?.username;
            if (emailAddress && isValidEmail(emailAddress) && studentData?.name) {
              studentEmails.push({
                email: emailAddress,
                name: studentData.name,
                id: doc.id
              });
            }
          });
        } else {
          allStudentsSnapshot.docs.forEach(doc => {
            const studentData = doc.data();
            // Check both email and username fields for email address
            const emailAddress = studentData?.email || studentData?.username;
            if (emailAddress && isValidEmail(emailAddress) && studentData?.name) {
              studentEmails.push({
                email: emailAddress,
                name: studentData.name,
                id: doc.id
              });
            }
          });
        }
      } catch (error) {
        console.error('Error fetching all students:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch all students' },
          { status: 500 }
        );
      }
    }

    if (studentEmails.length === 0) {
      // Enhanced debugging for production issues
      try {
        console.log('🔍 Production Debug - Environment Check:');
        console.log('🔍 Firebase Project ID:', process.env.FIREBASE_PROJECT_ID);
        console.log('🔍 Firebase Client Email:', process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 20) + '...');
        console.log('🔍 Recipient Type:', recipientType);
        console.log('🔍 Student IDs provided:', studentIds);
        console.log('🔍 Filters provided:', filters);

        // Get total count of students in the database
        const totalStudentsSnapshot = await studentsRef.limit(5).get();
        console.log('🔍 Total students found in DB:', totalStudentsSnapshot.size);
        
        if (!totalStudentsSnapshot.empty) {
          totalStudentsSnapshot.docs.forEach((doc, index) => {
            const student = doc.data();
            console.log(`🔍 Student ${index + 1} fields:`, Object.keys(student));
            console.log(`🔍 Student ${index + 1} data:`, {
              id: doc.id,
              hasEmail: !!student.email,
              hasUsername: !!student.username,
              hasName: !!student.name,
              email: student.email ? `${student.email.substring(0, 5)}...` : 'N/A',
              username: student.username ? `${student.username.substring(0, 5)}...` : 'N/A',
              name: student.name || 'N/A',
              status: student.status || 'N/A'
            });
          });
        } else {
          console.log('🔍 No students found in database!');
        }

        // Check specific student IDs if provided
        if (recipientType === 'selected' && studentIds) {
          for (const studentId of studentIds.slice(0, 3)) { // Check first 3 IDs
            try {
              const studentDoc = await studentsRef.doc(studentId).get();
              console.log(`🔍 Student ID ${studentId} exists:`, studentDoc.exists);
              if (studentDoc.exists) {
                const data = studentDoc.data();
                console.log(`🔍 Student ${studentId} data:`, {
                  hasEmail: !!data?.email,
                  hasUsername: !!data?.username,
                  hasName: !!data?.name,
                  email: data?.email,
                  username: data?.username,
                  name: data?.name
                });
              }
            } catch (docError) {
              console.log(`🔍 Error fetching student ${studentId}:`, docError);
            }
          }
        }

      } catch (debugError) {
        console.error('🔍 Debug error:', debugError);
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid student emails found',
          debug: {
            recipientType,
            studentIdsCount: studentIds?.length || 0,
            hasFilters: !!filters,
            environment: 'production'
          }
        },
        { status: 400 }
      );
    }

    // Send emails to all students
    const emailPromises = studentEmails.map(async (student) => {
      try {
        const emailTemplate = createEmailTemplate(subject, message, student.name);
        
        const mailOptions = {
          from: `"Cloud Institution LMS" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
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
          sentBy: 'admin'
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