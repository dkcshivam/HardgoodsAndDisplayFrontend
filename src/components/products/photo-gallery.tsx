"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogRoot,
  DialogContent,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [camera, setCamera] = useState(false);

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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCamera(true)}
        >
          <Camera /> Take photo
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

      <CameraDialog
        open={camera}
        onOpenChange={setCamera}
        onCapture={(file) => {
          onAdd([file]);
          setCamera(false);
        }}
      />
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

/**
 * The packer photographs the carton where it stands, so the camera has to be
 * in the app. Browsers only grant it over HTTPS or on localhost.
 *
 * Mounted only while open, so the stream starts and stops with the dialog.
 */
function CameraDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      {open && (
        <CameraStage onCancel={() => onOpenChange(false)} onCapture={onCapture} />
      )}
    </DialogRoot>
  );
}

function CameraStage({
  onCancel,
  onCapture,
}: {
  onCancel: () => void;
  onCapture: (file: File) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  // Browsers hide mediaDevices entirely on an insecure origin.
  const [error, setError] = useState<string | null>(() =>
    navigator.mediaDevices
      ? null
      : "This browser will not open a camera unless the page is on HTTPS or localhost.",
  );

  useEffect(() => {
    if (!navigator.mediaDevices) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((opened) => {
        stream = opened;
        if (cancelled) return;
        if (video.current) video.current.srcObject = opened;
        setReady(true);
      })
      .catch(() =>
        setError("No camera available, or permission was refused in the browser."),
      );

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const source = video.current;
    if (!source) return;

    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    canvas.getContext("2d")?.drawImage(source, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(
          new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <DialogContent
      title="Take a photo"
      description="Frame the item and capture. The photo joins the gallery."
    >
      <DialogBody>
        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : (
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full rounded-lg bg-foreground/90 object-cover"
          />
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={capture} disabled={!ready}>
          <Camera /> Capture
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
