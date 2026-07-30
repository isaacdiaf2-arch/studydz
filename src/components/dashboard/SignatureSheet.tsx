import { useEffect, useRef, useState } from "react";
import { Check, Redo2, Trash2, Undo2, X } from "lucide-react";

const COLORS = ["#e53935", "#8e0000", "#2f4fe0", "#1e3a72", "#6b7280", "#111111"];

/**
 * Full-screen signature capture (finger, mouse, stylus) — matches the
 * "وقّع" sheet used across the contract flow.
 */
export function SignatureSheet({
  open,
  title = "وقّع",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const strokes = useRef<{ color: string; width: number; points: { x: number; y: number }[] }[]>([]);
  const redoStack = useRef<typeof strokes.current>([]);
  const [color, setColor] = useState(COLORS[COLORS.length - 1]);
  const [width, setWidth] = useState(20);
  const [hasInk, setHasInk] = useState(false);

  function repaint() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes.current) {
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    setHasInk(strokes.current.length > 0);
  }

  useEffect(() => {
    if (!open) return;
    strokes.current = [];
    redoStack.current = [];
    const id = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      repaint();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0);
    return out.toDataURL("image/png");
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-secondary/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-3">
        <button
          type="button"
          aria-label="اعتماد التوقيع"
          disabled={!hasInk}
          onClick={() => {
            const url = exportPng();
            if (url) onConfirm(url);
          }}
          className="grid h-11 w-16 place-items-center rounded-xl bg-background shadow-sm disabled:opacity-40"
        >
          <Check className="h-6 w-6" />
        </button>
        <p className="font-display text-lg font-extrabold">{title}</p>
        <button
          type="button"
          aria-label="إغلاق"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-xl"
        >
          <X className="h-7 w-7" />
        </button>
      </div>

      <div className="mx-3 flex flex-1 flex-col rounded-2xl bg-background shadow-sm">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2">
            <div className="border-b-2 border-dashed border-border" />
          </div>
          {!hasInk && (
            <p className="pointer-events-none absolute inset-0 grid place-items-center font-display text-4xl text-muted-foreground/40">
              وقّع هنا
            </p>
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={(e) => {
              drawing.current = true;
              redoStack.current = [];
              strokes.current.push({ color, width: Math.max(2, width / 6), points: [point(e)] });
              e.currentTarget.setPointerCapture(e.pointerId);
              repaint();
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              strokes.current[strokes.current.length - 1].points.push(point(e));
              repaint();
            }}
            onPointerUp={() => {
              drawing.current = false;
            }}
            onPointerLeave={() => {
              drawing.current = false;
            }}
          />
        </div>
        <div className="flex items-center gap-4 border-t border-border px-5 py-3">
          <button
            type="button"
            aria-label="مسح الكل"
            onClick={() => {
              strokes.current = [];
              redoStack.current = [];
              repaint();
            }}
          >
            <Trash2 className="h-6 w-6 text-muted-foreground" />
          </button>
          <button
            type="button"
            aria-label="تراجع"
            onClick={() => {
              const last = strokes.current.pop();
              if (last) redoStack.current.push(last);
              repaint();
            }}
          >
            <Undo2 className="h-6 w-6 text-muted-foreground" />
          </button>
          <button
            type="button"
            aria-label="إعادة"
            onClick={() => {
              const next = redoStack.current.pop();
              if (next) strokes.current.push(next);
              repaint();
            }}
          >
            <Redo2 className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div className="flex items-center justify-around rounded-2xl bg-background p-3 shadow-sm">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`اللون ${c}`}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-8 w-8 rounded-md ${color === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-background px-5 py-3 shadow-sm">
          <span className="font-display text-lg font-extrabold">{width}</span>
          <input
            type="range"
            min={4}
            max={40}
            value={width}
            aria-label="سماكة القلم"
            onChange={(e) => setWidth(Number(e.target.value))}
            className="flex-1 accent-destructive"
          />
        </div>
      </div>
    </div>
  );
}
