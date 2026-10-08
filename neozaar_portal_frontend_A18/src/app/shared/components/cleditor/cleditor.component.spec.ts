import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CleditorComponent } from './cleditor.component';

describe('CleditorComponent', () => {
  let component: CleditorComponent;
  let fixture: ComponentFixture<CleditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CleditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CleditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
