import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorFeatureComponent } from './vendor-feature.component';

describe('VendorFeatureComponent', () => {
  let component: VendorFeatureComponent;
  let fixture: ComponentFixture<VendorFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
