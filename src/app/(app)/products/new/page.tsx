"use client";

import { ProductForm, BLANK_PRODUCT } from "@/components/products/product-form";

export default function NewProductPage() {
  return <ProductForm initial={BLANK_PRODUCT} />;
}
