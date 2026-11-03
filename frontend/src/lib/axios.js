import axios from "axios";
import { API_BASE_URL, getStoredToken } from "@/lib/api";

const axiosClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosClient;
