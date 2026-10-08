import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetaudianceComponent } from './targetaudiance.component';

describe('TargetaudianceComponent', () => {
  let component: TargetaudianceComponent;
  let fixture: ComponentFixture<TargetaudianceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TargetaudianceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TargetaudianceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
