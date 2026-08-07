"use client";

import { use } from "react";
import { ProductForm, toDraft } from "@/components/products/product-form";
import { useProduct } from "@/lib/queries";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError } = useProduct(Number(id));

  if (isLoading) {
    return <Placeholder>Loading product…</Placeholder>;
  }
  if (isError || !data) {
    return (
      <Placeholder>
        <span className="text-destructive">Could not load this product.</span>
      </Placeholder>
    );
  }

  // Keyed so switching product resets the form's internal state.
  return <ProductForm key={data.id} initial={toDraft(data)} />;
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {children}
    </main>
  );
}
