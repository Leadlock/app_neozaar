import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BundleCreateComponent } from './bundle-create.component';

describe('ProductCreateComponent', () => {
  let component: BundleCreateComponent;
  let fixture: ComponentFixture<BundleCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BundleCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BundleCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
