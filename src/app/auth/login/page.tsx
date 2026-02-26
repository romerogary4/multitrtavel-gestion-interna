"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn.email({ email: form.email, password: form.password });
      if (result.error) { toast.error("Credenciales incorrectas"); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f4f4f6" }}>

      {/* ── Left panel ── */}
      <div style={{
        width: "50%", background: "white", display: "flex",
        flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: "60px", borderRight: "1px solid #ebebeb", position: "relative",
        overflow: "hidden", animation: "loginLeftIn 0.7s cubic-bezier(0.16,1,0.3,1) both"
      }}>

        <div style={{
          position: "absolute", top: -80, right: -80, width: 240, height: 240,
          borderRadius: "50%", background: "radial-gradient(circle, #fee2e2 0%, transparent 70%)",
          animation: "floatOrb 8s ease-in-out infinite alternate"
        }} />
        <div style={{
          position: "absolute", bottom: -60, left: -60, width: 180, height: 180,
          borderRadius: "50%", background: "radial-gradient(circle, #fee2e2 0%, transparent 70%)",
          animation: "floatOrb 10s ease-in-out 2s infinite alternate-reverse"
        }} />
        <div style={{
          position: "absolute", top: "40%", left: -30, width: 100, height: 100,
          borderRadius: "50%", background: "radial-gradient(circle, #fecaca 0%, transparent 70%)",
          animation: "floatOrb 12s ease-in-out 1s infinite alternate"
        }} />

        <div style={{ position: "relative", textAlign: "center", maxWidth: 340 }}>
          <div style={{
            position: "relative", display: "inline-block", marginBottom: 24,
            animation: "logoEntrance 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both"
          }}>

            {/* Órbita punteada */}
            <div style={{
              position: "absolute", inset: -22, borderRadius: "50%",
              border: "1.5px dashed rgba(204,17,17,0.25)",
              animation: "spinOrbit 8s linear infinite",
              pointerEvents: "none",
            }} />

            {/* Avión orbitando */}
            <div style={{
              position: "absolute", inset: -22, borderRadius: "50%",
              animation: "spinOrbit 8s linear infinite",
              pointerEvents: "none",
            }}>
              <span style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: 24, height: 24,
                marginTop: -12, marginLeft: -12,
                fontSize: 20, lineHeight: "24px", textAlign: "center",
                transform: "translateY(-73px) rotate(90deg)",
                display: "block",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
              }}>✈️</span>
            </div>

            {/* Logo */}
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 100, height: 100, borderRadius: 24, background: "#fafafa",
              border: "2px solid #ebebeb", cursor: "default",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)"
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(204,17,17,0.2)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)";
              }}>
              <img src="/logo.jpg" alt="Logo"
                style={{ width: 88, height: 88, objectFit: "contain", borderRadius: 18 }} />
            </div>
          </div>

          <h1 style={{
            fontFamily: "var(--font-playfair)", fontSize: 32, fontWeight: 800,
            color: "#0f0f0f", marginBottom: 8, lineHeight: 1.2,
            animation: "loginLeftIn 0.6s ease 0.35s both"
          }}>
            MultiTravel<br />Cherry Matute
          </h1>
          <p style={{
            fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 40,
            animation: "loginLeftIn 0.6s ease 0.45s both"
          }}>
            Sistema interno de gestión para agentes<br />y administradores de la agencia
          </p>

          <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
            {[
              { n: "España", sub: "y Centroamérica" },
              { n: "2", sub: "roles de acceso" },
              { n: "100%", sub: "seguro" },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: "center",
                animation: `loginLeftIn 0.5s ease ${0.55 + i * 0.1}s both`
              }}>
                <p style={{
                  fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 800,
                  color: "#cc1111"
                }}>{s.n}</p>
                <p style={{ fontSize: 11, color: "#b0b0b8", marginTop: 2 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes loginLeftIn {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes logoEntrance {
            from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
            to   { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes floatOrb {
            from { transform: translate(0, 0) scale(1); }
            to   { transform: translate(15px, 20px) scale(1.1); }
          }
          @keyframes spinOrbit {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes floatEmoji0 {
            0%   { transform: translateY(0px) rotate(0deg) scale(1); }
            33%  { transform: translateY(-22px) rotate(12deg) scale(1.1); }
            66%  { transform: translateY(8px) rotate(-6deg) scale(0.95); }
            100% { transform: translateY(-14px) rotate(8deg) scale(1.05); }
          }
          @keyframes floatEmoji1 {
            0%   { transform: translateY(0px) rotate(0deg) scale(1); }
            40%  { transform: translateY(18px) rotate(-10deg) scale(1.08); }
            70%  { transform: translateY(-20px) rotate(6deg) scale(0.92); }
            100% { transform: translateY(10px) rotate(-8deg) scale(1.06); }
          }
          @keyframes floatEmoji2 {
            0%   { transform: translateY(0px) rotate(5deg) scale(1); }
            30%  { transform: translateY(-25px) rotate(-8deg) scale(1.12); }
            60%  { transform: translateY(12px) rotate(10deg) scale(0.94); }
            100% { transform: translateY(-8px) rotate(-5deg) scale(1.04); }
          }
          .input-field:focus {
            border-color: #cc1111 !important;
            box-shadow: 0 0 0 3px rgba(204,17,17,0.12) !important;
            outline: none !important;
          }
        `}</style>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        width: "50%", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "60px", position: "relative", overflow: "hidden"
      }}>

        {/* Emojis flotantes fondo derecho */}
        {[
          { e: "🍒", x: 5, y: 8, s: 28, d: 14, delay: 0 },
          { e: "✈️", x: 80, y: 5, s: 26, d: 18, delay: 2 },
          { e: "🍒", x: 88, y: 50, s: 30, d: 16, delay: 5 },
          { e: "✈️", x: 3, y: 65, s: 24, d: 20, delay: 3 },
          { e: "🍒", x: 45, y: 88, s: 28, d: 15, delay: 7 },
          { e: "✈️", x: 68, y: 78, s: 26, d: 19, delay: 1 },
          { e: "🍒", x: 12, y: 38, s: 24, d: 17, delay: 9 },
          { e: "✈️", x: 85, y: 32, s: 28, d: 21, delay: 4 },
          { e: "🍒", x: 32, y: 3, s: 22, d: 18, delay: 6 },
          { e: "✈️", x: 58, y: 18, s: 26, d: 16, delay: 8 },
          { e: "🍒", x: 72, y: 42, s: 30, d: 13, delay: 2 },
          { e: "✈️", x: 20, y: 72, s: 24, d: 22, delay: 5 },
          { e: "🍒", x: 92, y: 20, s: 26, d: 17, delay: 10 },
          { e: "✈️", x: 40, y: 55, s: 28, d: 15, delay: 3 },
          { e: "🍒", x: 15, y: 92, s: 24, d: 19, delay: 7 },
          { e: "✈️", x: 55, y: 70, s: 26, d: 14, delay: 1 },
          { e: "🍒", x: 78, y: 62, s: 28, d: 20, delay: 8 },
          { e: "✈️", x: 25, y: 22, s: 24, d: 16, delay: 4 },
          { e: "🍒", x: 62, y: 35, s: 30, d: 18, delay: 6 },
          { e: "✈️", x: 95, y: 80, s: 22, d: 21, delay: 9 },
          { e: "🍒", x: 8, y: 55, s: 26, d: 15, delay: 11 },
          { e: "✈️", x: 48, y: 12, s: 28, d: 17, delay: 0 },
          { e: "🍒", x: 35, y: 75, s: 24, d: 19, delay: 13 },
          { e: "✈️", x: 75, y: 95, s: 26, d: 14, delay: 5 },
          { e: "🍒", x: 52, y: 48, s: 22, d: 22, delay: 2 },
        ].map((item, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${item.x}%`, top: `${item.y}%`,
            fontSize: item.s, opacity: 0.13,
            animation: `floatEmoji${i % 3} ${item.d}s ease-in-out ${item.delay}s infinite alternate`,
            pointerEvents: "none", userSelect: "none", zIndex: 0,
          }}>{item.e}</div>
        ))}

        <div style={{ width: "100%", maxWidth: 380, position: "relative", zIndex: 1 }} className="animate-fade-up">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fee2e2", borderRadius: 99, padding: "5px 12px", marginBottom: 28
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#cc1111",
              display: "inline-block"
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#cc1111" }}>
              Solo personal autorizado
            </span>
          </div>

          <h2 style={{
            fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 800,
            color: "#0f0f0f", marginBottom: 6
          }}>
            Bienvenido de nuevo
          </h2>
          <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32 }}>
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 600,
                color: "#374151", marginBottom: 7
              }}>
                Correo electrónico
              </label>
              <input type="email" required value={form.email}
                placeholder="agente@multitravel.es"
                autoComplete="username"
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field" />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 600,
                color: "#374151", marginBottom: 7
              }}>
                Contraseña
              </label>
              <input type="password" required value={form.password}
                placeholder="••••••••"
                autoComplete="new-password"
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary"
              style={{
                marginTop: 4, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8
              }}>
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white", borderRadius: "50%", display: "inline-block"
                  }}
                    className="animate-spin" />
                  Ingresando...
                </>
              ) : "Ingresar al sistema →"}
            </button>
          </form>

          <p style={{ fontSize: 12, color: "#c0c0c8", textAlign: "center", marginTop: 32 }}>
            🔒 Sistema privado · MultiTravel Cherry Matute © 2026
          </p>
        </div>
      </div>
    </div>
  );
}