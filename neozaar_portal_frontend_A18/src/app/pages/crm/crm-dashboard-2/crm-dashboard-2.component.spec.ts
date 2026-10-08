import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrmDashboard2Component } from './crm-dashboard-2.component';

describe('CrmDashboard2Component', () => {
  let component: CrmDashboard2Component;
  let fixture: ComponentFixture<CrmDashboard2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrmDashboard2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(CrmDashboard2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
