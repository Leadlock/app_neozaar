import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeoListComponent } from './seo-list.component';

describe('SeoListComponent', () => {
  let component: SeoListComponent;
  let fixture: ComponentFixture<SeoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeoListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
