import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../core/services/crm/crm.service';

@Component({
  selector: 'app-crm-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-audit-logs.component.html'
})
export class CrmAuditLogsComponent implements OnInit {
  private crmService: CrmService = inject(CrmService);
  logs: any[] = [];
  loading = false;
  filters = { entity_type: '', page: 1, limit: 50 };

  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.crmService.getAuditLogs(this.filters).subscribe({
      next: (res: any) => { this.logs = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  actionColor(action: string): string {
    if (action.startsWith('CREATE')) return 'neo-badge-active';
    if (action.startsWith('DELETE')) return 'neo-badge-danger';
    if (action.startsWith('UPDATE')) return 'neo-badge-warning';
    return 'neo-badge-gray';
  }
}
