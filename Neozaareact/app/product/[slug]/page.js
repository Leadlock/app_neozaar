import { Suspense } from "react";
import CustomSlider from "../CustomSlider";

export default async function BundlePage({ params }) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div>Loading... {slug}</div>}>
      <CustomSlider />
    </Suspense>
  );
}
