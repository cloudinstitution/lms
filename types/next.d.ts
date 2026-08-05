// This type definition file helps TypeScript understand the Next.js modules
declare module 'next/server' {
  import { NextRequest as OriginalNextRequest } from 'next/types';
  
  export type NextRequest = OriginalNextRequest;
  
  export class NextResponse {
    static json(body: any, init?: ResponseInit): Response;
  }
}
