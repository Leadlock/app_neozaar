// src/app/services/category.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
  subcategories: Subcategory[];
  totalSubcategories: number;
  isSelected?: boolean;
}

export interface Subcategory {
  id: number;
  cat_id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) { }

  getProductList(type: string): Observable<any>;
  getProductList(params: {
    type?: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    cloud_provider?: string;
    brand?: string;
    filter?: any;
    aws_services?: string;
    azure_services?: string;
    is_feature?: boolean;
  }): Observable<any>;
  getProductList(params: any | string): Observable<any> {
    let type = typeof params === 'string' ? params : params.type ?? '';
    let httpParams = new HttpParams({ fromObject: {} });

    if (typeof params !== 'string') {
      if (params.page) httpParams = httpParams.set('page', params.page);
      if (params.limit) httpParams = httpParams.set('limit', params.limit);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.cloud_provider) httpParams = httpParams.set('cloud_provider', params.cloud_provider);
      if (params.brand) httpParams = httpParams.set('brand', params.brand);
      if (params.aws_services) httpParams = httpParams.set('aws_services', params.aws_services);
      if (params.azure_services) httpParams = httpParams.set('azure_services', params.azure_services);
      if (params.is_feature !== undefined) httpParams = httpParams.set('is_feature', params.is_feature);
    }

    let url = `${this.apiUrl}catalog/${type}`;

    // Manual filter appending (raw JSON, no encoding)
    if (typeof params !== 'string' && params.filter) {
      url += `?${httpParams.toString()}&filter=${JSON.stringify(params.filter)}`;
    } else if (httpParams.toString()) {
      url += `?${httpParams.toString()}`;
    }

    return this.http.get(url);
  }

  getProductsearch(search: string): Observable<any> {
    let httpParams = new HttpParams();
    
    if (search) {
      httpParams = httpParams.set('search', search);
    }
    
    return this.http.get(`${this.apiUrl}catalog`, { params: httpParams });
  }

  getcatsubcat(): Observable<any> {
    return this.http.get(`${this.apiUrl}categories/get-all/associate`);

  }

  getContacts(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/support-info`);
  }

  getcategory(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/categories`);
  }
  
  getaws(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/cloud/platforms`);
  }
  
  getazure(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/azure/services`);
  }
  getBrands(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/all-brands`);
  }

getmyvendor(searchTerm: string = ''): Observable<any> {
    let params = new HttpParams();
    if (searchTerm) {
      params = params.set('brand_name', searchTerm);
    }
    return this.http.get(`${this.apiUrl}catalog/all-brands`, { params });
  }

  
  getProductById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/product/${id}`);
  }

  getBundleById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/bundle/${id}`);
  }

  createBundle(product: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/create/bundle`, product);
  }
  
  createProduct(product: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/create/product`, product);
  }

  updateProduct(id: any, product: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/update/product/${id}`, product);
  }

  // Tags-only update. Uses the dedicated endpoint so editing tags never changes
  // the item's publish / draft / approval status.
  updateTags(id: any, tags: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/tags`, { tags });
  }
  
  savePricing(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}pricing/create`, payload);
  }

  saveBulkData(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/product/bulk-upload`, payload);
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

  toggleFeatureStatus(id: number, payload: { type: string; is_feature: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/feature`, payload);
  }

  pushToZoho(id: number, force: boolean = false): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/zoho-campaign`, { force });
  }

  acceptItem(id: number, type: 'product' | 'bundle', approve: boolean, remark: string = ''): Observable<any> {
    const payload = {
      type,
      approve,
      status: approve ? 'Approved' : 'Rejected',
      remark: approve ? '' : remark
    };
    return this.http.post(`${this.apiUrl}catalog/${id}/approve`, payload);
  }
  
  deleteProduct(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/product/${productId}/delete`, {});
  }

  getProductPrice(productId: number): Observable<any> {
    const payload = {
      action_id: productId,
      action_type: 'product'
    };
    
    return this.http.post(`${this.apiUrl}pricing/getByProduct`, payload);
  }
}
