"use client";

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
});

api.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response?.status === 400 &&
      error.response?.data?.message === "Invalid token"
    ) {
      localStorage.clear();
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export default api;
