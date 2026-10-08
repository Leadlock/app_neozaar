import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Types (mirror the backend marketing tables) ──────────────────────────────
export interface MarketingDashboard {
  totalContacts: number;
  newContacts30d: number;
  knownContacts: number;
  anonymousVisitors: number;
  marketingQualified: number;
  avgMarketingScore: number;
  eventsLast30d: number;
  campaignsTotal: number;
  campaignsPushed: number;
  campaignLinkViews: number;
  campaignLinkViews30d: number;
  campaignLinkClicks: number;
  campaignLinkCount: number;
  lifecycle: { visitor: number; subscriber: number; lead: number; mql: number; sql: number; customer: number };
  sources: { source: string; contacts: number }[];
  recentEvents: MarketingEvent[];
  crmHotLeads?: number;
}

export interface MarketingContact {
  id: number;
  crm_contact_id: number | null;
  contact_name?: string;
  contact_email?: string;
  mkt_email?: string;
  company?: string;
  industry?: string;
  marketing_score: number;
  lifecycle_stage: string;
  last_source?: string;
  last_activity_at?: string;
  email_consent: boolean;
  do_not_contact: boolean;
  created_at: string;
}

export interface MarketingEvent {
  id: number;
  event_type: string;
  ref_type?: string;
  ref_id?: number;
  url?: string;
  channel?: string;
  score_delta?: number;
  metadata?: any;
  occurred_at: string;
}

export interface MarketingTag {
  id: number;
  name: string;
  color?: string;
  contact_count: number;
}

export interface SegmentRule {
  field: string;
  op: string;
  value: any;
}
export interface MarketingSegment {
  id?: number;
  name: string;
  description?: string;
  rules: { match: 'all' | 'any'; rules: SegmentRule[] };
  is_dynamic?: boolean;
  member_count?: number;
  created_by_name?: string;
  updated_at?: string;
  last_evaluated_at?: string | null;
  evaluation_status?: 'evaluating' | 'ready' | 'failed';
  evaluation_error?: string | null;
  next_refresh_at?: string | null;
}

