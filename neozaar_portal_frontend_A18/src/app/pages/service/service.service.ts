import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient,) { }

getServiceList(type: string): Observable<any>;
getServiceList(params: {
  type?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  cloud_provider?: string;
  filter?: any;
  aws_services?: string;
  azure_services?: string;
  action_for?: 'customer' | 'ISV' | 'both' | 'all';
  is_feature?: boolean;
}): Observable<any>;
getServiceList(params: any | string): Observable<any> {
  const type = typeof params === 'string' ? params : params.type ?? '';

  let httpParams = new HttpParams()
    .set('action_type', 'service');

  const actionFor =
    typeof params !== 'string' && params.action_for
      ? params.action_for
      : 'all';

  httpParams = httpParams.set('action_for', actionFor);

  if (typeof params !== 'string') {
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.cloud_provider) httpParams = httpParams.set('cloud_provider', params.cloud_provider);
    if (params.aws_services) httpParams = httpParams.set('aws_services', params.aws_services);
    if (params.azure_services) httpParams = httpParams.set('azure_services', params.azure_services);
    if (params.is_feature !== undefined) httpParams = httpParams.set('is_feature', params.is_feature);

    if (params.filter) {
      httpParams = httpParams.set('filter', JSON.stringify(params.filter));
    }
  }

  const url = `${this.apiUrl}catalog/${type}`;
  return this.http.get(url, { params: httpParams });
}



getServicesearch(search: string): Observable<any> {
  let httpParams = new HttpParams();

  if (search) {
    httpParams = httpParams.set('search', search);
  }

  return this.http.get(`${this.apiUrl}catalog`, { params: httpParams });
}
getContacts():Observable<any>{
    return this.http.get(`${this.apiUrl}catalog/support-info`)
}


  getcategory():Observable<any>{
return this.http.get(`${this.apiUrl}catalog/categories`);
  }
  getaws():Observable<any>{
return this.http.get(`${this.apiUrl}catalog/cloud/platforms`);
  }
  getazure():Observable<any>{
return this.http.get(`${this.apiUrl}catalog/azure/services`);
  }
  getServiceById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/product/${id}`);
  }

  getBundleById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/bundle/${id}`);
  }

 
  createService(product: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/create/product`, product);
  }

  updateService(id: any, product: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/update/product/${id}`, product);
  }

  // Tags-only update. Uses the dedicated endpoint so editing tags never changes
  // the item's publish / draft / approval status.
  updateTags(id: any, tags: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/tags`, { tags });
  }
savePricing(payload: any) {
  return this.http.post(`${this.apiUrl}pricing/create`, payload);
}

savebulkdata(payload:any){
return this.http.post(`${this.apiUrl}catalog/product/bulk-upload`,payload);
}
  deleteService(serviceId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/product/${serviceId}/delete`, {});
  }
publishItem(id: number, type: 'product' | 'bundle', publish: boolean): Observable<any> {
  const payload = {
    type,
    publish,
    status: publish ? 'Published' : 'Unpublished'
  };

  return this.http.post(`${this.apiUrl}catalog/${id}/publish`, payload);
}
draftItem(id: number, type: 'product' | 'bundle'): Observable<any> {
  const payload = {
    type,
    is_draft: true,
    status: 'Draft'
  };
  return this.http.post(`${this.apiUrl}catalog/${id}/draft`, payload);
}

updateProductStatus(id: any, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/publish`, payload);
  }
updateRejectStatus(id: any, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/approve`, payload);
  }

acceptItem(id: number, type: 'product' | 'bundle', approve: boolean, remark: string = ''): Observable<any> {
  const payload = {
    type,
    approve, // true = approved, false = rejected
    status: approve ? 'Approved' : 'Rejected',
    remark: approve ? '' : remark
  };
  return this.http.post(`${this.apiUrl}catalog/${id}/approve`, payload);
}
  deleteProduct(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/product/${productId}/delete`, {});
  }

getServicePrice(productId: number): Observable<any> {
  const payload = {
  action_id: productId,
    action_type: 'product'
  };

  const headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  return this.http.post(`${this.apiUrl}pricing/getByProduct`, payload, { headers });
}

toggleFeatureStatus(id: number, payload: { type: string; is_feature: boolean }): Observable<any> {
  return this.http.post(`${this.apiUrl}catalog/${id}/feature`, payload);
}

pushToZoho(id: number, force: boolean = false): Observable<any> {
  return this.http.post(`${this.apiUrl}catalog/${id}/zoho-campaign`, { force });
}

}
