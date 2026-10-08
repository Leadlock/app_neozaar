
const categories = [
  { id: 1, name: "Security" },
  { id: 2, name: "Digital Workspace" },
  { id: 3, name: "Assessment" }
];


const subcategories = [
  // Security (cat_id: 1)
  { id: 1, cat_id: 1, name: "Firewall & Network Security" },
  { id: 2, cat_id: 1, name: "Email Security" },
  { id: 3, cat_id: 1, name: "Endpoint Security" },
  { id: 4, cat_id: 1, name: "DevSecOps Security" },
  { id: 5, cat_id: 1, name: "Security Mgmt & Compliance" },
  { id: 6, cat_id: 1, name: "Threat Detection & Response" },
  { id: 7, cat_id: 1, name: "Identity & Zero Trust" },
  { id: 8, cat_id: 1, name: "Cloud Security - CSPM" },
  { id: 9, cat_id: 1, name: "Cloud Security-CSPM" },
  { id: 10, cat_id: 1, name: "Managed Security Services" },
  { id: 11, cat_id: 1, name: "Cloud Security Engineering" },
  { id: 12, cat_id: 1, name: "Security Assessment" },
  { id: 13, cat_id: 1, name: "Data & AI Security" },
  { id: 14, cat_id: 1, name: "WAF & Application Security" },
  { id: 15, cat_id: 1, name: "Identity Security" },
  { id: 16, cat_id: 1, name: "Cloud Security" },
  { id: 17, cat_id: 1, name: "Cloud Workload Protection" },
  { id: 18, cat_id: 1, name: "Email Security / Cloud Messaging Protection" },
  { id: 19, cat_id: 1, name: "Endpoint Protection Platform (EPP)" },
  { id: 20, cat_id: 1, name: "Mobile Device Management (MDM) / Unified Endpoint Management (UEM)" },
  { id: 21, cat_id: 1, name: "Server Security" },
  { id: 22, cat_id: 1, name: "MDM & Device Management" },
  { id: 23, cat_id: 1, name: "AI Security" },
  { id: 24, cat_id: 1, name: "Cyber Security" },
  { id: 25, cat_id: 1, name: "Advanced Threat Detection & Response" },
  
  // Digital Workspace (cat_id: 2)
  { id: 26, cat_id: 2, name: "HR Tech" },
  { id: 27, cat_id: 2, name: "Digital Workplace" },
  { id: 28, cat_id: 2, name: "HR Software" },
  { id: 29, cat_id: 2, name: "Attendance Software" },
  { id: 30, cat_id: 2, name: "Payroll Software" },
  { id: 31, cat_id: 2, name: "HRMS" },
  
  // Assessment (cat_id: 3)
  { id: 32, cat_id: 3, name: "Cloud Assessment" }
];


const targetSegments = [
  { id: 1, name: "Telecom" },
  { id: 2, name: "Retail" },
  { id: 3, name: "NBFC" },
  { id: 4, name: "Manufacturing" },
  { id: 5, name: "IT_ITES" },
  { id: 6, name: "Healthcare" },
  { id: 7, name: "Enterprise" },
  { id: 8, name: "BFSI" },
  { id: 9, name: "SME" }
];
const cta = [
  { id: 1, name: "Request Assessment" },
  { id: 2, name: "Retail" },
  { id: 3, name: "NBFC" },
  { id: 4, name: "Manufacturing" },
  { id: 5, name: "IT_ITES" },
  { id: 6, name: "Healthcare" },
  { id: 7, name: "Enterprise" },
  { id: 8, name: "BFSI" },
  { id: 9, name: "SME" }
];

// ============================================
// 4. PRODUCTS WITH FOREIGN KEYS
// ============================================
const products = [
//   { id: 1, name: "Laptop", price: 50000, category_id: 1, subcategory_id: 1, target_segment_id: 1 },
//   { id: 2, name: "Mobile", price: 20000, category_id: 1, subcategory_id: 2, target_segment_id: 2 }
];

// ============================================
// 5. HELPER FUNCTIONS TO GET JOINED DATA
// ============================================

// Get category by ID
function getCategoryById(id) {
  return categories.find(cat => cat.id === id);
}

// Get subcategories by category ID
function getSubcategoriesByCategoryId(catId) {
  return subcategories.filter(sub => sub.cat_id === catId);
}

// Get full subcategory details with category name
function getSubcategoryWithCategory(subcategoryId) {
  const subcategory = subcategories.find(sub => sub.id === subcategoryId);
  if (!subcategory) return null;
  const category = getCategoryById(subcategory.cat_id);
  return {
    ...subcategory,
    category_name: category.name
  };
}

// Get target segment by ID
function getTargetSegmentById(id) {
  return targetSegments.find(seg => seg.id === id);
}

// Get complete product details with all relations
function getCompleteProductDetails(product) {
  const category = getCategoryById(product.category_id);
  const subcategory = subcategories.find(sub => sub.id === product.subcategory_id);
  const targetSegment = getTargetSegmentById(product.target_segment_id);
  
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category: category ? category.name : null,
    category_id: product.category_id,
    subcategory: subcategory ? subcategory.name : null,
    subcategory_id: product.subcategory_id,
    targetSegment: targetSegment ? targetSegment.name : null,
    target_segment_id: product.target_segment_id
  };
}

// ============================================
// 6. API ENDPOINT (Next.js App Router)
// ============================================
export async function GET() {
  // Get enriched products
  const enrichedProducts = products.map(product => getCompleteProductDetails(product));
  
  return Response.json({
    success: true,
    message: "Products fetched successfully",
    data: enrichedProducts,
    metadata: {
      categories: categories,
      subcategories: subcategories,
      targetSegments: targetSegments
    }
  });
}

// ============================================
// 7. EXAMPLE USAGE
// ============================================
console.log("=== All Categories ===");
console.log(categories);

console.log("\n=== All Subcategories with Category Info ===");
subcategories.forEach(sub => {
  const category = getCategoryById(sub.cat_id);
  console.log(`Subcategory: ${sub.name} (ID: ${sub.id}) → Category: ${category.name} (ID: ${category.id})`);
});

console.log("\n=== Target Segments ===");
console.log(targetSegments);

console.log("\n=== Complete Product Details ===");
products.forEach(product => {
  console.log(getCompleteProductDetails(product));
});