import loadable from "next/dynamic";

// load slider only on client
const CustomSlider = loadable(() => import("./CustomSliderservice"), {
  ssr: false,
});

// force static page (for export)
export const dynamic = "force-static";

export default function BundlePage() {
  return (
    <div>
      <CustomSlider />
    </div>
  );
}
