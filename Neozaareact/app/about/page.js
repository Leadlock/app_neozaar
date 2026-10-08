
// import Homeclient from "./components/homeclient";
import Homeclient from "../components/homeclient";
import { seoconfig } from "../seoconfig";

export const metadata = seoconfig.pages.home;

export default function Page() {
 

  return (
    <>
    <Homeclient />
    </>
  );
}