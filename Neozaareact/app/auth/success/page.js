'use client';
import Link from "next/link";

export default function SuccessPage() {
  return (
    <main
      className="relative min-h-screen flex items-center justify-center text-white p-4"
      style={{ fontFamily: "'Creato Display', sans-serif" }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/image.png')] bg-cover bg-center"></div>
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Card */}
      <div
        className="relative z-10 bg-black/80 backdrop-blur-lg shadow-2xl rounded-2xl 
          p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-4xl 
          w-full text-center border border-gray-700"
      >
        {/* Success Icon */}
        <div className="flex justify-center mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-[#F79331] rounded-full p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 sm:h-8 sm:w-8  lg:h-8 lg:w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl  font-bold mb-2 sm:mb-4 lg:mb-6">
          Registration Successful
        </h1>

        {/* Message */}
        <div className="w-[90%] sm:w-[80%] md:w-[70%] lg:w-[80%] mx-auto">
          <p className="text-gray-300 sm:text-[10px] md:text-md lg:text-xl xl:text-2xl mb-4 sm:mb-6 lg:mb-8">
            Thank you for registering with us! Please wait while we verify your
            credentials. Once verified, we will contact you via email. Below you
            can see the steps of your verification process.
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="bg-[#F79331] text-white rounded-full p-2 sm:p-3 md:p-4 lg:p-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-[8px] sm:text-xs md:text-sm lg:text-base mt-1 font-medium">
              Registered
            </span>
          </div>

          <div className="flex-1 h-[2px] bg-gray-600 mx-1 sm:mx-2 md:mx-3 lg:mx-4"></div>

     
          <div className="flex flex-col items-center text-center flex-1">
            <div className="bg-purple-600 text-white rounded-full p-2 sm:p-3 md:p-4 lg:p-5 animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3"
                />
              </svg>
            </div>
            <span className="text-[8px] sm:text-xs md:text-sm lg:text-base mt-1 font-medium">
              Verification
            </span>
          </div>

          <div className="flex-1 h-[2px] bg-gray-600 mx-1 sm:mx-2 md:mx-3 lg:mx-4"></div>

        
          <div className="flex flex-col items-center text-center flex-1">
            <div className="bg-gray-600 text-white rounded-full p-2 sm:p-3 md:p-4 lg:p-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 17v-6h13M9 5h13"
                />
              </svg>
            </div>
            <span className="text-[8px] sm:text-xs md:text-sm lg:text-base mt-1 font-medium">
              Approval
            </span>
          </div>
        </div>

        {/* Loader */}
        {/* <div className="flex justify-center mb-4 sm:mb-6 lg:mb-8">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 border-t-2 border-b-2 border-orange-500"></div>
        </div> */}

        {/* Back Button */}
        <Link href="/"
          className="inline-block px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 rounded-lg bg-gradient-to-r from-[#F79331] to-[#CB5D18] text-white text-xs sm:text-sm md:text-base lg:text-lg font-medium 
          transition hover:opacity-90">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
