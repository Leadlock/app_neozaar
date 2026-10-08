import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectableProductListModalComponent } from './selectable-product-list-modal.component';

describe('SelectableProductListModalComponent', () => {
  let component: SelectableProductListModalComponent;
  let fixture: ComponentFixture<SelectableProductListModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectableProductListModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectableProductListModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
