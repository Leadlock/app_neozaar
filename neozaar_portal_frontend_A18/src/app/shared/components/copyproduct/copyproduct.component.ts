import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService } from '../../../pages/product/product-service.service';
import { ServiceService  } from '../../../pages/service/service.service';
import { SolutionserviceService } from '../../../pages/solution/solutionservice.service';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

interface CopyableItem {
  id: number;
  user_id: string;
  action_type: 'product' | 'service' | 'solution';
  name: string;
  brand_name: string;
  short_description: string;
  long_description?: string;
  primary_use_cases?: string;
  key_features?: string | string[];
  technical_prerequisites?: string;
  demo_video_link?: string;
  api_metering_endpoint?: string;
  terms_of_use_url?: string;
  privacy_policy_url?: string;
  oem_sku?: string;
  starting_price?: string;
  action_for?: string;
  pricing_model?: string;
  consent_data_privacy_policy?: boolean;
  accept_marketplace_terms?: boolean;
  is_feature?: boolean;
  cta_model?: string[];
  target_audience?: string[];
  target_segments?: string[];
  category?: string[];
  category_subcategory?: string[];
  regions_supported?: string[];
  cloud_provider_support?: string[];
  compliance_certifications?: string[];
  product_logo?: string | null;
  screenshots?: string[] | null;
  brochures?: string[] | null;
  customer_case_studies?: string[] | null;
  sla_documents?: string[] | null;
  // Service / Solution specific
  overview?: string;
  scope?: string;
  approach?: string;
  outcome?: string[];
  challenges_addressed?: string;
  solution_differentiator?: string;
  why_choose_neozaar?: string;
  coverage?: string;
  co_selling_partners?: string[];
  // Missing fields
  industry?: string[];
  extraDataForServiceSolution?: {
    overview?: string;
    scope?: string;
    approach?: string;
    outcome?: string | string[];
    challenges_addressed?: string;
    solution_differentiator?: string;
    why_choose_neozaar?: string;
    coverage?: string | string[];
  };
  [key: string]: any;
}

@Component({
  selector: 'app-copyproduct',
  standalone: true,
 template: `
    <button
      (click)="copyItem()"
      [disabled]="isLoading"
      class="px-4 py-3 bg-green-100 text-md text-green-700 rounded-lg  disabled:bg-gray-400">
      @if (isLoading) {
        Copying...
      } @else {
        <i class="ri-file-copy-line"></i>
      }
    </button>
  `,
  styles: []
})
export class CopyproductComponent {
  @Input() itemId!: number;
  @Output() copied = new EventEmitter<number>();
  @Output() error = new EventEmitter<string>();

  isLoading = false;

  constructor(
    private productService: ProductService,
    private serviceService: ServiceService,
    private solutionService: SolutionserviceService,
    private authService: AuthService,
    private router: Router
  ) {}

  copyItem(): void {
    if (!this.itemId) {
      this.error.emit('No item ID provided');
      return;
    }
    this.isLoading = true;

    this.productService.getProductById(this.itemId).pipe(
      switchMap((response: any) => {
        const original: CopyableItem = response.data;
        return this.downloadAllMedia(original).pipe(
          switchMap(uploadedFiles => {
            const formData = this.buildFormData(original, uploadedFiles);
            switch (original.action_type) {
              case 'product': return this.productService.createProduct(formData);
              case 'service': return this.serviceService.createService(formData);
              case 'solution': return this.solutionService.createProduct(formData);
              default: throw new Error(`Unknown action_type: ${original.action_type}`);
            }
          })
        );
      }),
      catchError(err => {
        this.isLoading = false;
        const errorMsg = err.error?.message || err.message || 'Failed to copy item';
        this.error.emit(errorMsg);
        console.error(err);
        return of(null);
      })
    ).subscribe(created => {
      this.isLoading = false;
      if (created && created.status === 'success') {
        this.copied.emit(created.data.id);
        let editPath = '/products/edit';
        if (created.data.action_type === 'service') editPath = '/service/edit';
        if (created.data.action_type === 'solution') editPath = '/solution/edit';
        this.router.navigate([editPath, created.data.id]);
      } else if (created === null) {
        // error already emitted
      } else {
        this.error.emit('Copy failed: ' + (created?.message || 'Unknown error'));
      }
    });
  }

