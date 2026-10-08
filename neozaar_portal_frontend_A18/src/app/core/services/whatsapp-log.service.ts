import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Authenticated client for the WhatsApp conversation log and agent inbox
 * (backend: /api/internal/whatsapp, SUPER_ADMIN only).
 */
@Injectable({ providedIn: 'root' })
export class WhatsappLogService {
  private base = `${environment.apiUrl}internal/whatsapp`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<any> {
    return this.http.get(`${this.base}/stats`);
  }

  getContacts(params: {
    q?: string;
    page?: number;
    limit?: number;
    opted_out?: string;
    mode?: string;
    unread?: string;
    leads?: string;
  }): Observable<any> {
    return this.http.get(`${this.base}/contacts`, {
      params: new HttpParams({ fromObject: this.clean(params) }),
    });
  }

  getConversation(
    phone: string,
    params: { before?: number; limit?: number } = {}
  ): Observable<any> {
    return this.http.get(`${this.base}/conversations/${encodeURIComponent(phone)}`, {
      params: new HttpParams({ fromObject: this.clean(params) }),
    });
  }

  exportConversation(phone: string, format: 'csv' | 'json'): Observable<Blob> {
    return this.http.get(`${this.base}/conversations/${encodeURIComponent(phone)}/export`, {
      params: { format },
      responseType: 'blob',
    });
  }

  agentAction(phone: string, action: 'takeover' | 'release' | 'messages' | 'read', body: any = {}): Observable<any> {
    return this.http.post(`${this.base}/conversations/${encodeURIComponent(phone)}/${action}`, body);
  }

  deleteConversation(
    phone: string,
    opts: { contact?: boolean; reason?: string } = {}
  ): Observable<any> {
    const params: Record<string, string> = {};
    if (opts.contact) params['contact'] = 'true';
    if (opts.reason) params['reason'] = opts.reason;
    return this.http.delete(`${this.base}/conversations/${encodeURIComponent(phone)}`, { params });
  }

  private clean(o: Record<string, any>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of Object.keys(o || {})) {
      if (o[k] !== null && o[k] !== undefined && o[k] !== '') out[k] = String(o[k]);
    }
    return out;
  }
}
