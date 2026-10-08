import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Read-only client for the Consent Audit Console
 * (backend: /api/admin/consent, SUPER_ADMIN only).
 *
 * This surfaces the Data Fiduciary's consent register — it is NOT a
 * DPDP "Consent Manager" (a Board-registered entity).
 */
export interface ConsentFilters {
  from?: string;
  to?: string;
  country?: string;
  sourceApp?: string;
  action?: string;
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class ConsentAuditService {
  private base = `${environment.apiUrl}admin/consent`;

  constructor(private http: HttpClient) {}

  overview(filters: ConsentFilters = {}): Observable<any> {
    return this.http.get(`${this.base}/overview`, { params: this.params(filters) });
  }

  events(filters: ConsentFilters = {}, limit = 50, offset = 0): Observable<any> {
    return this.http.get(`${this.base}/events`, {
      params: this.params({ ...filters, limit, offset }),
    });
  }

  exportCsv(filters: ConsentFilters = {}): Observable<Blob> {
    return this.http.get(`${this.base}/events/export.csv`, {
      params: this.params(filters),
      responseType: 'blob',
    });
  }

  subject(id: string): Observable<any> {
    return this.http.get(`${this.base}/subjects/${encodeURIComponent(id)}`);
  }

  notices(): Observable<any> {
    return this.http.get(`${this.base}/notices`);
  }

  notice(version: string, locale: string): Observable<any> {
    return this.http.get(
      `${this.base}/notices/${encodeURIComponent(version)}/${encodeURIComponent(locale)}`
    );
  }

  integrity(): Observable<any> {
    return this.http.get(`${this.base}/integrity`);
  }

  dsar(status = ''): Observable<any> {
    return this.http.get(`${this.base}/dsar`, {
      params: status ? new HttpParams().set('status', status) : new HttpParams(),
    });
  }

  private params(o: Record<string, any>): HttpParams {
    let p = new HttpParams();
    for (const k of Object.keys(o || {})) {
      const v = o[k];
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return p;
  }
}
