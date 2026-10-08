import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AffiliateService } from '../../core/services/affiliate/affiliate.service';

@Component({
  selector: 'app-affiliate-scope', standalone: true, imports: [CommonModule, FormsModule],
  template: `@if (isManager) {
    <div class="form-group">
      <label class="form-label" for="affiliate-scope">Affiliate account</label>
      <select id="affiliate-scope" class="neo-select" [(ngModel)]="selected" (ngModelChange)="changed.emit(selected)">
        <option [ngValue]="undefined">{{ defaultLabel }}</option>
        @for (affiliate of affiliates; track affiliate.id) {
          <option [ngValue]="affiliate.id">{{ affiliate.name }}</option>
        }
      </select>
      @if (error) { <p role="alert">{{ error }}</p> }
    </div>
  }`
})
export class AffiliateScopeComponent implements OnInit {
  private auth = inject(AuthService);
  private svc = inject(AffiliateService);
  @Output() changed = new EventEmitter<number | undefined>();
  @Input() defaultLabel = 'All affiliates (new records use my database)';
  selected: number | undefined;
  affiliates: any[] = [];
  error = '';
  get isManager() { return ['A_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(this.auth.user?.role_type || ''); }
  ngOnInit() {
    if (this.isManager) this.svc.getAffiliates({ limit: 1000 }).subscribe({
      next: res => { this.affiliates = res.data || []; },
      error: () => { this.error = 'Unable to load affiliates.'; }
    });
  }
}
