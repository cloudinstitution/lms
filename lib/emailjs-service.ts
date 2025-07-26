import emailjs from '@emailjs/browser';

// EmailJS configuration - these should be set in environment variables
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'your_service_id';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'your_template_id';
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'your_public_key';

// Initialize EmailJS with public key
const initializeEmailJS = () => {
  if (typeof window !== 'undefined') {
    console.log('🚀 Initializing EmailJS with public key:', EMAILJS_PUBLIC_KEY ? '***' + EMAILJS_PUBLIC_KEY.slice(-4) : 'Not set');
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log('✅ EmailJS init called');
  } else {
    console.warn('⚠️ EmailJS init skipped - not in browser environment');
  }
};

// Function to validate EmailJS configuration
export const validateEmailJSConfig = (): { isValid: boolean; missing: string[] } => {
  const missing: string[] = [];
  
  if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'your_service_id') {
    missing.push('NEXT_PUBLIC_EMAILJS_SERVICE_ID');
  }
  
  if (!EMAILJS_TEMPLATE_ID || EMAILJS_TEMPLATE_ID === 'your_template_id') {
    missing.push('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID');
  }
  
  if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'your_public_key') {
    missing.push('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY');
  }

  return {
    isValid: missing.length === 0,
    missing
  };
};

// Interface for email data - updated to match template variables
interface EmailData {
  email: string;        // Changed from to_email to email (matches template {{email}})
  to_name: string;      // Matches template {{to_name}}
  subject: string;      // Matches template {{subject}}
  message: string;      // Matches template {{message}}
  from_name?: string;   // Matches template {{from_name}}
  reply_to?: string;    // Matches template {{reply_to}}
}

// Interface for bulk email data
interface BulkEmailData {
  emails: EmailData[];
  delay?: number; // Delay between emails in milliseconds (to avoid rate limiting)
}

