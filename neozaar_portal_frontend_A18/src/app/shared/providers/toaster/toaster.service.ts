import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { addToast } from '../../store/action/toaster.action';
import { Toaster } from '../../store/model/toaster.model';

@Injectable({
  providedIn: 'root'
})
export class ToasterService {

  constructor(private store: Store<any>) { }

  setToaster(type: 'request' | 'error' | 'success' | 'info' | 'warning' | 'default',title: string,message:string ) {

    let data:Toaster = {
      id:Date.now().toString(),
      title,
      description: message,
      type
    }
    this.store.dispatch(addToast({ toast: data }));
  }



}
