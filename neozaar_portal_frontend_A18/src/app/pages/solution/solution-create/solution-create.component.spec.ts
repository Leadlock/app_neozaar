import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionCreateComponent } from './solution-create.component';

describe('SolutionCreateComponent', () => {
  let component: SolutionCreateComponent;
  let fixture: ComponentFixture<SolutionCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolutionCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
