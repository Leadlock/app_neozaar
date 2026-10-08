import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SolutionserviceService {
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) { }

  // ============= Existing Methods =============
  getProductList(type: string): Observable<any>;
  getProductList(params: {
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
  getProductList(params: any | string): Observable<any> {
    let type = typeof params === 'string' ? params : params.type ?? '';
    let httpParams = new HttpParams()
      .set('action_type', 'solution');
    
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

  getProductsearch(search: string): Observable<any> {
    let httpParams = new HttpParams();
    if (search) {
      httpParams = httpParams.set('search', search);
    }
    return this.http.get(`${this.apiUrl}catalog`, { params: httpParams });
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

getbrandname(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/all-brands`);
  } 

  getazure(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/azure/services`);
  }

  getProductById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/product/${id}`);
  }

  getBundleById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/bundle/${id}`);
  }

  createbundle(product: any): Observable<any> {
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

  savePricing(payload: any) {
    return this.http.post(`${this.apiUrl}pricing/create`, payload);
  }

  savebulkdata(payload: any) {
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
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.apiUrl}pricing/getByProduct`, payload, { headers });
  }

  // ============= NEW ADMIN APIs =============

  // Admin Dashboard Stats
  getAdminDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}admin/dashboard/stats`);
  }

  // Get all users (with pagination and filters)
  getAllUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.role) httpParams = httpParams.set('role', params.role);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
      if (params.order) httpParams = httpParams.set('order', params.order);
    }
    
    return this.http.get(`${this.apiUrl}admin/users`, { params: httpParams });
  }

  // Get user by ID
  getUserById(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}admin/users/${userId}`);
  }

  // Create new user (admin only)
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}admin/users`, userData);
  }

  // Update user
  updateUser(userId: number, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}admin/users/${userId}`, userData);
  }

  // Delete user
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}admin/users/${userId}`);
  }

  // Change user status (activate/deactivate)
  changeUserStatus(userId: number, isActive: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}admin/users/${userId}/status`, { is_active: isActive });
  }

  // Get all ISVs for admin approval
  getISVList(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'all';
    sort_by?: string;
    order?: 'asc' | 'desc';
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
      if (params.order) httpParams = httpParams.set('order', params.order);
    }
    
    return this.http.get(`${this.apiUrl}admin/isvs`, { params: httpParams });
  }

  // Approve/Reject ISV
  approveISV(isvId: number, isApproved: boolean, remark?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}admin/isvs/${isvId}/approve`, {
      is_approved: isApproved,
      remark: remark || ''
    });
  }

  // Get all leads for admin
  getAllLeads(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
    type?: 'demo' | 'buy_now' | 'contact_us';
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
      if (params.order) httpParams = httpParams.set('order', params.order);
    }
    
    return this.http.get(`${this.apiUrl}admin/leads`, { params: httpParams });
  }

  // Get lead by ID
  getLeadById(leadId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}admin/leads/${leadId}`);
  }

  // Update lead status
  updateLeadStatus(leadId: number, status: string, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}admin/leads/${leadId}/status`, {
      status: status,
      notes: notes || ''
    });
  }

  // Assign lead to user
  assignLead(leadId: number, assignTo: number): Observable<any> {
    return this.http.post(`${this.apiUrl}admin/leads/${leadId}/assign`, {
      assigned_to: assignTo
    });
  }

  // Get system logs/audit trail
  getSystemLogs(params?: {
    page?: number;
    limit?: number;
    user_id?: number;
    action_type?: string;
    start_date?: string;
    end_date?: string;
    module?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.user_id) httpParams = httpParams.set('user_id', params.user_id.toString());
      if (params.action_type) httpParams = httpParams.set('action_type', params.action_type);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.module) httpParams = httpParams.set('module', params.module);
      if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
      if (params.order) httpParams = httpParams.set('order', params.order);
    }
    
    return this.http.get(`${this.apiUrl}admin/logs`, { params: httpParams });
  }

  // Get revenue reports
  getRevenueReports(params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date?: string;
    end_date?: string;
    product_type?: 'product' | 'bundle' | 'all';
    status?: 'all' | 'active' | 'inactive';
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.period) httpParams = httpParams.set('period', params.period);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.product_type) httpParams = httpParams.set('product_type', params.product_type);
      if (params.status) httpParams = httpParams.set('status', params.status);
    }
    
    return this.http.get(`${this.apiUrl}admin/reports/revenue`, { params: httpParams });
  }

  // Get product performance reports
  getProductPerformance(params?: {
    page?: number;
    limit?: number;
    category?: string;
    cloud_provider?: string;
    sort_by?: 'views' | 'leads' | 'revenue' | 'name';
    order?: 'asc' | 'desc';
    start_date?: string;
    end_date?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.cloud_provider) httpParams = httpParams.set('cloud_provider', params.cloud_provider);
      if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
      if (params.order) httpParams = httpParams.set('order', params.order);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
    }
    
    return this.http.get(`${this.apiUrl}admin/reports/products/performance`, { params: httpParams });
  }

  // Export data
  exportData(type: 'users' | 'leads' | 'products' | 'isvs' | 'revenue', format: 'csv' | 'excel' | 'pdf', params?: any): Observable<Blob> {
    let httpParams = new HttpParams()
      .set('type', type)
      .set('format', format);
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get(`${this.apiUrl}admin/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  // System settings
  getSystemSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}admin/settings`);
  }

  updateSystemSettings(settings: any): Observable<any> {
    return this.http.put(`${this.apiUrl}admin/settings`, settings);
  }

  // Get notifications
  getAdminNotifications(params?: {
    page?: number;
    limit?: number;
    is_read?: boolean;
    type?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.is_read !== undefined) httpParams = httpParams.set('is_read', params.is_read.toString());
      if (params.type) httpParams = httpParams.set('type', params.type);
    }
    
    return this.http.get(`${this.apiUrl}admin/notifications`, { params: httpParams });
  }

  // Mark notification as read
  markNotificationAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}admin/notifications/${notificationId}/read`, {});
  }

  // Mark all notifications as read
  markAllNotificationsAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}admin/notifications/read-all`, {});
  }

  // Upload banner/image
  uploadBanner(imageFile: File, type: 'banner' | 'logo' | 'hero'): Observable<any> {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('type', type);
    
    return this.http.post(`${this.apiUrl}admin/upload/banner`, formData);
  }

  // Get uploaded banners
  getBanners(type?: 'banner' | 'logo' | 'hero'): Observable<any> {
    let httpParams = new HttpParams();
    if (type) {
      httpParams = httpParams.set('type', type);
    }
    return this.http.get(`${this.apiUrl}admin/banners`, { params: httpParams });
  }

  // Delete banner
  deleteBanner(bannerId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}admin/banners/${bannerId}`);
  }

  // Get activity feed
  getActivityFeed(params?: {
    page?: number;
    limit?: number;
    user_id?: number;
    module?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.user_id) httpParams = httpParams.set('user_id', params.user_id.toString());
      if (params.module) httpParams = httpParams.set('module', params.module);
    }
    
    return this.http.get(`${this.apiUrl}admin/activity-feed`, { params: httpParams });
  }

  // Send bulk notification/email
  sendBulkNotification(payload: {
    recipients: 'all' | 'isv' | 'customer' | number[];
    subject: string;
    message: string;
    type: 'email' | 'notification' | 'both';
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}admin/notifications/bulk`, payload);
  }

  // Get subscription plans
  getSubscriptionPlans(): Observable<any> {
    return this.http.get(`${this.apiUrl}admin/subscription/plans`);
  }

  // Create/Update subscription plan
  saveSubscriptionPlan(planData: any, planId?: number): Observable<any> {
    if (planId) {
      return this.http.put(`${this.apiUrl}admin/subscription/plans/${planId}`, planData);
    } else {
      return this.http.post(`${this.apiUrl}admin/subscription/plans`, planData);
    }
  }

  // Delete subscription plan
  deleteSubscriptionPlan(planId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}admin/subscription/plans/${planId}`);
  }

  // Get API usage analytics
  getApiAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    endpoint?: string;
    user_type?: 'all' | 'isv' | 'customer' | 'admin';
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.endpoint) httpParams = httpParams.set('endpoint', params.endpoint);
      if (params.user_type) httpParams = httpParams.set('user_type', params.user_type);
    }
    
    return this.http.get(`${this.apiUrl}admin/analytics/api`, { params: httpParams });
  }

  getallbrandname(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/all-brands`);
  }

  toggleFeatureStatus(id: number, payload: { type: string; is_feature: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/feature`, payload);
  }

  pushToZoho(id: number, force: boolean = false): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog/${id}/zoho-campaign`, { force });
  }
}
