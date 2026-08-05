import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Student, FilterOptions } from '@/types/student';
import { Users, Mail } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkEmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (emailData: {
    subject: string;
    message: string;
    recipientType: 'selected';
    filters?: FilterOptions;
  }) => void;
  selectedCount: number;
  selectedStudents: Student[];
  currentFilters: FilterOptions;
}

export function BulkEmailDialog({
  open,
  onClose,
  onSend,
  selectedCount,
  selectedStudents,
  currentFilters
}: BulkEmailDialogProps) {
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const recipientType = 'selected';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend({
      subject,
      message,
      recipientType
    });
    setSubject('');
    setMessage('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email
          </DialogTitle>
          <DialogDescription>
            Send emails to selected students
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <form id="email-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Recipient List */}
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Recipients</Label>
                  <Badge variant="secondary">{selectedCount} selected</Badge>
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Selected Students
                    </CardTitle>
                    <CardDescription>
                      Send email to {selectedCount} selected students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[100px] rounded-md border p-2">
                      <div className="space-y-2">
                        {selectedStudents.map((student) => (
                          <div key={student.id} className="flex flex-col py-1 border-b last:border-b-0">
                            <span className="font-medium">{student.name}</span>
                            <span className="text-xs text-muted-foreground">{student.username}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
              
              {/* Email Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter email message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
            </form>
          </div>
          
          {/* Actions - Outside scrollable area to ensure they're always visible */}
          <div className="flex justify-between items-center pt-4 mt-2 border-t flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              📧 Will send to {selectedCount} students
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="email-form"
                disabled={!subject || !message || selectedCount === 0}
                className="flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                Send to {selectedCount}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}