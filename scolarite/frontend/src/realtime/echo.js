import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance = null;

export function getEcho() {
  if (echoInstance) return echoInstance;

  const token = localStorage.getItem("token");
  const key = import.meta.env.VITE_PUSHER_APP_KEY;
  if (!token || !key) return null;

  window.Pusher = Pusher;

  const host = import.meta.env.VITE_PUSHER_HOST || window.location.hostname;
  const port = Number(import.meta.env.VITE_PUSHER_PORT || 443);
  const scheme = import.meta.env.VITE_PUSHER_SCHEME || "https";
  const wsPort = scheme === "https" ? 443 : port;

  echoInstance = new Echo({
    broadcaster: "pusher",
    key,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1",
    wsHost: host,
    wsPort,
    wssPort: 443,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/broadcasting/auth",
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return echoInstance;
}

export function disconnectEcho() {
  if (!echoInstance) return;
  echoInstance.disconnect();
  echoInstance = null;
}

