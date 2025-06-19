declare module 'xlsx/xlsx.mjs' {
  export function json_to_sheet(data: any[], opts?: any): any;
  export function book_new(): any;
  export function book_append_sheet(wb: any, ws: any, name?: string): any;
  export function sheet_to_csv(ws: any): string;
  export const write: (wb: any, opts: any) => any;
}
