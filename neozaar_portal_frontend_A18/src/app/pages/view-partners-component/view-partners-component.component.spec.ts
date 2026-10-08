import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewPartnersComponentComponent } from './view-partners-component.component';

describe('ViewPartnersComponentComponent', () => {
  let component: ViewPartnersComponentComponent;
  let fixture: ComponentFixture<ViewPartnersComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewPartnersComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewPartnersComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
