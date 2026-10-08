import React from "react";

const PaginationForPages = ({ currentPage, totalPages, onPageChange }) => {
  // Helper function to generate page numbers with "..."
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 3; // how many numbers to show before "..."

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > maxVisible) pages.push("...");

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - (maxVisible - 1)) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {getPageNumbers().map((page, idx) =>
        page === "..." ? (
          <span key={idx} className="px-3 py-1">...</span>
        ) : (
          <button
            key={idx}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              currentPage === page
                ? "bg-gray-800 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {page}
          </button>
        )
      )}
    </div>
  );
};

export default PaginationForPages;
