import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
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

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Resend API key is not configured. Please set RESEND_API_KEY environment variable.' },
        { status: 500 }
      );
    }

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
            // Check both email and username fields for email address
            const emailAddress = studentData?.email || studentData?.username;
            if (emailAddress && studentData?.name) {
              studentEmails.push({
                email: emailAddress,
                name: studentData.name,
                id: studentId
              });
            }
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
      // Debug: Let's see what fields are available in student documents
      try {
        const debugSnapshot = await studentsRef.limit(1).get();
        if (!debugSnapshot.empty) {
          const sampleStudent = debugSnapshot.docs[0].data();
          console.log('🔍 Debug - Sample student fields:', Object.keys(sampleStudent));
          console.log('🔍 Debug - Sample student data:', {
            hasEmail: !!sampleStudent.email,
            hasUsername: !!sampleStudent.username,
            hasName: !!sampleStudent.name,
            email: sampleStudent.email,
            username: sampleStudent.username,
            name: sampleStudent.name
          });
        }
      } catch (debugError) {
        console.error('Debug error:', debugError);
      }

      return NextResponse.json(
        { success: false, error: 'No valid student emails found' },
        { status: 400 }
      );
    }

    // Send emails to all students using Resend
    const emailPromises = studentEmails.map(async (student) => {
      try {
        const emailTemplate = createEmailTemplate(subject, message, student.name);
        
        const { data, error } = await resend.emails.send({
          from: 'Cloud Institution <noreply@cloudinstitution.in>', // ✅ Now using your verified domain
          to: [student.email],
          subject: subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        if (error) {
          throw new Error(error.message);
        }
        
        // Log email activity
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

        return { success: true, email: student.email, messageId: data?.id };
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