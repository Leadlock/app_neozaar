import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetsegmentComponent } from './targetsegment.component';

describe('TargetsegmentComponent', () => {
  let component: TargetsegmentComponent;
  let fixture: ComponentFixture<TargetsegmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TargetsegmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TargetsegmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
