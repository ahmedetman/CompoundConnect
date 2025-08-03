import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/auth/refresh-token`,
            { refresh_token: refreshToken }
          );

          const { access_token, refresh_token: newRefreshToken } = response.data.data;
          localStorage.setItem('token', access_token);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => apiClient.post("/auth/login", credentials),
  refreshToken: (refreshToken) =>
    apiClient.post("/auth/refresh-token", { refresh_token: refreshToken }),
  logout: (refreshToken) => apiClient.post("/auth/logout", { refresh_token: refreshToken }),
};

// Users API
export const usersAPI = {
  getProfile: () => apiClient.get("/users/profile"),
  updateProfile: (data) => apiClient.put("/users/profile", data),
  getUsers: (params) => apiClient.get("/management/users", { params }),
  createUser: (data) => apiClient.post("/management/users", data),
  updateUser: (id, data) => apiClient.put(`/management/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/management/users/${id}`),
  getUserById: (id) => apiClient.get(`/management/users/${id}`),
};

// Units API
export const unitsAPI = {
  getUnits: (params) => apiClient.get("/management/units", { params }),
  createUnit: (data) => apiClient.post("/management/units", data),
  updateUnit: (id, data) => apiClient.put(`/management/units/${id}`, data),
  deleteUnit: (id) => apiClient.delete(`/management/units/${id}`),
  getUnitById: (id) => apiClient.get(`/management/units/${id}`),
  // Updated endpoint to correct one as per API spec
  getUnitUsers: (id) => apiClient.get(`/management/units/${id}`),
  assignUserToUnit: (id, data) => apiClient.post(`/management/units/${id}/assign-user`, data),
  removeUserFromUnit: (id, userId) => {
    console.log('Removing user from unit:', { unitId: id, userId });
    return apiClient.delete(`/management/units/${id}/assign-user`, { data: { user_id: userId } })
      .then(response => {
        console.log('Successfully removed user from unit:', response);
        return response;
      })
      .catch(error => {
        console.error('Error removing user from unit:', error);
        throw error;
      });
  },
  updatePaymentStatus: (id, data) => apiClient.post(`/management/units/${id}/payments`, data),
};

// Payments API
export const paymentsAPI = {
  getPayments: (params) => apiClient.get("/management/payments", { params }),
  updatePayment: (unitId, serviceId, seasonId, data) => 
    apiClient.put(`/management/payments/${unitId}/${serviceId}/${seasonId}`, data),
  getPaymentsByUnit: (unitId) => apiClient.get(`/management/payments/unit/${unitId}`),
};

// Personnel API
export const personnelAPI = {
  getPersonnel: (params) => apiClient.get("/management/personnel", { params }),
  createInvite: (data) => apiClient.post("/management/personnel/invite", data),
  revokePersonnel: (id) => apiClient.put(`/management/personnel/${id}/revoke`),
};

// Seasons API
export const seasonsAPI = {
  getSeasons: (params) => apiClient.get("/management/seasons", { params }),
  createSeason: (data) => apiClient.post("/management/seasons", data),
  updateSeason: (id, data) => apiClient.put(`/management/seasons/${id}`, data),
  activateSeason: (id) => apiClient.put(`/management/seasons/${id}/activate`),
};

// News API
export const newsAPI = {
  getNews: (params) => apiClient.get("/management/news", { params }),
  createNews: (data) => apiClient.post("/management/news", data),
  updateNews: (id, data) => apiClient.put(`/management/news/${id}`, data),
  deleteNews: (id) => apiClient.delete(`/management/news/${id}`),
  getNewsById: (id) => apiClient.get(`/management/news/${id}`),
};

// Services API
export const servicesAPI = {
  getServices: (params) => apiClient.get("/management/services", { params }),
  createService: (data) => apiClient.post("/management/services", data),
  updateService: (id, data) => apiClient.put(`/management/services/${id}`, data),
  deleteService: (id) => apiClient.delete(`/management/services/${id}`),
  getServiceById: (id) => apiClient.get(`/management/services/${id}`),
};

// Management API
export const managementAPI = {
  getDashboardStats: () => apiClient.get("/reports/dashboard"),
  getReports: (params) => apiClient.get("/reports", { params }),
  getSettings: () => apiClient.get("/management/settings"),
  updateSettings: (data) => apiClient.put("/management/settings", data),
  getUnits: (params) => apiClient.get("/management/units", { params }),
  createUnit: (data) => apiClient.post("/management/units", data),
  getUnitUsers: (id) => apiClient.get(`/management/units/${id}`),
  assignUserToUnit: (id, data) => apiClient.post(`/management/units/${id}/assign-user`, data),
  removeUserFromUnit: (id, userId) => apiClient.delete(`/management/units/${id}/assign-user`, { data: { user_id: userId } }),
  updateUnit: (id, data) => apiClient.put(`/management/units/${id}`, data),
  deleteUnit: (id) => apiClient.delete(`/management/units/${id}`),
  getUnitById: (id) => apiClient.get(`/management/units/${id}`),
};

// QR Codes API
export const qrCodesAPI = {
  getQRCodes: (params) => apiClient.get("/qrcodes/all", { params }),
  getMyQRCodes: () => apiClient.get("/qrcodes/my"),
  getVisitorQRCodes: (params) => apiClient.get("/qrcodes/visitors", { params }),
  createVisitorQR: (data) => apiClient.post("/qrcodes/visitor", data),
  invalidateQR: (id) => apiClient.put(`/qrcodes/${id}/invalidate`),
  validateQR: (data) => apiClient.post("/qrcodes/validate", data),
  getQRStats: () => apiClient.get("/qrcodes/stats"),
};

// Utility function to debug token issues
export const debugToken = () => {
  const token = localStorage.getItem("token");
  console.log("Current token from localStorage:", token ? "Present" : "Missing");
  if (token) {
    console.log("Token preview:", token.substring(0, 20) + "...");
  }
  return token;
};

// Utility function to manually set token (useful for debugging)
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
    console.log("Token manually set");
  } else {
    localStorage.removeItem("token");
    console.log("Token removed");
  }
};

// Export the apiClient for direct usage if needed
export { apiClient };

// Feedback API
export const feedbackAPI = {
  getFeedback: (params) => apiClient.get("/feedback", { params }),
  createFeedback: (data) => apiClient.post("/feedback", data),
  updateFeedback: (id, data) => apiClient.put(`/feedback/${id}`, data),
  deleteFeedback: (id) => apiClient.delete(`/feedback/${id}`),
  getFeedbackById: (id) => apiClient.get(`/feedback/${id}`),
  getFeedbackStats: () => apiClient.get("/reports/feedback-stats"),
};

// Health check API
export const healthAPI = {
  check: () => apiClient.get("/health"),
};

export const testTokenInclusion = async () => {
  try {
    const token = localStorage.getItem("token");
    console.log("Testing token inclusion...");
    console.log("Token present:", !!token);

    if (!token) {
      console.error("No token found in localStorage");
      return false;
    }

    // Make a test call to verify token is included
    const response = await apiClient.get("/users/profile");
    console.log("API call successful with token");
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error("401 Unauthorized - Token may be invalid or expired");
    } else {
      console.error("API call failed:", error.message);
    }
    return false;
  }
};

export default apiClient;