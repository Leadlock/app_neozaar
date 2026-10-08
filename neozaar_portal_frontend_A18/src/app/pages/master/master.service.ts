import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MasterService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ===========================
  // TARGET SEGMENTS
  // ===========================

  createTargetSegment(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}target-segments/create`, data);
  }

  updateTargetSegment(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}target-segments/update/${id}`, data);
  }

getAllTargetSegmentspage(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}target-segments/get-all/target-segments?page=${page}&limit=${limit}`);
}

deletetargetsegement(id: number): Observable<any> {
  return this.http.post(
    `${this.apiUrl}target-segments/delete/${id}`,
    null   // or {}
  );
}
  // ===========================
  // CATEGORIES
  // ===========================

// Update this in your master.service.ts
getAllCategories(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}categories/get-all?page=${page}&limit=${limit}`);
}

  createCategory(data: { name: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}categories/create`, data);
  }

  getCategoryById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}categories/${id}`);
  }

  updateCategory(id: number, data: { name: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}categories/update/${id}`, data);
  }

  deleteCategory(id: number): Observable<any> {
  return this.http.post(
   `${this.apiUrl}/categories/delete/${id}`,
    null   // or {}
  );



  }

  toggleCategoryFeature(id: number, is_feature: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}categories/${id}/feature`, { is_feature });
  }

  // ===========================
  // SUB-CATEGORIES
  // ===========================







// Update this in your master.service.ts
getallbrands(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}brands/get-all?page=${page}&limit=${limit}`);
}
getbrandbyid(id:number):Observable<any>{
  return this.http.get(`${this.apiUrl}brands/get/${id}`);   
}
updatebrand(id:number,data:any):Observable<any>{
  return this.http.post(`${this.apiUrl}brands/update/${id}`,data);  
}
deletebrand(id:number):Observable<any>{
  return this.http.post(`${this.apiUrl}brands/delete/${id}`,null);  
}

createbrand(data:any):Observable<any>{
  return this.http.post(`${this.apiUrl}brands/create`,data);    
}
// Update this in your master.service.ts
getAllSubCategories(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}sub-categories/get-all?page=${page}&limit=${limit}`);
}
  createSubCategory(data: { category_id: number; name: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}sub-categories/create`, data);
  }

  getSubCategoryById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}sub-categories/${id}`);
  }

  updateSubCategory(
    id: number,
    data: { category_id: number; name: string }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}sub-categories/update/${id}`, data);
  }

  deleteSubCategory(id: number): Observable<any> {
      return this.http.post(
   `${this.apiUrl}/sub-categories/delete/${id}`,
    null   // or {}
  );
  }

// ===========================
  // ADVERTISEMENTS
  // ===========================

getAllAds(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}advertisment/get-all/advertisment?page=${page}&limit=${limit}`);
}

  getAdById(id: any): Observable<any> {
    return this.http.get(`${this.apiUrl}advertisment/get/${id}`);
  }

  createAd(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}advertisment/create`, data);
  }

  updateAd(id: any, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}advertisment/update/${id}`, data);
  }

  deleteAd(id: any): Observable<any> {
    return this.http.post(`${this.apiUrl}advertisment/delete/${id}`, null);
  }
  // ===========================
  // Target Audience
  // ===========================
  
  createtargetaudiance(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}target-audience/create`, data);
  }
  
  getalltargetaudiance(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}target-audience/get-all?page=${page}&limit=${limit}`);
  } 

  gettargetaudiancebyid(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}target-audience/get/${id}`);
  }

  updatetargetaudiance(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}target-audience/update/${id}`, data);
  }

  deletetargetaudiance(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}target-audience/delete/${id}`, null);
  }

  getalltargetaudience(): Observable<any> {
    return this.http.get(`${this.apiUrl}target-audience/get-all-simple`);
  }

  getalltargetsegment(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/get-all-target-segments`);
  }

  getAllProducts(searchText: string): Observable<any> {
  return this.http.get(
    `${this.apiUrl}products/get-all?q=${searchText}`
  );
}

  getallindustry(): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog/get-all-industry`);
  }

  
  createindustry(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}industries/create`, data);
  }

  updateIndustry(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}industries/update/${id}`, data);
  }

getAllIndustries(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}industries/get-all/industries?page=${page}&limit=${limit}`);
}