// Single email sending function using EmailJS
export const sendEmailViaEmailJS = async (emailData: EmailData): Promise<{ success: boolean; error?: string; messageId?: string }> => {
  try {
    // Validate configuration first
    const config = validateEmailJSConfig();
    if (!config.isValid) {
      const errorMsg = `EmailJS not configured. Missing: ${config.missing.join(', ')}`;
      console.error('❌ EmailJS Configuration Error:', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }

    // Initialize EmailJS if not already done
    try {
      initializeEmailJS();
      console.log('✅ EmailJS initialized successfully');
    } catch (initError) {
      console.error('❌ EmailJS initialization failed:', initError);
      return {
        success: false,
        error: `EmailJS initialization failed: ${initError instanceof Error ? initError.message : 'Unknown init error'}`
      };
    }

    // Validate email data
    if (!emailData.email || !emailData.email.includes('@')) {
      const errorMsg = 'Invalid recipient email address';
      console.error('❌ EmailJS Validation Error:', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }

    // Prepare template parameters - updated to match template variables
    const templateParams = {
      email: emailData.email,              // Template uses {{email}}
      to_name: emailData.to_name,         // Template uses {{to_name}}
      subject: emailData.subject,         // Template uses {{subject}}
      message: emailData.message,         // Template uses {{message}}
      from_name: emailData.from_name || 'Cloud Institution LMS',    // Template uses {{from_name}}
      reply_to: emailData.reply_to || 'sayeedataj37@gmail.com',     // Template uses {{reply_to}}
    };

    console.log('📧 Sending email via EmailJS:', {
      to: emailData.email,
      subject: emailData.subject,
      service: EMAILJS_SERVICE_ID,
      template: EMAILJS_TEMPLATE_ID,
      publicKey: EMAILJS_PUBLIC_KEY ? '***' + EMAILJS_PUBLIC_KEY.slice(-4) : 'Not set'
    });

    // Additional debugging before send
    console.log('🔍 About to call emailjs.send with:');
    console.log('🔍 Service ID (type):', typeof EMAILJS_SERVICE_ID, EMAILJS_SERVICE_ID);
    console.log('🔍 Template ID (type):', typeof EMAILJS_TEMPLATE_ID, EMAILJS_TEMPLATE_ID);
    console.log('🔍 Template params:', templateParams);
    console.log('🔍 EmailJS init status:', typeof emailjs !== 'undefined');

    // Send email using EmailJS with additional error catching
    console.log('📤 About to call emailjs.send...');
    let response;
    try {
      response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );
      console.log('📥 EmailJS send completed, response:', response);
    } catch (sendError) {
      console.error('❌ EmailJS.send threw an error:', sendError);
      throw sendError; // Re-throw to be caught by outer catch
    }

    console.log('✅ Email sent successfully:', response);

    return {
      success: true,
      messageId: response.text
    };

  } catch (error) {
    // Enhanced error handling for EmailJS errors
    console.error('❌ Failed to send email via EmailJS:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    console.error('❌ Error keys:', error && typeof error === 'object' ? Object.keys(error) : 'N/A');
    console.error('❌ Error prototype:', Object.getPrototypeOf(error));
    
    let errorMessage = 'Unknown error occurred';
    
    if (error && typeof error === 'object') {
      if (error instanceof Error) {
        errorMessage = error.message;
        console.log('📝 Error is instance of Error:', error.message);
      } else if ('text' in error) {
        errorMessage = (error as any).text;
        console.log('📝 Error has text property:', errorMessage);
      } else if ('message' in error) {
        errorMessage = (error as any).message;
        console.log('📝 Error has message property:', errorMessage);
      } else if ('status' in error) {
        errorMessage = `EmailJS Status Error: ${(error as any).status}`;
        console.log('📝 Error has status property:', errorMessage);
      } else {
        // If it's an object but not an Error, stringify it
        try {
          errorMessage = JSON.stringify(error);
          console.log('📝 Error stringified:', errorMessage);
        } catch (stringifyError) {
          errorMessage = 'Error object could not be stringified';
          console.log('📝 Error could not be stringified:', stringifyError);
        }
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
      console.log('📝 Error is string:', errorMessage);
    } else {
      errorMessage = `Unexpected error type: ${typeof error}`;
      console.log('📝 Unexpected error type:', typeof error);
    }

    // Additional debugging for empty objects
    if (errorMessage === '{}' || errorMessage === 'Unknown error occurred') {
      console.log('🔍 Investigating empty error object...');
      console.log('🔍 Error valueOf:', error?.valueOf?.());
      console.log('🔍 Error toString:', error?.toString?.());
      console.log('🔍 Error JSON:', JSON.stringify(error, null, 2));
      
      // Check if this might be a network or CORS issue
      errorMessage = 'EmailJS failed with empty error. This could be due to:\n' +
        '1. Network connectivity issues\n' +
        '2. CORS restrictions\n' +
        '3. Invalid EmailJS configuration\n' +
        '4. EmailJS service unavailable\n' +
        'Check browser console for more details.';
    }

    // Common EmailJS error messages
    if (errorMessage.includes('Public key')) {
      errorMessage = 'Invalid EmailJS public key. Please check your configuration.';
    } else if (errorMessage.includes('Service ID')) {
      errorMessage = 'Invalid EmailJS service ID. Please check your configuration.';
    } else if (errorMessage.includes('Template ID')) {
      errorMessage = 'Invalid EmailJS template ID. Please check your configuration.';
    } else if (errorMessage.includes('Failed to send email')) {
      errorMessage = 'Email sending failed. Please check your EmailJS template and service configuration.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Bulk email sending function with rate limiting
export const sendBulkEmailsViaEmailJS = async (
  bulkData: BulkEmailData,
  onProgress?: (completed: number, total: number, currentEmail: string) => void
): Promise<{
  success: boolean;
  results: { successful: number; failed: number; details: Array<{ email: string; success: boolean; error?: string; messageId?: string }> };
}> => {
  const { emails, delay = 1000 } = bulkData; // Default 1 second delay between emails
  const results: Array<{ email: string; success: boolean; error?: string; messageId?: string }> = [];
  
  console.log(`📧 Starting bulk email send to ${emails.length} recipients`);

  for (let i = 0; i < emails.length; i++) {
    const emailData = emails[i];
    
    // Call progress callback if provided
    if (onProgress) {
      onProgress(i, emails.length, emailData.email);
    }

    // Send individual email
    const result = await sendEmailViaEmailJS(emailData);
    
    results.push({
      email: emailData.email,
      success: result.success,
      error: result.error,
      messageId: result.messageId
    });

    // Add delay between emails to avoid rate limiting (except for the last email)
    if (i < emails.length - 1 && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Calculate summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`📊 Bulk email results: ${successful} successful, ${failed} failed`);

  return {
    success: successful > 0,
    results: {
      successful,
      failed,
      details: results
    }
  };
};

// Helper function to create student email data from student objects
export const createStudentEmailData = (
  students: Array<{ id: string; name: string; username: string }>,
  subject: string,
  message: string
): EmailData[] => {
  return students
    .filter(student => {
      const email = student.username;
      return email && student.name && email.includes('@');
    })
    .map(student => ({
      email: student.username,        // Changed from to_email to email
      to_name: student.name,
      subject,
      message,
      from_name: 'Cloud Institution LMS',
      reply_to: 'sayeedataj37@gmail.com'   // Updated reply_to email
    }));
};

// Export configuration getters for debugging
export const getEmailJSConfig = () => ({
  serviceId: EMAILJS_SERVICE_ID,
  templateId: EMAILJS_TEMPLATE_ID,
  publicKey: EMAILJS_PUBLIC_KEY ? '***' + EMAILJS_PUBLIC_KEY.slice(-4) : 'Not set',
  isConfigured: validateEmailJSConfig().isValid
});

// Debug function to test EmailJS configuration
export const debugEmailJSConfig = () => {
  console.log('🔍 EmailJS Configuration Debug:');
  console.log('Service ID:', EMAILJS_SERVICE_ID);
  console.log('Template ID:', EMAILJS_TEMPLATE_ID);
  console.log('Public Key:', EMAILJS_PUBLIC_KEY ? '***' + EMAILJS_PUBLIC_KEY.slice(-4) : 'Not set');
  console.log('Is browser environment:', typeof window !== 'undefined');
  console.log('EmailJS object available:', typeof emailjs !== 'undefined');
  console.log('EmailJS send function available:', typeof emailjs?.send === 'function');
  console.log('EmailJS init function available:', typeof emailjs?.init === 'function');
  
  // Test environment variables are being read correctly
  console.log('🔍 Raw environment variables:');
  console.log('NEXT_PUBLIC_EMAILJS_SERVICE_ID:', process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID);
  console.log('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID:', process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID);
  console.log('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY:', process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ? '***' + process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY.slice(-4) : 'Not set');
  
  const validation = validateEmailJSConfig();
  console.log('Configuration valid:', validation.isValid);
  if (!validation.isValid) {
    console.log('Missing configuration:', validation.missing);
  }
  
  return validation;
};

// Simple test function for debugging EmailJS
export const testEmailJSBasic = async () => {
  console.log('🧪 Starting basic EmailJS test...');
  
  try {
    const config = debugEmailJSConfig();
    if (!config.isValid) {
      return { success: false, error: 'Configuration invalid' };
    }

    initializeEmailJS();

    const testParams = {
      email: 'test@example.com',        // Changed from to_email to email
      to_name: 'Test User',
      subject: 'Test Email',
      message: 'This is a test message',
      from_name: 'Test Sender',
      reply_to: 'sayeedataj37@gmail.com'
    };

    console.log('🧪 Calling emailjs.send with minimal params...');
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      testParams
    );

    console.log('🧪 Test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('🧪 Test failed:', error);
    return { success: false, error };
  }
};
