import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrmService } from '../../../core/services/crm/crm.service';

type EntityType = 'leads' | 'accounts' | 'contacts' | 'opportunities' | 'tasks';

@Component({
  selector: 'app-crm-trash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crm-trash.component.html',
})
export class CrmTrashComponent implements OnInit {
  private crm = inject(CrmService);

  activeTab: EntityType = 'leads';
  loading = false;
  purging = false;
  confirmOpen = false;
  confirmAll = false;

  data: Record<EntityType, any[]> = {
    leads: [], accounts: [], contacts: [], opportunities: [], tasks: [],
  };
  counts: Record<EntityType, number> = {
    leads: 0, accounts: 0, contacts: 0, opportunities: 0, tasks: 0,
  };
  selected: Record<EntityType, Set<number>> = {
    leads: new Set(), accounts: new Set(), contacts: new Set(),
    opportunities: new Set(), tasks: new Set(),
  };

  readonly tabs: { key: EntityType; label: string }[] = [
    { key: 'leads',         label: 'Leads'         },
    { key: 'accounts',      label: 'Accounts'      },
    { key: 'contacts',      label: 'Contacts'      },
    { key: 'opportunities', label: 'Opportunities' },
    { key: 'tasks',         label: 'Tasks'         },
  ];

  get totalCount() { return Object.values(this.counts).reduce((s, n) => s + n, 0); }
  get currentRows() { return this.data[this.activeTab]; }
  get currentSelected() { return this.selected[this.activeTab]; }
  get allPageChecked() {
    return this.currentRows.length > 0 && this.currentRows.every(r => this.currentSelected.has(r.id));
  }
  get selectedCount() { return Object.values(this.selected).reduce((s, set) => s + set.size, 0); }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.crm.getTrash().subscribe({
      next: (res: any) => {
        this.data   = res.data;
        this.counts = res.counts;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setTab(tab: EntityType) {
    this.activeTab = tab;
  }

  toggle(id: number) {
    const set = this.selected[this.activeTab];
    set.has(id) ? set.delete(id) : set.add(id);
  }

  toggleAll() {
    const set = this.selected[this.activeTab];
    if (this.allPageChecked) {
      this.currentRows.forEach(r => set.delete(r.id));
    } else {
      this.currentRows.forEach(r => set.add(r.id));
    }
  }

  openConfirm(all: boolean) {
    this.confirmAll = all;
    this.confirmOpen = true;
  }

  cancelConfirm() { this.confirmOpen = false; }

  purge() {
    this.confirmOpen = false;
    this.purging = true;

    const body: any = this.confirmAll
      ? { all: true }
      : {
          leads:         [...this.selected.leads],
          accounts:      [...this.selected.accounts],
          contacts:      [...this.selected.contacts],
          opportunities: [...this.selected.opportunities],
          tasks:         [...this.selected.tasks],
        };

    this.crm.purgeTrash(body).subscribe({
      next: () => {
        this.purging = false;
        this.selected = {
          leads: new Set(), accounts: new Set(), contacts: new Set(),
          opportunities: new Set(), tasks: new Set(),
        };
        this.load();
      },
      error: () => { this.purging = false; },
    });
  }

  displayName(row: any): string {
    return row.name || row.title || row.email || '—';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
