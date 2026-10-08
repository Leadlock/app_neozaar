import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewIsvComponentComponent } from './view-isv-component.component';

describe('ViewIsvComponentComponent', () => {
  let component: ViewIsvComponentComponent;
  let fixture: ComponentFixture<ViewIsvComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewIsvComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewIsvComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
