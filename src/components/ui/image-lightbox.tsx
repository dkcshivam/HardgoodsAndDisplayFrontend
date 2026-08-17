"use client";

import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";

/**
 * One photo, as large as the screen allows. Sits above any dialog that opened
 * it — a thumbnail in a form is never big enough to tell two similar styles
 * apart, which is the moment somebody reaches for it.
 */
export function ImageLightbox({
  src,
  alt,
  open,
  onOpenChange,
}: {
  src: string | null;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Primitive.Root open={open && src !== null} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-[60] bg-foreground/80 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Primitive.Content
          aria-describedby={undefined}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Primitive.Title className="sr-only">{alt}</Primitive.Title>
          {src && (
            // Plain <img>: Django hands back an absolute media URL, so no host
            // has to be declared up front when the media store moves.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
            />
          )}
          <Primitive.Close className="absolute right-4 top-4 rounded-md bg-card/90 p-1.5 text-muted-foreground hover:text-foreground">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
