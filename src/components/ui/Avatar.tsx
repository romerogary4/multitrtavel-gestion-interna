"use client";

import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: number;
  round?: boolean;
}

function getGradient(name: string) {
  const gradients = [
    ["#cc1111", "#e52222"],
    ["#2563eb", "#3b82f6"],
    ["#16a34a", "#22c55e"],
    ["#d97706", "#f59e0b"],
    ["#7c3aed", "#8b5cf6"],
    ["#0891b2", "#06b6d4"],
    ["#be185d", "#ec4899"],
    ["#b45309", "#d97706"],
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % gradients.length;
  return gradients[idx];
}

export function Avatar({ name, image, size = 36, round = false }: AvatarProps) {
  const initials = name.split(" ").map(n => n.charAt(0)).slice(0, 2).join("").toUpperCase();
  const borderRadius = round ? "50%" : Math.round(size * 0.28);
  const [imgError, setImgError] = useState(false);

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size, borderRadius, objectFit: "cover",
          flexShrink: 0, border: "2px solid rgba(255,255,255,0.8)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)", display: "block"
        }}
      />
    );
  }

  const [c1, c2] = getGradient(name);
  return (
    <div style={{
      width: size, height: size, borderRadius, flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: 800, fontSize: Math.round(size * 0.38),
      fontFamily: "var(--font-inter), sans-serif", letterSpacing: "-0.5px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
    }}>
      {initials}
    </div>
  );
}

// ─── Cropper Modal ─────────────────────────────────────────────────────────────

interface CropperModalProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

function CropperModal({ src, onConfirm, onCancel }: CropperModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerSize = 300;
  const outputSize = 256;

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const touchStart = useRef({ tx: 0, ty: 0, ox: 0, oy: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const minZoom = containerSize / Math.min(img.naturalWidth, img.naturalHeight);
      const initZoom = Math.max(minZoom, 1);
      setZoom(initZoom);
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setOffset({
        x: (containerSize - img.naturalWidth * initZoom) / 2,
        y: (containerSize - img.naturalHeight * initZoom) / 2,
      });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!canvasRef.current || !imgRef.current || imgNatural.w === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, containerSize, containerSize);
    ctx.drawImage(imgRef.current, offset.x, offset.y, imgNatural.w * zoom, imgNatural.h * zoom);
  }, [offset, zoom, imgNatural]);

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  }
  function onMouseUp() { setDragging(false); }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { tx: t.clientX, ty: t.clientY, ox: offset.x, oy: offset.y };
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    setOffset({
      x: touchStart.current.ox + (t.clientX - touchStart.current.tx),
      y: touchStart.current.oy + (t.clientY - touchStart.current.ty),
    });
  }

  function handleZoom(e: React.ChangeEvent<HTMLInputElement>) {
    const newZoom = Number(e.target.value);
    const ratio = newZoom / zoom;
    setOffset(prev => ({
      x: containerSize / 2 - (containerSize / 2 - prev.x) * ratio,
      y: containerSize / 2 - (containerSize / 2 - prev.y) * ratio,
    }));
    setZoom(newZoom);
  }

  function handleConfirm() {
    if (!imgRef.current || imgNatural.w === 0) return;
    const out = document.createElement("canvas");
    out.width = outputSize;
    out.height = outputSize;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const scale = outputSize / containerSize;
    ctx.drawImage(
      imgRef.current,
      offset.x * scale, offset.y * scale,
      imgNatural.w * zoom * scale, imgNatural.h * zoom * scale
    );
    out.toBlob(blob => { if (blob) onConfirm(blob); }, "image/jpeg", 0.92);
  }

  const minZoom = imgNatural.w > 0 ? containerSize / Math.min(imgNatural.w, imgNatural.h) : 0.5;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.72)", display: "flex",
        alignItems: "center", justifyContent: "center"
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: "white", borderRadius: 20, padding: 28,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)", maxWidth: 400, width: "90%"
      }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111", margin: 0 }}>
          Ajustar foto de perfil
        </h3>
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "-12px 0 0", textAlign: "center" }}>
          Arrastra para reposicionar · Zoom con el deslizador
        </p>

        {/* Área de crop */}
        <div style={{ position: "relative", width: containerSize, height: containerSize, cursor: dragging ? "grabbing" : "grab", borderRadius: "50%", overflow: "hidden" }}>
          <canvas
            ref={canvasRef}
            width={containerSize}
            height={containerSize}
            style={{ display: "block", userSelect: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
          />
          {/* Borde circular rojo */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "3px solid #cc1111", pointerEvents: "none"
          }} />
        </div>

        {/* Zoom slider */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            type="range"
            min={minZoom}
            max={minZoom * 4}
            step={0.01}
            value={zoom}
            onChange={handleZoom}
            style={{ flex: 1, accentColor: "#cc1111" }}
          />
          <span style={{ fontSize: 20 }}>🔎</span>
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, fontFamily: "inherit",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            background: "white", border: "1.5px solid #e0e0e8", color: "#374151"
          }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, fontFamily: "inherit",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            background: "#cc1111", border: "none", color: "white"
          }}>
            Guardar foto
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AvatarUpload ──────────────────────────────────────────────────────────────

