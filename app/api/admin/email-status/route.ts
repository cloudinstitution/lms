// app/api/admin/email-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { EmailService } from "@/lib/email-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentEmail = searchParams.get('email');
    const action = searchParams.get('action') || 'logs';

    if (action === 'pending') {
      // Get all pending emails
      const pendingEmails = await EmailService.getPendingEmails();
      
      return NextResponse.json({
        success: true,
        data: pendingEmails,
        count: pendingEmails.length
      });
    }

    if (action === 'logs' && studentEmail) {
      // Get email logs for a specific student
      const logs = await EmailService.getEmailLogs(studentEmail);
      
      return NextResponse.json({
        success: true,
        data: logs,
        student: studentEmail
      });
    }

    if (action === 'check-welcome' && studentEmail) {
      // Check if welcome email was sent
      const hasWelcome = await EmailService.hasWelcomeEmailBeenSent(studentEmail);
      
      return NextResponse.json({
        success: true,
        hasWelcomeEmail: hasWelcome,
        student: studentEmail
      });
    }

    return NextResponse.json({
      error: "Invalid action or missing parameters",
      usage: {
        pending: "/api/admin/email-status?action=pending",
        logs: "/api/admin/email-status?action=logs&email=student@example.com",
        checkWelcome: "/api/admin/email-status?action=check-welcome&email=student@example.com"
      }
    }, { status: 400 });

  } catch (error: any) {
    console.error("Email status check error:", error);
    
    return NextResponse.json({
      error: "Failed to check email status",
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, htmlContent, textContent, metadata } = await request.json();

    if (!to || !subject || !htmlContent) {
      return NextResponse.json({
        error: "Missing required fields: to, subject, htmlContent"
      }, { status: 400 });
    }

    const result = await EmailService.queueCustomEmail(
      to,
      subject,
      htmlContent,
      textContent,
      metadata
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Email queued successfully"
      });
    } else {
      return NextResponse.json({
        error: "Failed to queue email",
        details: result.error
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Custom email queue error:", error);
    
    return NextResponse.json({
      error: "Failed to queue custom email",
      details: error.message
    }, { status: 500 });
  }
}
