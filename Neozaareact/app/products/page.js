import { Suspense } from "react";
// import CustomeService from "./CustomeService";
import CustomeProduct from "./CustomeProduct";


export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CustomeProduct />
        </Suspense>
    );

}
