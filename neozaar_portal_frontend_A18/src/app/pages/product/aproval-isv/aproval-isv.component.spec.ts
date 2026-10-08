import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprovalIsvComponent } from './aproval-isv.component';

describe('AprovalIsvComponent', () => {
  let component: AprovalIsvComponent;
  let fixture: ComponentFixture<AprovalIsvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprovalIsvComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AprovalIsvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
