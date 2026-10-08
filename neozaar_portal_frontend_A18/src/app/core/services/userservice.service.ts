import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole } from '../modal/user.modal';
import { Observable, tap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class UserserviceService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';


  // private router = inject(Router);
  // private toasterService = inject(ToasterService);

  apiUrl = environment.apiUrl

  constructor(private http: HttpClient) { }

  getisvdetail(id: number) {
    return this.http.get(`${this.apiUrl}user/isv-user/${id}`);
  }


  approveuser(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}user/approval/${userId}`);
  }

  /** Call backend to get ISV list with pagination */
  getisv(params: any): Observable<any> {
    const httpParams = new HttpParams()
    return this.http.get(`${this.apiUrl}user/isv-users?`, { params });
  }
  getisvapproved(params: any): Observable<any> {
    const httpParams = new HttpParams()
    return this.http.get(`${this.apiUrl}user/isv-users?status=approved`, { params })
  }
  getpartners(
    // params: { page: number; limit: number }
  ): Observable<any> {
    const httpParams = new HttpParams()
    // .set('page', params.page)
    // .set('limit', params.limit);

    return this.http.get(`${this.apiUrl}user/partner-users`, { params: httpParams });
  }
  getdashboard(): Observable<any> {
    const httpParams = new HttpParams()
    return this.http.get(`${this.apiUrl}dashboard`, { params: httpParams });
  }

  getLeadDataFilter(days:any): Observable<any> {
    const httpParams = new HttpParams()
    return this.http.get(`${this.apiUrl}dashboard/leads/funnel?days=${days}`, { params: httpParams });
  }
  // applycommition():Observable<any>{
  //   const httpParams = new HttpParams()
  //   return this.http.post(`${this.apiUrl}commision/create`,{params:httpParams})
  // }
  applycommition(payload: any) {
    return this.http.post(`${this.apiUrl}commision/create`, payload);

  }
verfyisv(id: number, formData: FormData) {
  return this.http.post(
    `${this.apiUrl}user/update/isv-by-admin/${id}`,
    formData,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    }
  );
}

  getusers() {
    return this.http.get(`${this.apiUrl}user`)
  }
  deleteIsv(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}user/delete-isv`, payload);
  }

  inactiveIsv(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}user/update-isv-inactive`, payload);
  }

}
