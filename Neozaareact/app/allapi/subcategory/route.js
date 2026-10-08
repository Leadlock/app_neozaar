// ============================================
// API 2: SUBCATEGORIES - app/api/subcategories/route.js
// ============================================

const categories = [
  { id: 1, name: "Security" },
  { id: 2, name: "Digital Workspace" },
  { id: 3, name: "Assessment" }
];

const subcategories = [

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categoriesParam = searchParams.get('categories');
  
  // If no categories provided, return empty
  if (!categoriesParam) {
    return Response.json({
      success: false,
      message: "Please provide category names. Example: ?categories=Security,Digital%20Workspace",
      data: []
    }, { status: 400 });
  }
  const selectedCategoryNames = categoriesParam.split(',').map(name => name.trim());

  const responseData = [];
  
  for (const categoryName of selectedCategoryNames) {
    const category = categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (category) {
      const categorySubcategories = subcategories.filter(sub => sub.cat_id === category.id);
      responseData.push({
        id: category.id,
        name: category.name,
        subcategories: categorySubcategories,
        totalSubcategories: categorySubcategories.length
      });
    } else {
      responseData.push({
        name: categoryName,
        error: "Category not found",
        subcategories: [],
        totalSubcategories: 0
      });
    }
  }
  
  return Response.json({
    success: true,
    message: `Subcategories fetched for: ${categoriesParam}`,
    data: responseData,
    requestedCategories: selectedCategoryNames,
    totalRequested: selectedCategoryNames.length
  });
}