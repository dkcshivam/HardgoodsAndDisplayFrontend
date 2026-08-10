"use client";

import { use } from "react";
import { DisplayProductForm } from "@/components/display/display-product-form";
import { useDisplayProduct } from "@/lib/queries";

export default function EditDisplayProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const product = useDisplayProduct(Number(id));

  if (product.isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading product…
      </main>
    );
  }

  if (product.isError || !product.data) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-destructive">
        Could not load this product.
      </main>
    );
  }

  return <DisplayProductForm product={product.data} />;
}
