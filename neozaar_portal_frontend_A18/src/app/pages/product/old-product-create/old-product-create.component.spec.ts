import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OldProductCreateComponent } from './old-product-create.component';

describe('OldProductCreateComponent', () => {
  let component: OldProductCreateComponent;
  let fixture: ComponentFixture<OldProductCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OldProductCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OldProductCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
