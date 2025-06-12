// Type declarations for external modules
declare module 'lucide-react';
declare module 'date-fns';
declare module 'file-saver';
declare module 'xlsx';
declare module 'firebase/storage';
declare module 'next';
declare module 'next/navigation';
declare module 'next/link';
declare module 'next/font/google';
declare module 'monaco-editor/esm/vs/editor/editor.api';

// Add the MonacoEnvironment property to the Window interface
interface Window {
  MonacoEnvironment?: {
    getWorkerUrl: (moduleId: string, label: string) => string;
  };
}
