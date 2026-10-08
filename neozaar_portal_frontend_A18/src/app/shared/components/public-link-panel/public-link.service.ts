import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type PublicLinkTargetType = 'listing' | 'campaign';

export interface PublicLink {
  id: number | string;
  slug: string;
  url: string;                 // full public URL, built server-side from FRONTEND_URL
  label: string | null;
  target_type: PublicLinkTargetType;
  target_id: number;
  is_active: boolean;
  expires_at: string | null;
  unlisted: boolean;
  live: boolean;
  views: number;
  cta_clicks: number;
  ctr: number;
  created_at: string;
  deactivated_at: string | null;
}

export interface PublicLinkAnalytics {
  link: Pick<PublicLink, 'id' | 'slug' | 'label' | 'url' | 'live' | 'is_active' | 'expires_at' | 'created_at'>;
  range_days: number;
  totals: { views: number; unique_views: number; cta_clicks: number; ctr: number };
  by_day: { date: string; views: number }[];
  by_block: { listingId: number | null; name: string | null; clicks: number }[];
}

export interface CreatePublicLinkPayload {
  targetType: PublicLinkTargetType;
  targetId: number;
  label?: string;
  slug?: string;
  unlisted?: boolean;
  expiresAt?: string | null;
}

// Thin client for /api/public-links — used by PublicLinkPanelComponent from the
// campaigns list and the product / service / solution list pages.
@Injectable({ providedIn: 'root' })
export class PublicLinkService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(targetType: PublicLinkTargetType, targetId: number): Observable<any> {
    const params = new HttpParams().set('targetType', targetType).set('targetId', String(targetId));
    return this.http.get(`${this.apiUrl}public-links`, { params });
  }

  create(payload: CreatePublicLinkPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}public-links`, payload);
  }

  update(id: number | string, patch: { isActive?: boolean; label?: string | null; expiresAt?: string | null }): Observable<any> {
    return this.http.patch(`${this.apiUrl}public-links/${id}`, patch);
  }

  remove(id: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}public-links/${id}`);
  }

  analytics(id: number | string, range = '30d'): Observable<any> {
    const params = new HttpParams().set('range', range);
    return this.http.get(`${this.apiUrl}public-links/${id}/analytics`, { params });
  }
}
