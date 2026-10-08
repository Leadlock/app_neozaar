import { Suspense } from "react";
import CustomSlider from "../../product/CustomSlider";

export default async function ServicePage({ params }) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div>Loading... {slug}</div>}>
      <CustomSlider />
    </Suspense>
  );
}
