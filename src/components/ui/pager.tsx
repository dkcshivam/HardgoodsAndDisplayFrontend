import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Paginated } from "@/lib/api";

/** The API's page size. */
const PAGE_SIZE = 50;

/** Sits under a table. Shows nothing while everything fits on one page. */
export function Pager({
  page,
  data,
  onChange,
}: {
  page: number;
  data: Paginated<unknown> | undefined;
  onChange: (page: number) => void;
}) {
  if (!data || (!data.next && !data.previous)) return null;

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + data.results.length - 1;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-2 text-xs text-muted-foreground">
      <span className="tabular">
        {first}–{last} of {data.count.toLocaleString("en-US")}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={!data.previous}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!data.next}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
