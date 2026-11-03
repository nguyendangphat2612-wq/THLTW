import axiosClient from "@/lib/axios";

const CategoryServices = {
  async list(params = {}) {
    const response = await axiosClient.get("/api/categories", { params });
    return response.data.data || response.data || [];
  },

  async create(payload) {
    const response = await axiosClient.post("/api/categories", payload);
    return response.data.data;
  },

  async update(id, payload) {
    const response = await axiosClient.put(`/api/categories/${id}`, payload);
    return response.data.data;
  },

  async remove(id) {
    const response = await axiosClient.delete(`/api/categories/${id}`);
    return response.data;
  },
};

export default CategoryServices;
