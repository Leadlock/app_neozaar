import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type EntityType = 'products' | 'leads' | 'accounts' | 'contacts' | 'opportunities' | 'tasks';

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trash.component.html',
})
export class TrashComponent implements OnInit {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}admin/trash`;

  activeTab: EntityType = 'products';
  loading = false;
  purging = false;
  confirmOpen = false;
  confirmAll = false;

  data: Record<EntityType, any[]> = {
    products: [], leads: [], accounts: [], contacts: [], opportunities: [], tasks: [],
  };
  counts: Record<EntityType, number> = {
    products: 0, leads: 0, accounts: 0, contacts: 0, opportunities: 0, tasks: 0,
  };
  selected: Record<EntityType, Set<number>> = {
    products: new Set(), leads: new Set(), accounts: new Set(),
    contacts: new Set(), opportunities: new Set(), tasks: new Set(),
  };

  readonly tabs: { key: EntityType; label: string }[] = [
    { key: 'products',      label: 'Products'      },
    { key: 'leads',         label: 'CRM Leads'     },
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
    this.http.get<any>(this.api).subscribe({
      next: (res) => {
        this.data   = res.data;
        this.counts = res.counts;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setTab(tab: EntityType) { this.activeTab = tab; }

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

  openConfirm(all: boolean) { this.confirmAll = all; this.confirmOpen = true; }
  cancelConfirm() { this.confirmOpen = false; }

  purge() {
    this.confirmOpen = false;
    this.purging = true;

    const body: any = this.confirmAll
      ? { all: true }
      : {
          products:      [...this.selected.products],
          leads:         [...this.selected.leads],
          accounts:      [...this.selected.accounts],
          contacts:      [...this.selected.contacts],
          opportunities: [...this.selected.opportunities],
          tasks:         [...this.selected.tasks],
        };

    this.http.delete<any>(`${this.api}/purge`, { body }).subscribe({
      next: () => {
        this.purging = false;
        this.selected = {
          products: new Set(), leads: new Set(), accounts: new Set(),
          contacts: new Set(), opportunities: new Set(), tasks: new Set(),
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