deleteindustry(id: number): Observable<any> {
  return this.http.post(
    `${this.apiUrl}industries/delete/${id}`,
    null   // or {}
  );
}

  // ===========================
  // Ask the Champ
  // ===========================
getAllAskTheChamp(): Observable<any> {
  return this.http.get(`${this.apiUrl}ask-the-champ/get-all`);
}

// Get By ID
getAskTheChampById(id: number): Observable<any> {
  return this.http.get(`${this.apiUrl}ask-the-champ/get/${id}`);
}

// Create
createAskTheChamp(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}ask-the-champ/create`, data);
}

// Update
updateAskTheChamp(id: number, data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}ask-the-champ/update/${id}`, data);
}

// Toggle Feature
toggleAskTheChampFeature(id: number, is_feature: boolean): Observable<any> {
  return this.http.post(`${this.apiUrl}ask-the-champ/toggle-feature/${id}`, { is_feature });
}

// Delete
deleteAskTheChamp(id: number): Observable<any> {

   return this.http.post(
    `${this.apiUrl}ask-the-champ/delete/${id}`,
    null   // or {}
  );
}


  // ===========================
  // Target Instruction
  // ===========================

  getInstructions(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}instructions/get-all?page=${page}&limit=${limit}`);
}

// Get By ID
getInstructionsById(id: number): Observable<any> {
  return this.http.get(`${this.apiUrl}instructions/get/${id}`);
}

// Create
createInstructions(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}instructions/create`, data);
}

// Update
updateInstructions(id: number, data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}instructions/update/${id}`, data);
}

// Delete
deleteInstructions(id: number): Observable<any> {

   return this.http.post(
    `${this.apiUrl}instructions/delete/${id}`,
    null   // or {}
  );
}
  gethomebanner(page: number = 1, limit: number = 10): Observable<any> {
  return this.http.get(`${this.apiUrl}homemaster/get-all/homemaster?page=${page}&limit=${limit}`);
}

// Get By ID
gethomebannerById(id: number): Observable<any> {
  return this.http.get(`${this.apiUrl}homemaster/get/${id}`);
}

// Create
createhomebanner(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}homemaster/create`, data);
}

// Update
updatehomebanner(id: number, data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}homemaster/update/${id}`, data);
}

// Delete
deletehomebanner(id: number): Observable<any> {

   return this.http.post(
    `${this.apiUrl}homemaster/delete/${id}`,
    null   // or {}
  );
}

  // ===========================
  // Hero Carousel
  // ===========================
  getAllHeroCarousel(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}hero-carousel/get-all?page=${page}&limit=${limit}`);
  }

  getHeroCarouselById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}hero-carousel/get/${id}`);
  }

  createHeroCarousel(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-carousel/create`, data);
  }

  updateHeroCarousel(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-carousel/update/${id}`, data);
  }

  toggleHeroCarouselFeature(id: number, is_feature: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-carousel/toggle-feature/${id}`, { is_feature });
  }

  deleteHeroCarousel(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-carousel/delete/${id}`, null);
  }

  // ===========================
  // Hero Wide Banner
  // ===========================
  getAllHeroWideBanner(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}hero-wide-banner/get-all?page=${page}&limit=${limit}`);
  }

  getHeroWideBannerById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}hero-wide-banner/get/${id}`);
  }

  createHeroWideBanner(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-wide-banner/create`, data);
  }

  updateHeroWideBanner(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-wide-banner/update/${id}`, data);
  }

  toggleHeroWideBannerFeature(id: number, is_feature: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-wide-banner/toggle-feature/${id}`, { is_feature });
  }

  deleteHeroWideBanner(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}hero-wide-banner/delete/${id}`, null);
  }

  // ===========================
  // Catalog Hero Banner (product/service/solution catalog page hero)
  // ===========================
  getAllCatalogHeroBanner(catalogType: string, page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog-hero-banner/get-all?catalog_type=${catalogType}&page=${page}&limit=${limit}`);
  }

  getCatalogHeroBannerById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}catalog-hero-banner/get/${id}`);
  }

  createCatalogHeroBanner(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog-hero-banner/create`, data);
  }

  updateCatalogHeroBanner(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog-hero-banner/update/${id}`, data);
  }

  toggleCatalogHeroBannerFeature(id: number, is_feature: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog-hero-banner/toggle-feature/${id}`, { is_feature });
  }

  deleteCatalogHeroBanner(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}catalog-hero-banner/delete/${id}`, null);
  }
}
