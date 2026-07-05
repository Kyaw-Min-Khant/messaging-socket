import axios from "axios";

const expenseClient = axios.create({
  baseURL: import.meta.env.VITE_EXPENSE_API_URL ?? "/v1/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

expenseClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const onPublicPage = ["/login", "/register"].includes(window.location.pathname);
      if (!onPublicPage) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default expenseClient;
