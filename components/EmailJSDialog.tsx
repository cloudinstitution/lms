"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  createStudentEmailData,
  debugEmailJSConfig,
  sendBulkEmailsViaEmailJS,
  sendEmailViaEmailJS,
  validateEmailJSConfig
} from "@/lib/emailjs-service";
import type { Student } from '@/types/student';
import { AlertTriangle, CheckCircle, Clock, Mail, Send } from "lucide-react";
import React from 'react';

interface EmailJSDialogProps {
  open: boolean;
  onClose: () => void;
  recipients: Student[];
  recipientType: 'single' | 'bulk';
  singleStudent?: Student | null;
}

interface SendProgress {
  completed: number;
  total: number;
  currentEmail: string;
  isComplete: boolean;
}

export const EmailJSDialog: React.FC<EmailJSDialogProps> = ({
  open,
  onClose,
  recipients,
  recipientType,
  singleStudent
}) => {
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);
  const [sendProgress, setSendProgress] = React.useState<SendProgress>({
    completed: 0,
    total: 0,
    currentEmail: '',
    isComplete: false
  });
  const [sendResults, setSendResults] = React.useState<{
    successful: number;
    failed: number;
    details: Array<{ email: string; success: boolean; error?: string }>;
  } | null>(null);
  const [configError, setConfigError] = React.useState<string | null>(null);

  // Check EmailJS configuration on mount
  React.useEffect(() => {
    if (open) {
      const config = validateEmailJSConfig();
      if (!config.isValid) {
        setConfigError(`EmailJS not configured. Missing: ${config.missing.join(', ')}`);
      } else {
        setConfigError(null);
      }
    }
  }, [open]);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSubject("");
      setMessage("");
      setIsSending(false);
      setShowProgress(false);
      setSendProgress({ completed: 0, total: 0, currentEmail: '', isComplete: false });
      setSendResults(null);
      setConfigError(null);
    }
  }, [open]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      return;
    }

    // Debug EmailJS configuration
    console.log('🔍 Starting email send process...');
    debugEmailJSConfig();

    setIsSending(true);
    setShowProgress(true);
    setSendResults(null);

    try {
      if (recipientType === 'single' && singleStudent) {
        // Send single email
        const emailData = createStudentEmailData([singleStudent], subject, message);
        if (emailData.length === 0) {
          throw new Error('Invalid email address for student');
        }

        setSendProgress({ completed: 0, total: 1, currentEmail: emailData[0].email, isComplete: false });
        
        const result = await sendEmailViaEmailJS(emailData[0]);
        
        setSendProgress({ completed: 1, total: 1, currentEmail: emailData[0].email, isComplete: true });
        setSendResults({
          successful: result.success ? 1 : 0,
          failed: result.success ? 0 : 1,
          details: [{
            email: emailData[0].email,
            success: result.success,
            error: result.error
          }]
        });
      } else {
        // Send bulk emails
        const emailData = createStudentEmailData(recipients, subject, message);
        if (emailData.length === 0) {
          throw new Error('No valid email addresses found');
        }

        setSendProgress({ completed: 0, total: emailData.length, currentEmail: '', isComplete: false });

        const result = await sendBulkEmailsViaEmailJS(
          { emails: emailData, delay: 1500 }, // 1.5 second delay to avoid rate limiting
          (completed, total, currentEmail) => {
            setSendProgress({ completed, total, currentEmail, isComplete: false });
          }
        );

        setSendProgress(prev => ({ ...prev, isComplete: true }));
        setSendResults(result.results);
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      setSendResults({
        successful: 0,
        failed: recipients.length,
        details: recipients.map(r => ({
          email: r.username || 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      });
    } finally {
      setIsSending(false);
    }
  };

  const getProgressPercentage = () => {
    if (sendProgress.total === 0) return 0;
    return (sendProgress.completed / sendProgress.total) * 100;
  };

  const recipientCount = recipientType === 'single' ? 1 : recipients.length;
  const validRecipients = recipientType === 'single' 
    ? (singleStudent?.username ? 1 : 0)
    : recipients.filter(r => r.username).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email via EmailJS
          </DialogTitle>
          <DialogDescription>
            {recipientType === 'single' 
              ? `Send email to ${singleStudent?.name || 'student'}`
              : `Send email to ${recipientCount} selected students`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuration Error Alert */}
          {configError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {configError}
                <div className="mt-2 text-sm">
                  <p>Please configure these environment variables:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>NEXT_PUBLIC_EMAILJS_SERVICE_ID</li>
                    <li>NEXT_PUBLIC_EMAILJS_TEMPLATE_ID</li>
                    <li>NEXT_PUBLIC_EMAILJS_PUBLIC_KEY</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* EmailJS Status - Simplified */}
          {!configError && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
              <CheckCircle className="h-4 w-4" />
              EmailJS is configured and ready to send emails
            </div>
          )}

          {/* Recipient Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recipients</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{recipientCount} selected</Badge>
                  <Badge variant={validRecipients === recipientCount ? "default" : "destructive"}>
                    {validRecipients} valid emails
                  </Badge>
                </div>
                {recipientType === 'single' && singleStudent && (
                  <div className="text-sm text-muted-foreground">
                    {singleStudent.name} ({singleStudent.username})
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                disabled={isSending}
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message"
                rows={6}
                disabled={isSending}
              />
            </div>
          </div>

          {/* Progress Section */}
          {showProgress && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {sendProgress.isComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-500" />
                  )}
                  Email Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Progress value={getProgressPercentage()} className="h-2" />
                <div className="text-sm text-muted-foreground">
                  {sendProgress.isComplete ? (
                    `Completed: ${sendProgress.completed}/${sendProgress.total} emails sent`
                  ) : isSending ? (
                    `Sending ${sendProgress.completed + 1}/${sendProgress.total}: ${sendProgress.currentEmail}`
                  ) : (
                    `Ready to send ${sendProgress.total} emails`
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {sendResults && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Send Results</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex gap-4">
                  <Badge variant="default" className="bg-green-500">
                    ✓ {sendResults.successful} successful
                  </Badge>
                  {sendResults.failed > 0 && (
                    <Badge variant="destructive">
                      ✗ {sendResults.failed} failed
                    </Badge>
                  )}
                </div>
                
                {sendResults.details.some(d => !d.success) && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-destructive mb-2">Failed Emails:</p>
                    <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                      {sendResults.details
                        .filter(d => !d.success)
                        .map((detail, index) => (
                          <div key={index} className="text-muted-foreground">
                            {detail.email}: {detail.error}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            {sendResults ? 'Close' : 'Cancel'}
          </Button>
          {!sendResults && (
            <Button 
              onClick={handleSend} 
              disabled={!subject.trim() || !message.trim() || validRecipients === 0 || isSending || !!configError}
              className="gap-2"
            >
              {isSending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-r-transparent rounded-full" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
