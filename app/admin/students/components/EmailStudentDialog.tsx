import React from 'react';
import { StudentDialog } from './StudentDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface EmailStudentDialogProps {
  recipientCount: number;
  open: boolean;
  onClose: () => void;
  onSend: (subject: string, message: string) => void;
}

export function EmailStudentDialog({
  recipientCount,
  open,
  onClose,
  onSend,
}: EmailStudentDialogProps) {
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(subject, message);
    setSubject('');
    setMessage('');
  };

  return (
    <StudentDialog
      open={open}
      onClose={onClose}
      title="Send Email"
      description={`Send email to ${recipientCount} selected student${recipientCount !== 1 ? 's' : ''}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="subject">Subject</label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="message">Message</label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
          />
        </div>
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Send</Button>
        </div>
      </form>
    </StudentDialog>
  );
}
