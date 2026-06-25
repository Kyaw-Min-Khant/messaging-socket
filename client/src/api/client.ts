import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/v1/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const requestUrl = err.config?.url ?? "";
      const onPublicPage = ["/login", "/register"].includes(
        window.location.pathname,
      );
      const isSessionCheck = requestUrl.includes("/auth/user");
      const willRedirect = !onPublicPage && !isSessionCheck;
      if (willRedirect) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default apiClient;
