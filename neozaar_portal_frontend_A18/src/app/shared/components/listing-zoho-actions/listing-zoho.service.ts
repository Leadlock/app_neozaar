import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Thin client for the two catalog "share" endpoints, used by ListingZohoActionsComponent
// so the product / service / solution list pages don't each need their own copy.
@Injectable({ providedIn: 'root' })
export class ListingZohoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  pushToZoho(id: number, force = false): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/zoho-campaign`, { force });
  }

  sendEmail(id: number, payload: { subject: string; recipients: string[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/send-email`, payload);
  }
}
