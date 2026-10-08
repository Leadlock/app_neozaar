import { Suspense } from "react";
import CustomSolution from "./CustomSolution";


export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CustomSolution />
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