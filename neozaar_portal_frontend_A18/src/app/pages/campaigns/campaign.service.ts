import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CampaignBlock {
  listingId: number;
  actionType: 'product' | 'service' | 'solution';
  // No left/right layout field here on purpose — the backend computes each block's side
  // fresh from its live position every render (see campaignComposer.js), so removing or
  // reordering blocks can never leave a stale, desynced value.
  // Empty until the admin uploads a square photo for this block (see campaign-create's
  // uploadImage) — until then it renders the "upload a square photo" placeholder.
  image: string;
}

export interface Campaign {
  id?: number;
  title: string;
  description?: string;
  // Optional banner image + its click-through target — rendered below the title/
  // description and above the listings. header_link is only kept when header_image is set.
  header_image?: string | null;
  header_link?: string | null;
  blocks: CampaignBlock[];
  status?: 'draft' | 'pushed';
  zoho_campaign_key?: string | null;
  zoho_campaign_pushed_at?: string | null;
  zoho_list_label?: string | null;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
  segment_id?: number | null;
  email_template_id?: number | null;
  automation_id?: number | null;
  scheduled_at?: string | null;
  goal_event?: string | null;
  campaign_type?: 'listing' | 'studio';
  subject?: string | null;
  preheader?: string | null;
  content_blocks?: any[];
  html_content?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCampaigns(): Observable<any> {
    return this.http.get(`${this.apiUrl}campaigns`);
  }

  // Single source of truth for which optional text fields exist per action_type —
  // mirrors AVAILABLE_FIELDS in the backend's campaignTemplate.js, so the composer's
  // field-toggle checkboxes can never offer something the renderer doesn't understand.
  getAvailableFields(): Observable<any> {
    return this.http.get(`${this.apiUrl}campaigns/available-fields`);
  }

  getTemplateRecommendations(payload: { title: string; subject: string; preheader: string; segmentId: number | null }): Observable<any> {
    return this.http.post(`${this.apiUrl}campaigns/template-recommendations`, payload);
  }

  getCampaignById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}campaigns/${id}`);
  }

  createCampaign(payload: Partial<Campaign>): Observable<any> {
    return this.http.post(`${this.apiUrl}campaigns`, payload);
  }

  updateCampaign(id: number, payload: Partial<Campaign>): Observable<any> {
    return this.http.put(`${this.apiUrl}campaigns/${id}`, payload);
  }

  deleteCampaign(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}campaigns/${id}`);
  }

  // Returns the rendered HTML as text — fetched via HttpClient (not a plain window.open
  // URL) specifically so the auth interceptor attaches the token; the endpoint is
  // authenticated, unlike the public /content route Zoho itself fetches.
  previewCampaign(id: number): Observable<string> {
    return this.http.get(`${this.apiUrl}campaigns/${id}/preview`, { responseType: 'text' });
  }

  pushCampaign(id: number, payload: { campaignName: string; subject: string; whichList: string; force?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}campaigns/${id}/push`, payload);
  }

  // Sends the saved campaign straight to the given addresses with a custom subject,
  // bypassing Zoho — a test send / internal share.
  sendCampaignEmail(id: number, payload: { subject: string; recipients: string[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}campaigns/${id}/send-email`, payload);
  }

  // Uploads a block's square photo immediately (not deferred to campaign save) and
  // returns its hosted URL — the auth interceptor attaches the token as usual; only the
  // Content-Type is left for the browser to set (with its multipart boundary) rather
  // than HttpClient's default JSON header.
  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post(`${this.apiUrl}campaigns/upload-image`, formData);
  }
}
