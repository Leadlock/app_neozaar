import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrmDashboardComponent } from './crm-dashboard.component';
describe('CrmDashboardComponent', () => {
  let component: CrmDashboardComponent;
  let fixture: ComponentFixture<CrmDashboardComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CrmDashboardComponent] }).compileComponents();
    fixture = TestBed.createComponent(CrmDashboardComponent);
    component = fixture.componentInstance;
  });
  it('should create', () => { expect(component).toBeTruthy(); });
});
