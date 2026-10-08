import axios from "axios";
import { currentPurposes, getAnonId } from "./consent";

const apiBase = () =>
    (process.env.NEXT_PUBLIC_ANALYTICS_URL || process.env.NEXT_PUBLIC_API_BASE || "")
        .replace(/\/+$/, "");

export const trackEvent = (data) => {
    if (typeof window === "undefined") return Promise.resolve(); // safety for SSR

    // Behavioural tracking requires analytics consent — checked for anonymous
    // and signed-in visitors alike. The signed-in customer's choice is mirrored
    // into user_consents by the consent ledger, so the server-side /track
    // consent middleware stays authoritative.
    if (currentPurposes().analytics !== true) return Promise.resolve();

    const token = localStorage.getItem("token");
    const base = apiBase();
    if (!token || !base) return Promise.resolve();

    return axios
        .post(`${base}/track`, data, {
            headers: { Authorization: `Bearer ${token}`, "X-Anon-Id": getAnonId() || "" },
        })
        .catch(() => {});
};
