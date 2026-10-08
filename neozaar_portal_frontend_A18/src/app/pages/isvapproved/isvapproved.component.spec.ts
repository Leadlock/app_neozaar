import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IsvapprovedComponent } from './isvapproved.component';

describe('IsvapprovedComponent', () => {
  let component: IsvapprovedComponent;
  let fixture: ComponentFixture<IsvapprovedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IsvapprovedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IsvapprovedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
