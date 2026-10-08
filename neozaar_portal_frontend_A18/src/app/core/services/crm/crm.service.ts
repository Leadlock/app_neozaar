import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private base = `${environment.apiUrl}internal/crm`;

  constructor(private http: HttpClient) {}

  // Dashboard — pass optional view_as userId for admin scoped view
  getDashboard(viewAsId?: number): Observable<any> {
    if (viewAsId) {
      return this.http.get(`${this.base}/dashboard`, { params: { view_as: String(viewAsId) } });
    }
    return this.http.get(`${this.base}/dashboard`);
  }

  // Users & Permissions
  getUsers(): Observable<any>                     { return this.http.get(`${this.base}/users`); }
  updateUserRole(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/users/${id}/role`, data); }
  getUserPermissions(id: number): Observable<any> { return this.http.get(`${this.base}/users/${id}/permissions`); }
  updateUserPermissions(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/users/${id}/permissions`, data); }

  // Quotes
  getQuotes(): Observable<any>                    { return this.http.get(`${this.base}/quotes`); }
  createQuote(data: any): Observable<any>         { return this.http.post(`${this.base}/quotes`, data); }
  updateQuote(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/quotes/${id}`, data); }
  deleteQuote(id: number): Observable<any>        { return this.http.delete(`${this.base}/quotes/${id}`); }
  sendQuote(id: number): Observable<any>          { return this.http.post(`${this.base}/quotes/${id}/send`, {}); }

  // Leads
  getLeads(params: any): Observable<any> {
    return this.http.get(`${this.base}/leads`, { params: new HttpParams({ fromObject: params }) });
  }
  getLeadById(id: number): Observable<any>       { return this.http.get(`${this.base}/leads/${id}`); }
  createLead(data: any): Observable<any>          { return this.http.post(`${this.base}/leads`, data); }
  updateLead(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/leads/${id}`, data); }
  deleteLead(id: number): Observable<any>         { return this.http.delete(`${this.base}/leads/${id}`); }
  assignLead(id: number, data: any): Observable<any> { return this.http.post(`${this.base}/leads/${id}/assign`, data); }
  convertLead(id: number): Observable<any>        { return this.http.post(`${this.base}/leads/${id}/convert`, {}); }

  // Accounts
  getAccounts(params?: any): Observable<any>      { return this.http.get(`${this.base}/accounts`, { params }); }
  getAccountById(id: number): Observable<any>     { return this.http.get(`${this.base}/accounts/${id}`); }
  createAccount(data: any): Observable<any>       { return this.http.post(`${this.base}/accounts`, data); }
  updateAccount(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/accounts/${id}`, data); }
  deleteAccount(id: number): Observable<any>      { return this.http.delete(`${this.base}/accounts/${id}`); }

  // Contacts
  getContacts(params?: any): Observable<any>      { return this.http.get(`${this.base}/contacts`, { params }); }
  getContactById(id: number): Observable<any>     { return this.http.get(`${this.base}/contacts/${id}`); }
  createContact(data: any): Observable<any>       { return this.http.post(`${this.base}/contacts`, data); }
  updateContact(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/contacts/${id}`, data); }
  deleteContact(id: number): Observable<any>      { return this.http.delete(`${this.base}/contacts/${id}`); }

  // Opportunities
  getOpportunities(params?: any): Observable<any> { return this.http.get(`${this.base}/opportunities`, { params }); }
  getOpportunityById(id: number): Observable<any> { return this.http.get(`${this.base}/opportunities/${id}`); }
  createOpportunity(data: any): Observable<any>   { return this.http.post(`${this.base}/opportunities`, data); }
  updateOpportunity(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/opportunities/${id}`, data); }
  changeOpportunityStage(id: number, stage: string, stage_notes?: string, lost_reason?: string): Observable<any> {
    return this.http.patch(`${this.base}/opportunities/${id}/stage`, { stage, stage_notes, lost_reason });
  }
  deleteOpportunity(id: number): Observable<any>  { return this.http.delete(`${this.base}/opportunities/${id}`); }

  // Activities
  getActivities(params?: any): Observable<any>    { return this.http.get(`${this.base}/activities`, { params }); }
  createActivity(data: any): Observable<any>      { return this.http.post(`${this.base}/activities`, data); }
  deleteActivity(id: number): Observable<any>     { return this.http.delete(`${this.base}/activities/${id}`); }

  // Tasks
  getTasks(params?: any): Observable<any>         { return this.http.get(`${this.base}/tasks`, { params }); }
  createTask(data: any): Observable<any>          { return this.http.post(`${this.base}/tasks`, data); }
  updateTask(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/tasks/${id}`, data); }
  deleteTask(id: number): Observable<any>         { return this.http.delete(`${this.base}/tasks/${id}`); }

  // Scoring
  getScoringHistory(leadId: number): Observable<any> { return this.http.get(`${this.base}/scoring/history/${leadId}`); }
  recordScoringEvent(data: any): Observable<any>     { return this.http.post(`${this.base}/scoring/event`, data); }

  // Audit Logs
  getAuditLogs(params?: any): Observable<any> {
    return this.http.get(`${this.base}/audit-logs`, { params: new HttpParams({ fromObject: params }) });
  }

  // Trash
  getTrash(): Observable<any>              { return this.http.get(`${this.base}/trash`); }
  purgeTrash(body: any): Observable<any>  { return this.http.delete(`${this.base}/trash/purge`, { body }); }
}
