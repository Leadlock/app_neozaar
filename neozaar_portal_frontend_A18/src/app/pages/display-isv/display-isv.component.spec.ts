import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayIsvComponent } from './display-isv.component';

describe('DisplayIsvComponent', () => {
  let component: DisplayIsvComponent;
  let fixture: ComponentFixture<DisplayIsvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayIsvComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisplayIsvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
