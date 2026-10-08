import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BundleService{
private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient, ) { }



getBundleList(type: string): Observable<any>;
getBundleList(params: {
  type?: string;
  status?: string;
  search?: string;
  cloud_provider?: string;
  supported_regions?: string;
  page?: number;
  limit?: number;
}): Observable<any>;
getBundleList(arg: any): Observable<any> {
  let httpParams = new HttpParams();
  let type: string | undefined;

  if (typeof arg === 'string') {
    type = arg; // direct type
  } else {
    if (arg.type) type = arg.type;
    if (arg.page) httpParams = httpParams.set('page', arg.page.toString());
    if (arg.limit) httpParams = httpParams.set('limit', arg.limit.toString());
    if (arg.search) httpParams = httpParams.set('search', arg.search);
    if (arg.status) httpParams = httpParams.set('status', arg.status);
    if (arg.cloud_provider) httpParams = httpParams.set('cloud_provider', arg.cloud_provider);
    if (arg.supported_regions) httpParams = httpParams.set('supported_regions', arg.supported_regions);

  }

  return this.http.get(`${this.apiUrl}catalog/${type ?? ''}`, { params: httpParams });
}


  getBundleById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/bundle/${id}`);
  }

  createbundle(product:any):Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/create/bundle`, product);
  }
 
  updatBundle(id: any, product: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/update/bundle/${id}`, product);
  }

 deleteBundle(bundleId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/bundle/${bundleId}/delete`);
  }

  approveBundle(bundleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${bundleId}/approve`, { approve: true, type: 'bundle' });
  }

} 
