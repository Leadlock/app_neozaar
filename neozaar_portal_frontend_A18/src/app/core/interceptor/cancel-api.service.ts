import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CancelApiService {
  private cancelPendingRequests$ = new Subject<void>();

  get cancel$() {
    return this.cancelPendingRequests$.asObservable();
  }

  cancelRequests() {
    this.cancelPendingRequests$.next();
    this.cancelPendingRequests$ = new Subject<void>();
  }
}
