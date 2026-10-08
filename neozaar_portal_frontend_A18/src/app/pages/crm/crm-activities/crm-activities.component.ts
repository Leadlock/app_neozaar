import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../core/services/crm/crm.service';

@Component({
  selector: 'app-crm-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-activities.component.html'
})
export class CrmActivitiesComponent implements OnInit {
  private crmService = inject(CrmService);
  activities: any[] = [];
  loading = false;
  filters = { type: '', related_type: '' };
  showModal = false;
  form: any = { type:'Call', subject:'', description:'', related_type:'', related_id:'', activity_date:'', duration_minutes:'', outcome:'' };

  readonly types = ['Call','Email','WhatsApp','Meeting','Demo','Note','Webinar','Proposal','Trial','POC','FollowUp'];
  readonly relatedTypes = ['Lead','Account','Contact','Opportunity'];

  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.crmService.getActivities(this.filters).subscribe({
      next: (res) => { this.activities = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  openCreate() { this.form = { type:'Call',subject:'',description:'',related_type:'',related_id:'',activity_date:'',duration_minutes:'',outcome:'' }; this.showModal = true; }
  save() { this.crmService.createActivity(this.form).subscribe({ next: () => { this.showModal = false; this.load(); } }); }
  delete(id: number) { if (!confirm('Delete activity?')) return; this.crmService.deleteActivity(id).subscribe({ next: () => this.load() }); }
  typeIcon(type: string): string {
    const icons: any = { Call:'C', Email:'E', WhatsApp:'W', Meeting:'M', Demo:'D', Note:'N', Webinar:'W', Proposal:'P', Trial:'T', POC:'P', FollowUp:'F' };
    return icons[type] || '•';
  }
}
