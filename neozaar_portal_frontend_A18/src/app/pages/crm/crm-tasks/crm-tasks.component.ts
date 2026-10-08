import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../core/services/crm/crm.service';

@Component({
  selector: 'app-crm-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-tasks.component.html'
})
export class CrmTasksComponent implements OnInit {
  private crmService: CrmService = inject(CrmService);
  tasks: any[] = [];
  loading = false;
  filters: any = { status: '', priority: '' };
  showModal = false; editMode = false; selected: any = null;
  form: any = { title:'', description:'', priority:'Medium', status:'Open', due_date:'', reminder_at:'', related_type:'', related_id:'', completion_notes:'' };

  readonly statuses = ['Open','InProgress','Completed','Cancelled','Overdue'];
  readonly priorities = ['Low','Medium','High','Urgent'];
  readonly relatedTypes = ['Lead','Account','Contact','Opportunity'];

  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.crmService.getTasks(this.filters).subscribe({
      next: (res: any) => { this.tasks = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  openCreate() { this.editMode = false; this.form = { title:'',description:'',priority:'Medium',status:'Open',due_date:'',reminder_at:'',related_type:'',related_id:'',completion_notes:'' }; this.showModal = true; }
  openEdit(t: any) { this.editMode = true; this.selected = t; this.form = { ...t, due_date: t.due_date ? t.due_date.substring(0,16) : '', reminder_at: t.reminder_at ? t.reminder_at.substring(0,16) : '' }; this.showModal = true; }
  save() {
    const obs = this.editMode ? this.crmService.updateTask(this.selected.id, this.form) : this.crmService.createTask(this.form);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); } });
  }
  complete(t: any) { this.crmService.updateTask(t.id, { status: 'Completed' }).subscribe({ next: () => this.load() }); }
  delete(id: number) { if (!confirm('Delete task?')) return; this.crmService.deleteTask(id).subscribe({ next: () => this.load() }); }
  isOverdue(t: any): boolean { return t.status !== 'Completed' && t.due_date && new Date(t.due_date) < new Date(); }
  statusColor(s: string): string {
    if (s === 'Completed') return 'neo-badge-active';
    if (s === 'Overdue') return 'neo-badge-danger';
    if (s === 'InProgress') return 'neo-badge-warning';
    return 'neo-badge-new';
  }
}
