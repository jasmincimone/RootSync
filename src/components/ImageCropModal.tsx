"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/Button";

const ASPECT_RATIOS = [
  { label: "Free", value: 0 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
] as const;

async function getCroppedBlob(
  imageSrc: string,
  crop: Area,
): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

export function ImageCropModal({
  imageSrc,
  onCrop,
  onCancel,
  initialAspect,
}: {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
  initialAspect?: number;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(initialAspect ?? 0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onCrop(blob);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl">
        <p className="text-sm font-semibold text-fix-heading">Crop image</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.label}
              type="button"
              onClick={() => setAspect(ar.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                aspect === ar.value
                  ? "bg-forest text-white"
                  : "bg-fix-bg-muted text-fix-text-muted"
              }`}
            >
              {ar.label}
            </button>
          ))}
        </div>
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect || undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-fix-text-muted">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="cta"
            size="sm"
            onClick={handleConfirm}
            disabled={processing || !croppedArea}
          >
            {processing ? "Cropping…" : "Apply crop"}
          </Button>
        </div>
      </div>
    </div>
  );
}