export interface MarketingScoringRule {
  id: number;
  event_type: string;
  score_delta: number;
  description?: string;
  is_active: boolean;
  priority?: number;
  conditions?: Record<string, any>;
}
export interface MarketingAutomation { id?:number;name:string;description?:string;trigger_type?:string;trigger_config?:any;definition:{start?:string;nodes:any[]};status:'draft'|'active'|'paused'|'archived';version?:number;updated_at?:string; }

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private base = `${environment.apiUrl}marketing`;

  constructor(private http: HttpClient) {}

  // Angular's HttpParams (built from a plain object) does not drop
  // undefined/null values the way callers here assume — it stringifies them
  // to the literal text "undefined"/"null", which then fails backend query
  // validation (e.g. stage=undefined is not a real lifecycle stage). Every
  // params-object call site in this service passes `field || undefined` to
  // mean "omit if unset", so strip those out here once rather than at each
  // call site.
  private cleanParams(params?: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    if (!params) return out;
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      out[key] = String(value);
    }
    return out;
  }

  // Dashboard
  getDashboard(): Observable<any> {
    return this.http.get(`${this.base}/dashboard`);
  }

  // Contacts
  getContacts(params?: { search?: string; stage?: string; limit?: number; offset?: number }): Observable<any> {
    return this.http.get(`${this.base}/contacts`, { params: this.cleanParams(params) });
  }
  getContactTimeline(id: number, params?: { eventType?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }): Observable<any> {
    return this.http.get(`${this.base}/contacts/${id}/timeline`, { params: this.cleanParams(params) });
  }

  // Tags
  getTags(): Observable<any> {
    return this.http.get(`${this.base}/tags`);
  }
  createTag(payload: { name: string; color?: string }): Observable<any> {
    return this.http.post(`${this.base}/tags`, payload);
  }
  deleteTag(id: number): Observable<any> {
    return this.http.delete(`${this.base}/tags/${id}`);
  }
  bulkTag(payload: { contactIds: number[]; tagId: number; action: 'add'|'remove' }): Observable<any> {
    return this.http.post(`${this.base}/tags/bulk`, payload);
  }
  getTagRules(): Observable<any> { return this.http.get(`${this.base}/tag-rules`); }
  createTagRule(payload: any): Observable<any> { return this.http.post(`${this.base}/tag-rules`, payload); }
  deleteTagRule(id: number): Observable<any> { return this.http.delete(`${this.base}/tag-rules/${id}`); }

  // Segments
  getSegments(): Observable<any> {
    return this.http.get(`${this.base}/segments`);
  }
  createSegment(payload: Partial<MarketingSegment>): Observable<any> {
    return this.http.post(`${this.base}/segments`, payload);
  }
  updateSegment(id: number, payload: Partial<MarketingSegment>): Observable<any> {
    return this.http.put(`${this.base}/segments/${id}`, payload);
  }
  deleteSegment(id: number): Observable<any> {
    return this.http.delete(`${this.base}/segments/${id}`);
  }
  previewSegment(id: number): Observable<any> {
    return this.http.get(`${this.base}/segments/${id}/preview`);
  }
  previewSegmentRules(rules: MarketingSegment['rules']): Observable<any> {
    return this.http.post(`${this.base}/segments/preview`, { rules });
  }
  refreshSegment(id: number): Observable<any> {
    return this.http.post(`${this.base}/segments/${id}/refresh`, {});
  }

  // Scoring rules
  getScoringRules(): Observable<any> {
    return this.http.get(`${this.base}/scoring-rules`);
  }
  createScoringRule(payload: any): Observable<any> {
    return this.http.post(`${this.base}/scoring-rules`, payload);
  }
  updateScoringRule(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.base}/scoring-rules/${id}`, payload);
  }
  deleteScoringRule(id: number): Observable<any> {
    return this.http.delete(`${this.base}/scoring-rules/${id}`);
  }
  getScoringModels(): Observable<any> { return this.http.get(`${this.base}/scoring-models`); }
  rebuildContactScore(id: number): Observable<any> {
    return this.http.post(`${this.base}/scoring/rebuild/${id}`, {});
  }
  getAutomations():Observable<any>{return this.http.get(`${this.base}/automations`);}
  createAutomation(payload:any):Observable<any>{return this.http.post(`${this.base}/automations`,payload);}
  updateAutomation(id:number,payload:any):Observable<any>{return this.http.put(`${this.base}/automations/${id}`,payload);}
  getEmailTemplates():Observable<any>{return this.http.get(`${this.base}/email/templates`);}
  createEmailTemplate(payload:any):Observable<any>{return this.http.post(`${this.base}/email/templates`,payload);}
  updateEmailTemplate(id:number,payload:any):Observable<any>{return this.http.put(`${this.base}/email/templates/${id}`,payload);}
  validateEmailTemplate(payload:any):Observable<any>{return this.http.post(`${this.base}/email/templates/validate`,payload);}
  getEmailTemplateVersions(id:number):Observable<any>{return this.http.get(`${this.base}/email/templates/${id}/versions`);}
  sendTestEmail(id:number,payload:any):Observable<any>{return this.http.post(`${this.base}/email/templates/${id}/test`,payload);}
  getEmailAnalytics(templateId?:number):Observable<any>{return this.http.get(`${this.base}/email/analytics`,{params:this.cleanParams({templateId})});}
  queueEmail(payload:any):Observable<any>{return this.http.post(`${this.base}/email/send`,payload);}
  getSenderProfiles():Observable<any>{return this.http.get(`${this.base}/email/senders`);}
  createSenderProfile(payload:any):Observable<any>{return this.http.post(`${this.base}/email/senders`,payload);}
  updateSenderProfile(id:number,payload:any):Observable<any>{return this.http.put(`${this.base}/email/senders/${id}`,payload);}
  deleteSenderProfile(id:number):Observable<any>{return this.http.delete(`${this.base}/email/senders/${id}`);}
  getSubscriptionTypes():Observable<any>{return this.http.get(`${this.base}/email/subscription-types`);}
  createSubscriptionType(payload:{code:string;name:string}):Observable<any>{return this.http.post(`${this.base}/email/subscription-types`,payload);}
  updateSubscriptionType(id:number,payload:{name:string}):Observable<any>{return this.http.put(`${this.base}/email/subscription-types/${id}`,payload);}
  deleteSubscriptionType(id:number):Observable<any>{return this.http.delete(`${this.base}/email/subscription-types/${id}`);}
  getForms():Observable<any>{return this.http.get(`${this.base}/forms`);}
  createForm(payload:any):Observable<any>{return this.http.post(`${this.base}/forms`,payload);}
  updateForm(id:number,payload:any):Observable<any>{return this.http.put(`${this.base}/forms/${id}`,payload);}
  getJourneys():Observable<any>{return this.http.get(`${this.base}/platform/journeys`);}
  saveJourney(payload:any,id?:number):Observable<any>{return id?this.http.put(`${this.base}/platform/journeys/${id}`,payload):this.http.post(`${this.base}/platform/journeys`,payload);}
  getExperiments():Observable<any>{return this.http.get(`${this.base}/platform/experiments`);}
  createExperiment(payload:any):Observable<any>{return this.http.post(`${this.base}/platform/experiments`,payload);}
  updateExperiment(id:number,payload:any):Observable<any>{return this.http.put(`${this.base}/platform/experiments/${id}`,payload);}
  deleteExperiment(id:number):Observable<any>{return this.http.delete(`${this.base}/platform/experiments/${id}`);}
  getExperimentMetrics(id:number):Observable<any>{return this.http.get(`${this.base}/platform/experiments/${id}/metrics`);}
  recordExperimentEvent(id:number,payload:any):Observable<any>{return this.http.post(`${this.base}/platform/experiments/${id}/events`,payload);}
  getChannelTemplates(channel?:string):Observable<any>{return this.http.get(`${this.base}/platform/channels/templates`,{params:this.cleanParams({channel})});}
  saveChannelTemplate(payload:any,id?:number):Observable<any>{return id?this.http.put(`${this.base}/platform/channels/templates/${id}`,payload):this.http.post(`${this.base}/platform/channels/templates`,payload);}
  deleteChannelTemplate(id:number):Observable<any>{return this.http.delete(`${this.base}/platform/channels/templates/${id}`);}
  getChannelPolicies():Observable<any>{return this.http.get(`${this.base}/platform/channels/policies`);}
  saveChannelPolicy(channel:string,payload:any):Observable<any>{return this.http.put(`${this.base}/platform/channels/policies/${channel}`,payload);}
  getOutboundAudit(params?:any):Observable<any>{return this.http.get(`${this.base}/platform/channels/audit`,{params:this.cleanParams(params)});}
  getMarketingAnalytics():Observable<any>{return this.http.get(`${this.base}/platform/analytics`);}
  getWorkerHealth():Observable<any>{return this.http.get(`${this.base}/platform/health`);}
  getExecutionLogs(params?:any):Observable<any>{return this.http.get(`${this.base}/platform/execution-logs`,{params});}
  getSettings():Observable<any>{return this.http.get(`${this.base}/platform/settings`);}
  saveSetting(key:string,value:any,isSecret=false):Observable<any>{return this.http.put(`${this.base}/platform/settings/${key}`,{value,isSecret});}
  runRetention(policy:any):Observable<any>{return this.http.post(`${this.base}/platform/retention/run`,policy);}

  // Permissions (grants requireMarketingPermission() checks in
  // marketing.middleware.js — manager-only to grant/revoke)
  getUserPermissions():Observable<any>{return this.http.get(`${this.base}/permissions`);}
  grantUserPermission(userId:number,permission:string):Observable<any>{return this.http.post(`${this.base}/permissions`,{userId,permission});}
  revokeUserPermission(userId:number,permission:string):Observable<any>{return this.http.delete(`${this.base}/permissions/${userId}/${permission}`);}

  getAssets():Observable<any>{return this.http.get(`${this.base}/content/assets`);}
  saveAsset(payload:any,id?:number):Observable<any>{return id?this.http.put(`${this.base}/content/assets/${id}`,payload):this.http.post(`${this.base}/content/assets`,payload);}
  deleteAsset(id:number):Observable<any>{return this.http.delete(`${this.base}/content/assets/${id}`);}
  getLandingPages():Observable<any>{return this.http.get(`${this.base}/content/pages`);}
  saveLandingPage(payload:any,id?:number):Observable<any>{return id?this.http.put(`${this.base}/content/pages/${id}`,payload):this.http.post(`${this.base}/content/pages`,payload);}
  deleteLandingPage(id:number):Observable<any>{return this.http.delete(`${this.base}/content/pages/${id}`);}
  getCustomFields():Observable<any>{return this.http.get(`${this.base}/contact-admin/fields`);}
  saveCustomField(payload:any):Observable<any>{return this.http.post(`${this.base}/contact-admin/fields`,payload);}
  importContacts(rows:any[]):Observable<any>{return this.http.post(`${this.base}/contact-admin/import`,{rows});}
  exportContacts():Observable<any>{return this.http.get(`${this.base}/contact-admin/export`);}
  updateMarketingContact(id:number,payload:any):Observable<any>{return this.http.put(`${this.base}/contact-admin/${id}`,payload);}
  getContactNotes(id:number):Observable<any>{return this.http.get(`${this.base}/contact-admin/${id}/notes`);}
  addContactNote(id:number,note:string):Observable<any>{return this.http.post(`${this.base}/contact-admin/${id}/notes`,{note});}

  // Event ingest
  recordEvent(payload: {
    marketingContactId?: number;
    anonymousId?: string;
    eventType: string;
    refType?: string;
    refId?: number;
    url?: string;
    channel?: string;
    metadata?: any;
  }): Observable<any> {
    return this.http.post(`${this.base}/events`, payload);
  }
}
