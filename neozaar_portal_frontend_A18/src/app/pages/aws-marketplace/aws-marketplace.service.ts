import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AwsRequestStatus =
  | 'ALL'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'VALIDATING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'REJECTED';

export type ProductEditableField = 'privacy_policy_url' | 'terms_of_use_url' | 'short_description' | 'long_description';

export interface AwsMarketplaceRequest {
  id: number;
  marketplace_type: string;
  product_id: number;
  isv_user_id: number;
  requested_by_user_id: number;
  reviewed_by_user_id?: number;
  status: AwsRequestStatus;
  rejection_reason?: string;
  aws_product_type?: string;
  aws_entity_id?: string;
  aws_product_id?: string;
  aws_change_set_id?: string;
  visibility?: string;
  submitted_at?: string;
  validated_at?: string;
  published_at?: string;
  failed_at?: string;
  validation_errors?: any;
  aws_response?: any;
  aws_payload?: any;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_logo?: string;
  isv_name?: string;
  requested_by_name?: string;
  reviewed_by_name?: string;
  audit?: AwsAuditEntry[];
}

export interface AwsAuditEntry {
  id: number;
  request_id: number;
  user_id?: number;
  actor_name?: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  aws_response?: any;
  error_info?: any;
  created_at: string;
}

export interface AwsDimension {
  name: string;
  description?: string;
  key: string;
  unit?: string;
  types?: string[];
}

export interface AwsSpecificConfig {
  productType?: string;                 // SaaSProduct (v1)
  logoUrl?: string;
  fulfillmentUrl?: string;
  supportDescription?: string;
  categories?: string[];
  highlights?: string[];
  searchKeywords?: string[];
  dimensions?: AwsDimension[];
  pricingModel?: 'usage' | 'contract';
  currencyCode?: string;
  rateCards?: any[];
  freeTrial?: boolean;
  eulaType?: 'StandardEula' | 'CustomEula';
  eulaUrl?: string;
  refundPolicy?: string;
}

export interface ListRequestsParams {
  status?: AwsRequestStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListRequestsResponse {
  status: string;
  data: AwsMarketplaceRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class AwsMarketplaceService {
  private readonly apiUrl = environment.apiUrl + 'aws-marketplace';

  constructor(private http: HttpClient) {}

  /**
   * Create a new publishing request for a product. ISV or Admin.
   */
  createRequest(productId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests`, { product_id: productId });
  }

  /**
   * List all requests with optional filters. Admin only.
   */
  listRequests(params?: ListRequestsParams): Observable<ListRequestsResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<ListRequestsResponse>(`${this.apiUrl}/requests`, { params: httpParams });
  }

  /**
   * Get full detail of a single request. Admin only.
   */
  getRequestById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/requests/${id}`);
  }

  /**
   * Reject a request. Admin only.
   */
  rejectRequest(id: number, rejectionReason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${id}/reject`, { rejection_reason: rejectionReason });
  }

  /**
   * Approve and submit a request to AWS Marketplace. Admin only.
   */
  approveAndSubmit(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${id}/approve-submit`, {});
  }

  /**
   * Poll the AWS change-set status. Admin only.
   */
  pollJobStatus(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/requests/${id}/poll`);
  }

  /**
   * Retry a failed request. Admin only.
   */
  retryRequest(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${id}/retry`, {});
  }

  /**
   * Re-push current product data + saved config to an already-published listing.
   * Admin only. Only valid when the request is PUBLISHED.
   */
  updateListing(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${id}/update-listing`, {});
  }

  /**
   * Save AWS-specific config fields filled in by the admin.
   * Does NOT submit to AWS — only persists the config.
   */
  saveConfig(id: number, config: AwsSpecificConfig): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/config`, config);
  }

  /**
   * Edit the NeoZaar product fields the listing is built from (descriptions, URLs).
   * Updates the product itself; returns the refreshed request.
   */
  updateProductFields(id: number, fields: Partial<Record<ProductEditableField, string>>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/product-fields`, fields);
  }

  /**
   * Upload a listing logo. It is normalised to PNG, stored in S3 (AWS Marketplace
   * only accepts S3-hosted media), and the S3 URL is saved onto the request.
   * Returns { data: { logoUrl, payload } }.
   */
  uploadLogo(id: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('logo', file);
    return this.http.post(`${this.apiUrl}/requests/${id}/logo`, form);
  }

  /**
   * Get the AWS Marketplace request status for a given product.
   */
  getProductRequestStatus(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/product-status/${productId}`);
  }
}
