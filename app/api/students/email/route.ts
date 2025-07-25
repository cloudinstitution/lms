import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

// Email validation helper function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
    // First, try to parse the request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : 'Unknown parsing error' },
        { status: 400 }
      );
    }

    const { 
      studentIds, 
      subject, 
      message, 
      filters, 
      recipientType = 'selected' 
    } = requestData;

    // Enhanced logging for debugging deployment issues
    console.log('🔍 Email API Request Debug Info:', {
      hasStudentIds: !!studentIds,
      studentIdsLength: Array.isArray(studentIds) ? studentIds.length : 'not array',
      hasSubject: !!subject,
      hasMessage: !!message,
      recipientType,
      hasFilters: !!filters,
      requestDataKeys: Object.keys(requestData || {}),
      environment: process.env.NODE_ENV,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasFirebaseConfig: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
    });

    // Validate required fields
    if (!subject || !message) {
      console.error('❌ Missing required fields - subject or message');
      return NextResponse.json(
        { success: false, error: 'Subject and message are required', received: { hasSubject: !!subject, hasMessage: !!message } },
        { status: 400 }
      );
    }

    // Validate recipient type and required data
    if (recipientType === 'selected' && (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0)) {
      console.error('❌ Invalid student IDs for selected recipients:', { studentIds, isArray: Array.isArray(studentIds), length: studentIds?.length });
      return NextResponse.json(
        { success: false, error: 'Student IDs are required for selected recipients', received: { studentIds, recipientType } },
        { status: 400 }
      );
    }

    if (recipientType === 'filtered' && !filters) {
      console.error('❌ Missing filters for filtered recipients');
      return NextResponse.json(
        { success: false, error: 'Filters are required for filtered recipients' },
        { status: 400 }
      );
    }

    // Enhanced environment variable validation
    const envValidation = {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
    };

    console.log('🔍 Environment Variables Check:', envValidation);

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ Resend API key is not configured');
      return NextResponse.json(
        { success: false, error: 'Resend API key is not configured. Please set RESEND_API_KEY environment variable.', envCheck: envValidation },
        { status: 500 }
      );
    }

    // Check Firebase configuration
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('❌ Firebase configuration is incomplete');
      return NextResponse.json(
        { success: false, error: 'Firebase configuration is incomplete. Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.', envCheck: envValidation },
        { status: 500 }
      );
    }

    // Fetch student data from Firestore with enhanced error handling
    let studentsRef;
    try {
      studentsRef = db.collection('students');
      console.log('✅ Successfully connected to Firestore');
    } catch (firestoreError) {
      console.error('❌ Failed to connect to Firestore:', firestoreError);
      return NextResponse.json(
        { success: false, error: 'Failed to connect to database', details: firestoreError instanceof Error ? firestoreError.message : 'Unknown database error' },
        { status: 500 }
      );
    }

    const studentEmails: { email: string; name: string; id: string }[] = [];

    if (recipientType === 'selected') {
      // Get student details for selected IDs
      console.log(`🔍 Fetching ${studentIds.length} selected students:`, studentIds);
      
      for (const studentId of studentIds) {
        try {
          const studentDoc = await studentsRef.doc(studentId).get();
          if (studentDoc.exists) {
            const studentData = studentDoc.data();
            // Check both email and username fields for email address
            const emailAddress = studentData?.email || studentData?.username;
            if (emailAddress && studentData?.name) {
              studentEmails.push({
                email: emailAddress,
                name: studentData.name,
                id: studentId
              });
              console.log(`✅ Found student: ${studentData.name} (${emailAddress})`);
            } else {
              console.warn(`⚠️ Student ${studentId} missing email or name:`, {
                hasEmail: !!studentData?.email,
                hasUsername: !!studentData?.username,
                hasName: !!studentData?.name,
                email: studentData?.email,
                username: studentData?.username,
                name: studentData?.name
              });
            }
          } else {
            console.warn(`⚠️ Student document not found: ${studentId}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching student ${studentId}:`, error);
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
        const allStudentsSnapshot = await studentsRef.where('status', '==', 'Active').get();
        allStudentsSnapshot.docs.forEach(doc => {
          const studentData = doc.data();
          // Check both email and username fields for email address
          const emailAddress = studentData?.email || studentData?.username;
          if (emailAddress && studentData?.name) {
            studentEmails.push({
              email: emailAddress,
              name: studentData.name,
              id: doc.id
            });
          }
        });
      } catch (error) {
        console.error('Error fetching all students:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch all students' },
          { status: 500 }
        );
      }
    }

    if (studentEmails.length === 0) {
      // Enhanced debugging for deployment issues
      try {
        const debugSnapshot = await studentsRef.limit(3).get();
        const debugInfo = {
          totalDocuments: debugSnapshot.size,
          sampleStudents: debugSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              hasEmail: !!data.email,
              hasUsername: !!data.username,
              hasName: !!data.name,
              email: data.email,
              username: data.username,
              name: data.name,
              availableFields: Object.keys(data)
            };
          })
        };
        
        console.log('🔍 Debug - No valid student emails found. Sample data:', debugInfo);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'No valid student emails found',
            debug: {
              requestInfo: {
                recipientType,
                studentIdsProvided: studentIds?.length || 0,
                selectedStudentIds: recipientType === 'selected' ? studentIds : []
              },
              databaseInfo: debugInfo
            }
          },
          { status: 400 }
        );
      } catch (debugError) {
        console.error('❌ Debug error:', debugError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'No valid student emails found and unable to debug database',
            debugError: debugError instanceof Error ? debugError.message : 'Unknown debug error'
          },
          { status: 400 }
        );
      }
    }

    console.log(`✅ Found ${studentEmails.length} valid student emails to send to`);

    // Send emails to all students using Resend with enhanced error handling
    console.log(`📧 Starting to send emails to ${studentEmails.length} students`);
    
    const emailPromises = studentEmails.map(async (student, index) => {
      try {
        console.log(`📤 Sending email ${index + 1}/${studentEmails.length} to ${student.name} (${student.email})`);
        
        const emailTemplate = createEmailTemplate(subject, message, student.name);
        
        const emailPayload = {
          from: 'Cloud Institution <noreply@cloudinstitution.in>',
          to: [student.email],
          subject: subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        };

        console.log(`📧 Email payload for ${student.email}:`, {
          from: emailPayload.from,
          to: emailPayload.to,
          subject: emailPayload.subject,
          hasHtml: !!emailPayload.html,
          hasText: !!emailPayload.text
        });
        
        const { data, error } = await resend.emails.send(emailPayload);

        if (error) {
          console.error(`❌ Resend error for ${student.email}:`, error);
          throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
        }
        
        console.log(`✅ Email sent successfully to ${student.email}, message ID: ${data?.id}`);
        
        // Log email activity
        try {
          await db.collection('email_logs').add({
            type: 'bulk_student_email',
            recipient: student.email,
            recipientName: student.name,
            recipientId: student.id,
            subject: subject,
            message: message,
            messageId: data?.id,
            status: 'sent',
            timestamp: new Date().toISOString(),
            sentBy: 'admin'
          });
        } catch (logError) {
          console.error(`⚠️ Failed to log email for ${student.email}:`, logError);
          // Don't fail the email send if logging fails
        }

        return { success: true, email: student.email, messageId: data?.id };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error sending email to ${student.email}:`, errorMessage);
        
        // Log failed email
        try {
          await db.collection('email_logs').add({
            type: 'bulk_student_email',
            recipient: student.email,
            recipientName: student.name,
            recipientId: student.id,
            subject: subject,
            message: message,
            status: 'failed',
            error: errorMessage,
            timestamp: new Date().toISOString(),
            sentBy: 'admin'
          });
        } catch (logError) {
          console.error(`⚠️ Failed to log failed email for ${student.email}:`, logError);
        }

        return { success: false, email: student.email, error: errorMessage };
      }
    });

    // Wait for all emails to be processed
    console.log('⏳ Waiting for all email promises to resolve...');
    const results = await Promise.all(emailPromises);
    
    // Count successful and failed emails
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📊 Email Results: ${successful} successful, ${failed} failed out of ${results.length} total`);

    // Log failed emails for debugging
    if (failed > 0) {
      const failedEmails = results.filter(r => !r.success);
      console.error('❌ Failed emails:', failedEmails);
    }

    const response = {
      success: true,
      message: `Emails sent to ${successful} students${failed > 0 ? ` (${failed} failed)` : ''}`,
      results: {
        total: studentEmails.length,
        successful,
        failed,
        details: results
      }
    };

    console.log('✅ Sending final response:', response);

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send emails';
    console.error('❌ Critical email sending error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      },
      { status: 500 }
    );
  }
}