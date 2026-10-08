import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ClientService {

 private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

getUsers(page: number = 1, limit: number = 10): Observable<any> {

  let params = new HttpParams()
    .set('page', page)
    .set('limit', limit);

  return this.http.get<any>(`${this.apiUrl}user/partner-users`, { params });

}
  deleteuser(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}user/${productId}/delete`, {});
  }
  // Get By ID

getAllUsers(): Observable<any> {
  return this.http.get(`${this.apiUrl}user/by-role-type`);
}

getroles(): Observable<any> {
  return this.http.get(`${this.apiUrl}user/get-roles
`);
}

getAskUsersById(id: number): Observable<any> {
  return this.http.get(`${this.apiUrl}user/user-details/${id}`);
}

// Create
createUsers(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}user/create/user`, data);
}

// Update
updateallUsers(id: number, data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}user/update/user-role/${id}`, data);
}

// Delete
deleteallUsers(id: number): Observable<any> {

   return this.http.post(
    `${this.apiUrl}user/delete-user/${id}`,
    null   // or {}
  );
}
}
