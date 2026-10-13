"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/lib/queries";
import { query } from "@/lib/api";

/** The activity screen filtered to one record. Admins only, as the screen is. */
export function HistoryLink({ type, id }: { type: string; id: number }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/activity${query({ target_type: type, target_id: id })}`}>
        <History /> History
      </Link>
    </Button>
  );
}
