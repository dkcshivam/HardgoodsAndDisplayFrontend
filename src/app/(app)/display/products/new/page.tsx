"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DisplayProductForm } from "@/components/display/display-product-form";

/** Arrives carrying a style number when an order sheet sent somebody here. */
function NewDisplayProduct() {
  const params = useSearchParams();
  return (
    <DisplayProductForm
      seed={{
        style_no: params.get("style_no") ?? "",
        style_name: params.get("style_name") ?? "",
      }}
    />
  );
}

export default function NewDisplayProductPage() {
  return (
    <Suspense>
      <NewDisplayProduct />
    </Suspense>
  );
}
