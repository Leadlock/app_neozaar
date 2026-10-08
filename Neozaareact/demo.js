import { useState } from "react";
import Image from "next/image";

export default function CategoryMenu() {
    const [menu, setMenu] = useState(false);

    const categories = [
        "Technology",
        "Business",
        "Health",
        "Education",
        "Sports",
        "Entertainment",
    ];

    return (
        <div className="relative">
            {/* Main button */}
            <div className="bg-white border-x border-zinc-200 flex items-center gap-2 justify-start px-4 sm:px-9 h-[81px] w-[81px] sm:w-[195px] shrink-0">
                <div className="w-6 h-6 relative cursor-pointer">
                    <Image
                        fill
                        alt=""
                        src="/assests/menu_icon.png"
                        className="w-full h-full object-contain"
                        onClick={() => setMenu((prev) => !prev)}
                    />
                </div>
                <div className="text-black text-sm font-bold hidden sm:block">
                    Categories
                </div>
            </div>

            {/* Dropdown menu */}
            {menu && (
                <div className="absolute top-[81px] left-0 w-56 bg-white shadow-lg border border-zinc-200 rounded-lg z-50">
                    <ul className="flex flex-col">
                        {categories.map((cat, idx) => (
                            <li
                                key={idx}
                                className="px-4 py-2 hover:bg-zinc-100 cursor-pointer text-sm"
                            >
                                {cat}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}






















import { useState } from "react";

export default function PaginationExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10; // you can make it dynamic

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2 mt-10">
      {/* Previous Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded-lg border 
          ${currentPage === 1 
            ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
            : "bg-white hover:bg-gray-100 text-gray-700"}`}
      >
        Prev
      </button>

      {/* Page Numbers */}
      {[...Array(totalPages)].map((_, i) => {
        const page = i + 1;
        return (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-1 rounded-lg border 
              ${currentPage === page 
                ? "bg-blue-500 text-white" 
                : "bg-white hover:bg-gray-100 text-gray-700"}`}
          >
            {page}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-1 rounded-lg border 
          ${currentPage === totalPages 
            ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
            : "bg-white hover:bg-gray-100 text-gray-700"}`}
      >
        Next
      </button>
    </div>
  );
}
