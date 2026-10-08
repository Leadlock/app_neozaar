import { Suspense } from "react";
import CustomeService from "./CustomeService";


export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CustomeService />
        </Suspense>
    );

}
// export default function MarketPage() {
//   return (
//     <Suspense fallback={<div>Loading...</div>}>
//       <CustomService />
//     </Suspense>
//   );
// }