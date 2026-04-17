import axios from "axios";
export const api = axios.create({
    // Toujours passer par /api :
    // - en dev: Vite proxy -> http://127.0.0.1:8000
    // - en prod: /api sur le même host (Laravel/Apache)
    baseURL: "/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});