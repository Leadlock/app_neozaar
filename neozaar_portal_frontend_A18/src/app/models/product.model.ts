export interface Product {
  id: number;
  user_id: string;

  // Basic Info
  name: string;
  brand_name: string;
  short_description: string;
  long_description: string;
  primary_use_cases: string;
  technical_prerequisites: string;

  // Arrays
  key_features: any;
  target_audience: string[];
  target_segments: string[];
  category_subcategory: string[];
  cloud_provider_support: string[];
  regions_supported: string[];
  cta_model: string[];
  compliance_certifications: string[];

  // Media
  product_logo: string;
  screenshots: string[];
  brochures: string[];
  customer_case_studies: string[];
  sla_documents: string[];

  // Pricing & Commercial
  pricing_model: string;
  starting_price: string;
  billing_dimension: string | null;
  license_model: string | null;
  free_trial_available: boolean | null;

  // Links
  demo_video_link: string;
  terms_of_use_url: string;
  privacy_policy_url: string | null;

  // Identifiers
  sku_id: string;
  oem_sku: string;

  // Flags
  accept_marketplace_terms: boolean;
  consent_data_privacy_policy: boolean;
  is_feature: boolean;
  is_drapt: boolean;
  is_publish: boolean;
  is_approved: boolean;
  is_import: boolean;

  // Metadata
  type: string;
  action_type: string;
  action_for: string;
  status: string;
  remark: string | null;

  // Extra
  api_metering_endpoint: string;
  export_control_info: string | null;
  solution_differentiator: string | null;
  risks_addressed: string | null;

  // Category
  category: string[];
  subcategory: string | null;

  // Dates
  created_at: string;
  updated_at: string;
}
