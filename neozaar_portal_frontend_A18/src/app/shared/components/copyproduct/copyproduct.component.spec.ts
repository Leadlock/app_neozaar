import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyproductComponent } from './copyproduct.component';

describe('CopyproductComponent', () => {
  let component: CopyproductComponent;
  let fixture: ComponentFixture<CopyproductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopyproductComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CopyproductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
