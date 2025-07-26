"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validateEmailJSConfig } from "@/lib/emailjs-service";
import { Mail, Settings } from "lucide-react";
import React from 'react';

interface EmailOptionsCardProps {
  selectedCount: number;
  onEmailJSEmail: () => void;
}

export const EmailOptionsCard: React.FC<EmailOptionsCardProps> = ({
  selectedCount,
  onEmailJSEmail
}) => {
  const emailJSConfig = validateEmailJSConfig();

  if (selectedCount === 0) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Send Email ({selectedCount} students selected)
        </CardTitle>
        <CardDescription>
          Send emails to selected students using EmailJS
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {emailJSConfig.isValid ? (
          <Button 
            onClick={onEmailJSEmail}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email to Selected Students
          </Button>
        ) : (
          <div className="space-y-2">
            <Button 
              variant="outline" 
              disabled
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              EmailJS Not Configured
            </Button>
            <div className="text-xs text-muted-foreground text-center">
              Please configure EmailJS to send emails
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
