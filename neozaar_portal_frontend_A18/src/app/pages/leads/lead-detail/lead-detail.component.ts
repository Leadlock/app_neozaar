import { Component, OnInit } from '@angular/core';
import { LoaderComponent } from '../../../shared/providers/loader.component';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LeadApiService } from '../lead-api.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DashboardRouteRoutingModule } from '../../dashboard/dashboard-route-routing.module';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-lead-detail',
  standalone: true,
  imports: [
    LoaderComponent,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    DashboardRouteRoutingModule
  ],
  templateUrl: './lead-detail.component.html',
  styleUrl: './lead-detail.component.css'
})
export class LeadDetailComponent implements OnInit {

  isFetching = false;
  isLeadModalOpen = false;
  isReqSend = false;

  leaddata: any;
  singleLeadData: any;

  statusForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private leadApi: LeadApiService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      remark: ['']
    });
  }

  safeDescription!: SafeHtml;
  ngOnInit(): void {
 const id = Number(this.route.snapshot.paramMap.get('id'));
if (id) {
  this.getleadByid(id);
}
  // this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(
  //   this.leaddata?.action_detail?.short_description || ''
  // );
  }

  openLeadModal(lead: any) {
    this.isLeadModalOpen = true;
    this.singleLeadData = lead;

    this.statusForm.patchValue({
      status: lead.status,
      remark: lead.remark
    });
  }

  closeLeadModal() {
    this.isLeadModalOpen = false;
    this.singleLeadData = null;
    this.statusForm.reset();
  }

updateStatus() {
  if (this.statusForm.invalid || !this.leaddata) {
    return;
  }

  this.isReqSend = true;

  this.leadApi.updateStatus(this.statusForm.value, this.leaddata.id)
    .pipe(finalize(() => this.isReqSend = false))
    .subscribe({
      next: () => {
        this.statusForm.reset();
        this.getleadByid(this.leaddata.id); // refresh comments
      },
      error: (err) => console.error('Update failed:', err)
    });
}


getleadByid(leadid: number) {
  this.leadApi.getleaddetail(leadid).subscribe({
    next: (res: any) => {
      if (res?.lead) {
        this.leaddata = res.lead;
      }
    },
    error: (err) => console.error(err)
  });
}


}
