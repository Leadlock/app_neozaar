import { createFeatureSelector, createSelector } from '@ngrx/store';
// import { ProductState } from './../reducer/product.reducer';
import { Products } from '../model/product.model';


// 1. Select feature state
export const selectProductFeature = createFeatureSelector<Products>('product');

// 2. Select products array
export const selectProducts = createSelector(
  selectProductFeature,
  (state) => state.products1
);

// 3. Optional: loading & error
// export const selectProductLoading = createSelector(
//   selectProductFeature,
//   (state) => state.loading
// );

// export const selectProductError = createSelector(
//   selectProductFeature,
//   (state) => state.error
// );
