import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SeoServiveService {
  private apiUrl = environment.apiUrl;
   constructor(private http: HttpClient,) { }

   getSeoList(type:string):Observable<any>;

   getSeoList(params:{
     type?: string;
    page?: number;
  limit?: number;
  search?: string;
   }):Observable<any>;
   
   getSeoList(arg:any): Observable<any> {
let httpParams = new HttpParams();
  let type: string | undefined;
   if (typeof arg === 'string') {
    type = arg; // direct type
  } else {
    if (arg.page) httpParams = httpParams.set('page', arg.page.toString());
    if (arg.limit) httpParams = httpParams.set('limit', arg.limit.toString());
      if (arg.search) httpParams = httpParams.set('search', arg.search);
  }
  return this.http.get(`${this.apiUrl}seo/get-all?`,{params:httpParams});
   }


    getSeoById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}seo/page/${id}`);
  }
    getSeoBySlug(slug: number): Observable<any> {
    return this.http.get(`${this.apiUrl}seo/page/${slug}`);
  }
   createseo(seo: any): Observable<any> {
    return this.http.post(`${this.apiUrl}seo/create`, seo ,{
    headers: { 'Content-Type': 'application/json' }
  });
  }
   updeteseo(id:number,seo: any): Observable<any> {
    return this.http.post(`${this.apiUrl}seo/update/${id}`, seo ,{
    headers: { 'Content-Type': 'application/json' }
  });
  }
 deleteSeo(seoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}seo/delete/${seoId}`, {});
  }

}
