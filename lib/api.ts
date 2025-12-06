import axios from "axios";

const api = axios.create({
  baseURL: "/",
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {

      // remove auth token
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");

      // redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }

      return;
    }

    return Promise.reject(err);
  }
);

export default api;