import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * AffiliateService
 * ──────────────────────────────────────────────────────────────
 * All API calls to /api/affiliate/* endpoints.
 * Handles both affiliate-own views and manager/admin views.
 */
@Injectable({ providedIn: 'root' })
export class AffiliateService {
  private base = `${environment.apiUrl}affiliate`;

  constructor(private http: HttpClient) {}

  // ── Dashboards ───────────────────────────────────────────────
  getAffiliateDashboard(): Observable<any> {
    return this.http.get(`${this.base}/dashboard`);
  }
  getManagerDashboard(): Observable<any> {
    return this.http.get(`${this.base}/manager-dashboard`);
  }
  getSuperAdminProgress(): Observable<any> {
    return this.http.get(`${this.base}/superadmin-progress`);
  }

  // ── Affiliate Management ─────────────────────────────────────
  getAffiliates(params?: any): Observable<any> {
    return this.http.get(`${this.base}/affiliates`, { params });
  }
  getAffiliateById(id: number): Observable<any> {
    return this.http.get(`${this.base}/affiliates/${id}`);
  }
  createAffiliate(data: any): Observable<any> {
    return this.http.post(`${this.base}/affiliates`, data);
  }
  updateAffiliate(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/affiliates/${id}`, data);
  }
  setAffiliateStatus(id: number, is_active: boolean): Observable<any> {
    return this.http.post(`${this.base}/affiliates/${id}/status`, { is_active });
  }
  reassignCustomer(id: number, data: any): Observable<any> {
    return this.http.post(`${this.base}/affiliates/${id}/reassign-customer`, data);
  }
  getAttributionConflicts(affiliateId?: number): Observable<any> {
    if (affiliateId) {
      return this.http.get(`${this.base}/affiliates/${affiliateId}/attribution-conflicts`);
    }
    return this.http.get(`${this.base}/conflicts`);
  }

  // ── Assignments ──────────────────────────────────────────────
  getAssignments(affiliateId: number): Observable<any> {
    return this.http.get(`${this.base}/affiliates/${affiliateId}/assignments`);
  }
  addAssignment(affiliateId: number, data: any): Observable<any> {
    return this.http.post(`${this.base}/affiliates/${affiliateId}/assignments`, data);
  }
  removeAssignment(affiliateId: number, assignId: number): Observable<any> {
    return this.http.delete(`${this.base}/affiliates/${affiliateId}/assignments/${assignId}`);
  }

  // ── Links ────────────────────────────────────────────────────
  getLinks(affiliateId: number): Observable<any> {
    return this.http.get(`${this.base}/affiliates/${affiliateId}/links`);
  }
  createLink(affiliateId: number, data: any): Observable<any> {
    return this.http.post(`${this.base}/affiliates/${affiliateId}/links`, data);
  }

  // ── Customers / Opportunities / Scores ───────────────────────
  getRegistrations(params?: any): Observable<any> {
    return this.http.get(`${this.base}/registrations`, { params });
  }
  getCustomers(params?: any): Observable<any> {
    return this.http.get(`${this.base}/customers`, { params });
  }
  getOpportunities(params?: any): Observable<any> {
    return this.http.get(`${this.base}/opportunities`, { params });
  }
  getCustomerScores(params?: any): Observable<any> {
    return this.http.get(`${this.base}/customer-scores`, { params });
  }

  // ── Database ─────────────────────────────────────────────────
  getContacts(params?: any): Observable<any> {
    return this.http.get(`${this.base}/database`, { params });
  }
  getDatabaseStats(affiliateId?: number): Observable<any> {
    return this.http.get(`${this.base}/database/stats${affiliateId ? "?affiliate_id=" + affiliateId : ""}`);
  }
  addContact(data: any, affiliateId?: number): Observable<any> {
    return this.http.post(`${this.base}/database/contacts${affiliateId ? "?affiliate_id=" + affiliateId : ""}`, data);
  }
  importContacts(contacts: any[], affiliateId?: number): Observable<any> {
    return this.http.post(`${this.base}/database/import${affiliateId ? "?affiliate_id=" + affiliateId : ""}`, { contacts });
  }
  deleteContact(id: number, affiliateId?: number): Observable<any> {
    return this.http.delete(`${this.base}/database/contacts/${id}${affiliateId ? "?affiliate_id=" + affiliateId : ""}`);
  }

  // ── Campaigns ────────────────────────────────────────────────
  getCampaigns(params?: any): Observable<any> {
    return this.http.get(`${this.base}/campaigns`, { params });
  }
  getCampaignById(id: number): Observable<any> {
    return this.http.get(`${this.base}/campaigns/${id}`);
  }
  createCampaign(data: any, affiliateId?: number): Observable<any> {
    return this.http.post(`${this.base}/campaigns${affiliateId ? "?affiliate_id=" + affiliateId : ""}`, data);
  }
  updateCampaign(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/campaigns/${id}`, data);
  }
  sendCampaign(id: number, contact_ids?: number[]): Observable<any> {
    return this.http.post(`${this.base}/campaigns/${id}/send`, contact_ids?.length ? { contact_ids } : {});
  }
  getCampaignSends(id: number): Observable<any> {
    return this.http.get(`${this.base}/campaigns/${id}/sends`);
  }

  // ── Admin / Audit ────────────────────────────────────────────
  getAuditLog(params?: any): Observable<any> {
    return this.http.get(`${this.base}/audit-log`, { params });
  }
}
