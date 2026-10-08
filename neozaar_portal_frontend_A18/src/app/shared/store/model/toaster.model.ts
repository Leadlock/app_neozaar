export interface Toaster {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'request' | 'default';
}
