import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileserviceService {
 private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient,) { }

  getProfileById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}user/isv-user/${id}/products?page=1&limit=10`);
  }


}
