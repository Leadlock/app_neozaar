import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AskthechampComponent } from './askthechamp.component';

describe('AskthechampComponent', () => {
  let component: AskthechampComponent;
  let fixture: ComponentFixture<AskthechampComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AskthechampComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AskthechampComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
