// ============================================
// API 1: ALL CATEGORIES - app/api/categories/route.js
// ============================================

const categories = [
  { id: 1, name: "Security" },
  { id: 2, name: "Digital Workspace" },
  { id: 3, name: "Assessment" }
];

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  const categoriesWithEmptySubcategories = categories.map(category => ({
    id: category.id,
    name: category.name,
    subcategories: [],
    totalSubcategories: 0
  }));

  return new Response(
    JSON.stringify({
      success: true,
      message: "All categories fetched successfully",
      data: categoriesWithEmptySubcategories,
      totalCategories: categories.length
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    }
  );
}