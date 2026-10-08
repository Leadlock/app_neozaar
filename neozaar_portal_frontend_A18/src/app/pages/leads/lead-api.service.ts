import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface LeadParams {
  page?: number;
  limit?: number;
  search?: string;
  source?: string; // 'direct' | 'affiliate'
}

export interface LeadResponse {
  leads: {
    data: any[];
    pagination: {
      total: number;
      total_pages: number;
      page: number;
      limit: number;
      current_page: number;
      next_page: number | null;
      prev_page: number | null;
      pages: number[];
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class LeadApiService {

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient) { }


  getLeads(params?: LeadParams): Observable<LeadResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.source) httpParams = httpParams.set('source', params.source);
    }
    
    return this.http.get<LeadResponse>(`${this.apiUrl}lead/get-all`, { params: httpParams });
  }


  getLeadDetail(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}lead/${id}/get-by-id`);
  }

  // Optional: Add assign lead method
  assignLead(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}lead/assign`, data);
  }

  updateStatus(data:any,id:any){
    return this.http.post(`${this.apiUrl}lead/${id}/update/status`,data);
  }
  getleaddetail(id:any){
    return this.http.get(`${this.apiUrl}lead/${id}/get-by-id`);
  }

  // Send a lead to the CRM system
  sendToCrm(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}internal/crm/leads`, data);
  }
}
