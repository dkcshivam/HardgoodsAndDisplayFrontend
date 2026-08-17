"use client";

import { useRef } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

/** A photo chosen before its owner exists. Uploaded when the form saves. */
export interface PendingPhoto {
  key: string;
  file: File;
  preview: string;
}

let nextKey = 1;

export function toPending(file: File): PendingPhoto {
  return { key: `p${nextKey++}`, file, preview: URL.createObjectURL(file) };
}

/** Everything a gallery needs, wired by whoever owns the form state. */
export interface PhotoBinding {
  images: ProductImage[];
  pending: PendingPhoto[];
  onAdd: (files: File[]) => void;
  onRemoveImage: (id: number) => void;
  onRemovePending: (key: string) => void;
  onSetMain: (id: number) => void;
}

export function PhotoGallery({
  images,
  pending,
  onAdd,
  onRemoveImage,
  onRemovePending,
  onSetMain,
  emptyHint,
}: PhotoBinding & { emptyHint: string }) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {images.length + pending.length > 0 ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {images.map((image) => (
            <Tile key={image.id} src={image.image} main={image.is_main}>
              {!image.is_main && (
                <TileAction
                  label="Set as main photo"
                  onClick={() => onSetMain(image.id)}
                >
                  <Star />
                </TileAction>
              )}
              <TileAction
                label="Remove photo"
                destructive
                onClick={() => onRemoveImage(image.id)}
              >
                <Trash2 />
              </TileAction>
            </Tile>
          ))}
          {pending.map((photo) => (
            <Tile key={photo.key} src={photo.preview} note="Uploads on save">
              <TileAction
                label="Discard photo"
                destructive
                onClick={() => onRemovePending(photo.key)}
              >
                <Trash2 />
              </TileAction>
            </Tile>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus /> Choose files
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) onAdd(files);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function Tile({
  src,
  main,
  note,
  children,
}: {
  src: string;
  main?: boolean;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border bg-secondary/40",
        main ? "border-primary" : "border-border",
        note && "border-dashed",
      )}
    >
      {/* Uploads come from the API host and blob: URLs; next/image would
          need every one of those hosts declared up front. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full object-cover" />

      <div className="absolute right-1 top-1 flex gap-1">{children}</div>

      {main && (
        <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          Main
        </span>
      )}
      {note && (
        <span className="absolute bottom-1 left-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] font-medium text-background">
          {note}
        </span>
      )}
    </div>
  );
}

function TileAction({
  label,
  destructive,
  onClick,
  children,
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "rounded-md bg-card/90 p-1.5 text-secondary-foreground shadow-sm transition-colors [&_svg]:size-3.5",
        destructive ? "hover:bg-destructive hover:text-destructive-foreground" : "hover:bg-card",
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}
