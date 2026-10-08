import { createReducer, on } from '@ngrx/store';
import * as ProductActions from '../action/product.action';
import { Products } from '../model/product.model';


export const initialState: Products = {
  products1: null,
  // loading: false,
  // error: null
};

export const productReducer = createReducer(
  initialState,

  // on(ProductActions.loadProducts, state => ({
  //   ...state,
  //   loading: true,
  //   error: null
  // })),

  on(ProductActions.loadProductsSuccess, (state, { products1 }) => ({
    ...state,
    products1,
    // loading: false
  })),

  // on(ProductActions.loadProductsFailure, (state, { error }) => ({
  //   ...state,
  //   error,
  //   loading: false
  // }))
);
