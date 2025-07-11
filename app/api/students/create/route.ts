// app/api/students/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import nodemailer from "nodemailer";

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();

function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
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

interface StudentCreationData {
  name: string;
  username: string; // email
  password: string;
  phone?: string;
  studentId: string;
  coursesEnrolled: number;
  courseName: string[];
  courseID: number[];
  primaryCourseIndex: number;
  courseMode: "Online" | "Offline";
  primaryCourseId?: string;
  primaryCourseTitle?: string;
  primaryCourseCode?: number;
}

// Email sending function using Nodemailer
async function sendWelcomeEmail(studentData: StudentCreationData) {
  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/login` : 'http://localhost:3000/login';
  
  // Create HTML email template
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to Cloud Institution</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px; }
            .credentials { background: #fff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px; }
            .course-list { background: #fff; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background: #2563eb; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
                font-weight: bold;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .highlight { color: #2563eb; font-weight: bold; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Cloud Institution!</h1>
                <p>Your learning journey starts here</p>
            </div>
            
            <div class="content">
                <p>Dear <span class="highlight">${studentData.name}</span>,</p>
                
                <p>Congratulations! Your student account has been successfully created at Cloud Institution. You're now ready to begin your educational journey with us.</p>
                
                <div class="credentials">
                    <h3>🔐 Your Login Credentials</h3>
                    <p><strong>Email:</strong> ${studentData.username}</p>
                    <p><strong>Password:</strong> <span class="highlight">${studentData.password}</span></p>
                    <p><strong>Student ID:</strong> ${studentData.studentId}</p>
                    ${studentData.phone ? `<p><strong>Phone:</strong> ${studentData.phone}</p>` : ''}
                    <p><strong>Course Mode:</strong> ${studentData.courseMode}</p>
                </div>
                
                ${studentData.courseName && studentData.courseName.length > 0 ? `
                <div class="course-list">
                    <h3>📚 Your Enrolled Courses</h3>
                    <ul>
                        ${studentData.courseName.map(course => `<li>${course}</li>`).join('')}
                    </ul>
                    <p><strong>Total Courses:</strong> ${studentData.coursesEnrolled}</p>
                    ${studentData.primaryCourseTitle ? `<p><strong>Primary Course:</strong> <span class="highlight">${studentData.primaryCourseTitle}</span></p>` : ''}
                </div>
                ` : ''}
                
                <p><strong>Ready to get started?</strong> Click the button below to access your student portal:</p>
                <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Login to Student Portal</a>
                </div>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h4>🔒 Security Tips:</h4>
                    <ul>
                        <li>Please change your password after your first login</li>
                        <li>Keep your login credentials secure</li>
                        <li>Never share your account with others</li>
                        <li>Log out when using shared computers</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
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

  // Create plain text version
  const textTemplate = `
Welcome to Cloud Institution!

Dear ${studentData.name},

Congratulations! Your student account has been successfully created at Cloud Institution.

LOGIN CREDENTIALS:
- Email: ${studentData.username}
- Password: ${studentData.password}
- Student ID: ${studentData.studentId}
${studentData.phone ? `- Phone: ${studentData.phone}` : ''}
- Course Mode: ${studentData.courseMode}

${studentData.courseName && studentData.courseName.length > 0 ? `
ENROLLED COURSES:
${studentData.courseName.map((course, index) => `${index + 1}. ${course}`).join('\n')}
Total Courses: ${studentData.coursesEnrolled}
${studentData.primaryCourseTitle ? `Primary Course: ${studentData.primaryCourseTitle}` : ''}
` : ''}

LOGIN PORTAL: ${loginUrl}

SECURITY TIPS:
- Please change your password after your first login
- Keep your login credentials secure
- Never share your account with others
- Log out when using shared computers

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
Cloud Institution Team

---
This is an automated email. Please do not reply to this email address.
© ${new Date().getFullYear()} Cloud Institution. All rights reserved.
  `;

  try {
    // Configure nodemailer transporter
    let transporter;
    
    // Check for Gmail configuration
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
    }
    // Check for custom SMTP configuration
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }
    
    // If transporter is configured, send email
    if (transporter) {
      const mailOptions = {
        from: `"Cloud Institution" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
        to: studentData.username,
        subject: "Welcome to Cloud Institution - Your Account Details",
        text: textTemplate,
        html: htmlTemplate
      };

      const result = await transporter.sendMail(mailOptions);
      
      // Log successful email sending
      await addDoc(collection(db, "email_logs"), {
        type: 'welcome_email',
        recipient: studentData.username,
        studentId: studentData.studentId,
        status: 'sent',
        sentAt: new Date().toISOString(),
        messageId: result.messageId,
        emailData: {
          subject: mailOptions.subject,
          studentInfo: {
            name: studentData.name,
            studentId: studentData.studentId,
            email: studentData.username,
            courseMode: studentData.courseMode,
            courses: studentData.courseName || [],
            totalCourses: studentData.coursesEnrolled
          }
        }
      });
      
      console.log('\n✅ WELCOME EMAIL SENT SUCCESSFULLY:');
      console.log('=====================================');
      console.log(`To: ${studentData.username}`);
      console.log(`Subject: Welcome to Cloud Institution - Your Account Details`);
      console.log(`Student: ${studentData.name}`);
      console.log(`Student ID: ${studentData.studentId}`);
      console.log(`Message ID: ${result.messageId}`);
      console.log(`Course Mode: ${studentData.courseMode}`);
      console.log(`Total Courses: ${studentData.coursesEnrolled}`);
      console.log('=====================================\n');
      
      return { 
        success: true, 
        method: 'nodemailer',
        status: 'sent',
        messageId: result.messageId,
        recipient: studentData.username
      };
    }
    
    // Fallback: No email configuration found
    else {
      console.log('\n⚠️  EMAIL CONFIGURATION NOT FOUND');
      console.log('=====================================');
      console.log('To send emails, set up one of these:');
      console.log('1. Gmail: GMAIL_USER and GMAIL_APP_PASSWORD');
      console.log('2. Custom SMTP: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
      console.log('');
      console.log('📧 EMAIL CONTENT (Would be sent):');
      console.log(`To: ${studentData.username}`);
      console.log(`Subject: Welcome to Cloud Institution - Your Account Details`);
      console.log(`Student: ${studentData.name} (${studentData.studentId})`);
      console.log(`Password: ${studentData.password}`);
      console.log(`Course Mode: ${studentData.courseMode}`);
      console.log(`Courses: ${studentData.coursesEnrolled}`);
      console.log('=====================================\n');
      
      // Log as queued for manual processing
      await addDoc(collection(db, "email_logs"), {
        type: 'welcome_email',
        recipient: studentData.username,
        studentId: studentData.studentId,
        status: 'queued',
        queuedAt: new Date().toISOString(),
        reason: 'No email configuration found',
        emailData: {
          subject: "Welcome to Cloud Institution - Your Account Details",
          studentInfo: {
            name: studentData.name,
            studentId: studentData.studentId,
            email: studentData.username,
            password: studentData.password,
            courseMode: studentData.courseMode,
            courses: studentData.courseName || [],
            totalCourses: studentData.coursesEnrolled
          }
        }
      });
      
      return { 
        success: true, 
        method: 'logged',
        status: 'queued',
        recipient: studentData.username,
        note: 'No email configuration found - logged for manual processing'
      };
    }
    
  } catch (error: any) {
    console.error('❌ Failed to send welcome email:', error);
    
    // Log failed email attempt
    await addDoc(collection(db, "email_logs"), {
      type: 'welcome_email',
      recipient: studentData.username,
      studentId: studentData.studentId,
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: error.message,
      emailData: {
        subject: "Welcome to Cloud Institution - Your Account Details",
        studentInfo: {
          name: studentData.name,
          studentId: studentData.studentId,
          email: studentData.username,
          courseMode: studentData.courseMode,
          courses: studentData.courseName || [],
          totalCourses: studentData.coursesEnrolled
        }
      }
    });
    
    return { 
      success: false, 
      method: 'nodemailer',
      status: 'failed',
      error: error.message,
      recipient: studentData.username
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const studentData: StudentCreationData = await request.json();
    
    // Rate limiting check
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP, 5, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    
    // Validate required fields
    if (!studentData.name || !studentData.username || !studentData.password) {
      return NextResponse.json(
        { error: "Missing required fields: name, username, password" },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentData.username)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    // Validate student ID
    if (!studentData.studentId || studentData.studentId.length < 3) {
      return NextResponse.json(
        { error: "Student ID must be at least 3 characters long" },
        { status: 400 }
      );
    }
    
    // Check if student already exists
    const existingStudentQuery = query(
      collection(db, "students"),
      where("username", "==", studentData.username)
    );
    const existingStudentSnapshot = await getDocs(existingStudentQuery);
    
    if (!existingStudentSnapshot.empty) {
      return NextResponse.json(
        { error: "A student with this email already exists" },
        { status: 409 }
      );
    }
    
    // Check if student ID already exists
    const existingIdQuery = query(
      collection(db, "students"),
      where("studentId", "==", studentData.studentId)
    );
    const existingIdSnapshot = await getDocs(existingIdQuery);
    
    if (!existingIdSnapshot.empty) {
      return NextResponse.json(
        { error: `Student ID '${studentData.studentId}' already exists. Please use a different student ID.` },
        { status: 409 }
      );
    }
    
    // Prepare student document data
    const studentDocData = {
      ...studentData,
      joinedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save student to Firestore
    const docRef = await addDoc(collection(db, "students"), studentDocData);
    
    // Send welcome email with student details
    let emailResult;
    try {
      emailResult = await sendWelcomeEmail(studentData);
    } catch (emailError: any) {
      console.error("Failed to send welcome email:", emailError);
      emailResult = { success: false, error: emailError?.message || 'Unknown error' };
    }
    
    // Log successful creation
    console.log("Student created successfully:", {
      docId: docRef.id,
      email: studentData.username,
      studentId: studentData.studentId,
      emailStatus: emailResult.success ? 'queued' : 'failed'
    });
    
    return NextResponse.json({
      success: true,
      message: emailResult.success 
        ? (emailResult.status === 'sent' ? "Student created successfully and welcome email sent!" : "Student created successfully and welcome email queued")
        : "Student created successfully but welcome email failed to send",
      studentId: studentData.studentId,
      docId: docRef.id,
      emailStatus: emailResult.status || 'unknown',
      emailMethod: emailResult.method || 'unknown'
    });
    
  } catch (error: any) {
    console.error("Student creation error:", error);
    
    return NextResponse.json(
      { error: "Failed to create student account" },
      { status: 500 }
    );
  }
}