  private getMimeTypeFromUrl(url: string, defaultMime: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', pdf: 'application/pdf',
      doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain'
    };
    return ext && mimeMap[ext] ? mimeMap[ext] : defaultMime;
  }

  private fetchBlob(url: string, mimeType: string): Observable<Blob> {
    let proxyUrl = url;
    if (url.includes('neozaarassets.blob.core.windows.net')) {
      proxyUrl = url.replace('https://neozaarassets.blob.core.windows.net', '/azure-blob');
    }
    return from(fetch(proxyUrl).then(async res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      const blob = await res.blob();
      if (blob.type === 'application/octet-stream' || blob.type === '') {
        return new Blob([blob], { type: mimeType });
      }
      return blob;
    }));
  }

  private downloadAllMedia(original: CopyableItem): Observable<any> {
    const downloadTasks: Observable<{ fieldName: string; file: File; index?: number }>[] = [];

    const addTask = (url: string | null | undefined, fieldName: string, idx?: number) => {
      if (!url) return;
      const mime = this.getMimeTypeFromUrl(url, fieldName.includes('logo') ? 'image/jpeg' : 'application/pdf');
      downloadTasks.push(
        this.fetchBlob(url, mime).pipe(
          map(blob => {
            const ext = url.split('.').pop() || (fieldName.includes('logo') ? 'jpg' : 'pdf');
            const fileName = idx !== undefined ? `${fieldName}_${idx}.${ext}` : `${fieldName}.${ext}`;
            const file = new File([blob], fileName, { type: mime });
            return { fieldName, file, index: idx };
          })
        )
      );
    };

    addTask(original.product_logo, 'product_logo');
    original.screenshots?.forEach((url, i) => addTask(url, 'screenshots', i));
    original.brochures?.forEach((url, i) => addTask(url, 'brochures', i));
    original.customer_case_studies?.forEach((url, i) => addTask(url, 'customer_case_studies', i));
    original.sla_documents?.forEach((url, i) => addTask(url, 'sla_documents', i));

    if (downloadTasks.length === 0) return of({});

    return forkJoin(downloadTasks).pipe(
      map(results => {
        const filesMap: any = {
          product_logo: null,
          screenshots: [],
          brochures: [],
          customer_case_studies: [],
          sla_documents: []
        };
        results.forEach(({ fieldName, file, index }) => {
          if (fieldName === 'product_logo') filesMap.product_logo = file;
          else if (Array.isArray(filesMap[fieldName])) filesMap[fieldName].push(file);
        });
        return filesMap;
      })
    );
  }

  private buildFormData(original: CopyableItem, uploadedFiles: any): FormData {
    const formData = new FormData();
    const userId = this.authService.getCurrentUser()?.id || (this.authService as any).userId;
    if (!userId) console.warn('User ID not found');

    // ----- Common fields -----
    formData.append('user_id', userId || '');
    formData.append('action_type', original.action_type === 'solution' ? 'solution' : original.action_type);
    formData.append('action_for', original.action_for || 'customer');
    formData.append('name', `${original.name} - copy`);
    formData.append('brand_name', original.brand_name || '');
    formData.append('short_description', original.short_description || '');
    formData.append('technical_prerequisites', original.technical_prerequisites || '');
    formData.append('demo_video_link', original.demo_video_link || '');
    formData.append('api_metering_endpoint', original.api_metering_endpoint || '');
    formData.append('terms_of_use_url', original.terms_of_use_url || '');
    formData.append('privacy_policy_url', original.privacy_policy_url || '');
    formData.append('oem_sku', original.oem_sku || '');
    formData.append('starting_price', original.starting_price || '0');
    formData.append('pricing_model', original.pricing_model || '');
    formData.append('is_feature', String(original.is_feature || false));
    formData.append('consent_data_privacy_policy', String(original.consent_data_privacy_policy || false));
    formData.append('accept_marketplace_terms', String(original.accept_marketplace_terms || false));

    // ----- Arrays (top-level) -----
    const appendJson = (key: string, value: any) => {
      if (value && Array.isArray(value) && value.length) formData.append(key, JSON.stringify(value));
    };
    appendJson('cta_model', original.cta_model);
    appendJson('target_audience', original.target_audience);
    appendJson('target_segments', original.target_segments);
    appendJson('category', original.category);
    appendJson('category_subcategory', original.category_subcategory);
    appendJson('regions_supported', original.regions_supported);
    appendJson('cloud_provider_support', original.cloud_provider_support);
    appendJson('compliance_certifications', original.compliance_certifications);
    appendJson('co_selling_partners', original.co_selling_partners);
    appendJson('industry', original.industry);   // ✅ missing field added

    // ----- Key features -----
    let keyFeatures = original.key_features;
    if (Array.isArray(keyFeatures)) keyFeatures = keyFeatures.join(', ');
    formData.append('key_features', keyFeatures || ' ');

    // ----- long_description & primary_use_cases (for any type) -----
    if (original.long_description) formData.append('long_description', original.long_description);
    if (original.primary_use_cases) formData.append('primary_use_cases', original.primary_use_cases);
    if (original.solution_differentiator) formData.append('solution_differentiator', original.solution_differentiator);

    // ----- Service / Solution nested details (extraDataForServiceSolution) -----
    const details = original.extraDataForServiceSolution || {} as any;

    if (original.action_type === 'service' || original.action_type === 'solution') {
      let serviceSolutionDetails: any = {};

      // Read from either the nested object or top-level fallback
      const getDetail = (field: string) => details[field] || (original as any)[field] || '';

      if (original.action_type === 'service') {
        serviceSolutionDetails = {
          overview: getDetail('overview'),
          scope: getDetail('scope'),
          approach: getDetail('approach'),
          outcome: this.normalizeOutcome(getDetail('outcome')),
          challenges_addressed: getDetail('challenges_addressed'),
          solution_differentiator: getDetail('solution_differentiator'),
          why_choose_neozaar: getDetail('why_choose_neozaar'),
          coverage: getDetail('coverage') || ''   // string for service
        };
      } else { // solution
        serviceSolutionDetails = {
          overview: getDetail('overview'),
          scope: getDetail('scope'),
          approach: getDetail('approach'),
          outcome: this.normalizeOutcome(getDetail('outcome')),
          challenges_addressed: getDetail('challenges_addressed'),
          solution_differentiator: getDetail('solution_differentiator'),
          why_choose_neozaar: getDetail('why_choose_neozaar'),
          coverage: Array.isArray(getDetail('coverage')) ? getDetail('coverage') : []  // array for solution
        };
      }

      formData.append('service_solution_details', JSON.stringify(serviceSolutionDetails));
    }

    // ----- Append files -----
    if (uploadedFiles.product_logo) formData.append('product_logo', uploadedFiles.product_logo);
    uploadedFiles.screenshots?.forEach((file: File) => formData.append('screenshots', file));
    uploadedFiles.brochures?.forEach((file: File) => formData.append('brochures', file));
    uploadedFiles.customer_case_studies?.forEach((file: File) => formData.append('customer_case_studies', file));
    uploadedFiles.sla_documents?.forEach((file: File) => formData.append('sla_documents', file));

    return formData;
  }

  // Helper to ensure outcome is always an array (handles JSON strings)
  private normalizeOutcome(outcome: any): string[] {
    if (!outcome) return [];
    if (Array.isArray(outcome)) return outcome;
    if (typeof outcome === 'string') {
      try {
        const parsed = JSON.parse(outcome);
        return Array.isArray(parsed) ? parsed : [outcome];
      } catch {
        return [outcome];
      }
    }
    return [];
  }
}
