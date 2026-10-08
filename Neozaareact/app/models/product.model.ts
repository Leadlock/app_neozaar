export interface Product {
  id: number;
  title: string;
  price?: number;          // optional, because your product may not always have price
  description?: string;    // optional
  // Add any other fields your backend returns, for example:
  // category?: string;
  // inStock?: boolean;
  // createdAt?: Date;
}