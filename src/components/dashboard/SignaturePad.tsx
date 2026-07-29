import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  value,
  onSave,
  label,
}: {
  value?: string | null;
  onSave: (dataUrl: string) => void;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value ? (
        <img src={value} alt={label} className="mt-2 h-28 w-full object-contain" />
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={520}
            height={140}
            className="mt-2 h-32 w-full touch-none rounded-md border border-dashed border-border bg-secondary/40"
            onPointerDown={(e) => {
              drawing.current = true;
              setDirty(true);
              const ctx = e.currentTarget.getContext("2d");
              const p = pos(e);
              ctx?.beginPath();
              ctx?.moveTo(p.x, p.y);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const ctx = e.currentTarget.getContext("2d");
              const p = pos(e);
              ctx?.lineTo(p.x, p.y);
              ctx?.stroke();
            }}
            onPointerUp={() => {
              drawing.current = false;
            }}
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={!dirty}
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                onSave(canvas.toDataURL("image/png"));
              }}
            >
              حفظ الإمضاء
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext("2d");
                if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                setDirty(false);
              }}
            >
              مسح
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            أمضِ بإصبعك على الهاتف أو بفأرة الحاسوب داخل الإطار.
          </p>
        </>
      )}
    </div>
  );
}