export function AvatarUpload({ agentId, name, image, onUploaded }: {
  agentId: string; name: string; image?: string | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localImage, setLocalImage] = useState<string | null | undefined>(image);
  const [imgError, setImgError] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Sincronizar cuando el padre actualiza la prop (ej. recarga)
  useEffect(() => {
    if (image) {
      setLocalImage(image);
      setImgError(false);
    }
  }, [image]);

  const initials = name.split(" ").map(n => n.charAt(0)).slice(0, 2).join("").toUpperCase();
  const [c1, c2] = getGradient(name);
  const SIZE = 64;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("La imagen no puede superar 10MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    // Preview inmediato desde blob local
    const previewUrl = URL.createObjectURL(blob);
    setLocalImage(previewUrl);
    setImgError(false);

    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", blob, "avatar.jpg");
    try {
      const r = await fetch(`/api/upload-avatar?userId=${agentId}`, { method: "POST", body: fd });
      if (r.ok) {
        const d = await r.json();
        // Cache bust: forzar recarga desde servidor
        const urlFinal = d.url + "?t=" + Date.now();
        setLocalImage(urlFinal);
        setImgError(false);
        onUploaded(d.url);
        toast.success("Foto actualizada ✓");
      } else {
        const err = await r.json();
        toast.error(err.error || "Error subiendo foto");
        setLocalImage(image ?? null);
      }
    } catch {
      toast.error("Error de conexión");
      setLocalImage(image ?? null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(previewUrl);
    }
  }

  return (
    <>
      {cropSrc && (
        <CropperModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div
        style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0, cursor: "pointer" }}
        onClick={() => !uploading && inputRef.current?.click()}
        title="Cambiar foto"
      >
        {localImage && !imgError ? (
          <img
            src={localImage}
            alt={name}
            onError={() => { setImgError(true); setLocalImage(null); }}
            style={{
              width: SIZE, height: SIZE, borderRadius: "50%", objectFit: "cover",
              border: "3px solid white", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", display: "block"
            }}
          />
        ) : (
          <div style={{
            width: SIZE, height: SIZE, borderRadius: "50%",
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 800, fontSize: 22,
            border: "3px solid white", boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
          }}>
            {initials}
          </div>
        )}

        {/* Overlay hover con cámara */}
        <div
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "rgba(0,0,0,0)", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "background 0.2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.45)";
            const icon = e.currentTarget.querySelector("span") as HTMLElement;
            if (icon) icon.style.opacity = "1";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)";
            const icon = e.currentTarget.querySelector("span") as HTMLElement;
            if (icon) icon.style.opacity = "0";
          }}
        >
          {uploading ? (
            <div style={{
              width: 18, height: 18, border: "2px solid white",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
          ) : (
            <span style={{ opacity: 0, transition: "opacity 0.2s", fontSize: 20 }}>📷</span>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect} style={{ display: "none" }} />
      </div>
    </>
  );
}