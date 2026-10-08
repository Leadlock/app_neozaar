import { TestBed } from '@angular/core/testing';

import { SolutionserviceService } from './solutionservice.service';

describe('SolutionserviceService', () => {
  let service: SolutionserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SolutionserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
