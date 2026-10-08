import { TestBed } from '@angular/core/testing';

import { SeoServiveService } from './seo-servive.service';

describe('SeoServiveService', () => {
  let service: SeoServiveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoServiveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
