import { Suspense } from "react";
import CustomMarketplace from "./CustomMarketplace";
import { trackEvent } from "../lib/track";

export default function MarketPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomMarketplace />
    </Suspense>
  );
}
