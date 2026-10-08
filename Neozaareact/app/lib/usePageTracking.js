import { useEffect } from "react";
import { useRouter } from "next/router";
import { trackEvent } from "./track";

export default function usePageTracking(user) {
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        const handleRoute = (url) => {
            trackEvent({
                userId: user.id,
                eventType: "PAGE_VIEW",
                pageUrl: url
            });
        };

        router.events.on("routeChangeComplete", handleRoute);
        return () => router.events.off("routeChangeComplete", handleRoute);
    }, [user]);
}