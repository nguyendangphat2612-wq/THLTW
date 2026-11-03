import axiosClient from "@/lib/axios";

const BrandServices = {
  async list(params = {}) {
    const response = await axiosClient.get("/api/brands", { params });
    return response.data.data || response.data || [];
  },

  async create(payload) {
    const response = await axiosClient.post("/api/brands", payload);
    return response.data.data;
  },

  async update(id, payload) {
    const response = await axiosClient.put(`/api/brands/${id}`, payload);
    return response.data.data;
  },

  async remove(id) {
    const response = await axiosClient.delete(`/api/brands/${id}`);
    return response.data;
  },
};

export default BrandServices;
