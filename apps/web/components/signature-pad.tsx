"use client";

import { useEffect, useRef, useState } from "react";

type SignatureValue = {
  dataUrl: string;
  width: number;
  height: number;
};

type SignaturePadProps = {
  disabled?: boolean;
  onChange: (value: SignatureValue | null) => void;
};

const PAD_HEIGHT = 220;

export function SignaturePad({ disabled = false, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(PAD_HEIGHT * ratio);
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    context.lineWidth = 2.5;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, PAD_HEIGHT);
  }, []);

  function emitSignature() {
    const canvas = canvasRef.current;

    if (!canvas || isEmpty) {
      onChange(null);
      return;
    }

    onChange({
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height
    });
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) {
      return;
    }

    const point = getPoint(event);

    if (!point) {
      return;
    }

    drawingRef.current = true;
    lastPointRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) {
      return;
    }

    const point = getPoint(event);
    const previous = lastPointRef.current;
    const canvas = canvasRef.current;

    if (!point || !previous || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    lastPointRef.current = point;

    if (isEmpty) {
      setIsEmpty(false);
    }
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
    emitSignature();
  }

  function clearSignature() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-3">
        <canvas
          ref={canvasRef}
          className="h-[220px] w-full touch-none rounded-[18px] bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {isEmpty ? "La firma aún no se ha capturado." : "Firma capturada y lista para guardar."}
        </p>
        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-signal hover:text-signal disabled:cursor-not-allowed disabled:opacity-70"
        >
          Limpiar firma
        </button>
      </div>
    </div>
  );
}
