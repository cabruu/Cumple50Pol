import { useState, useEffect, useRef } from "react";
import { Film, Upload, X, Send, Camera, Clapperboard, Play, Loader2, Download } from "lucide-react";
import "./cinema.css";
import { checkBlockedWords } from "./moderation";

const DEADLINE = new Date("2026-07-10T21:00:00");

const API_URL = "https://script.google.com/macros/s/AKfycbzGkGxJ588L7YV7fcMWG-viTRiYxA2MKHc-40Ujo3-5SkiExsvZGtbBqFvaId0_rsve2Q/exec";
// ────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  username: string;
  text: string;
  image?: string;
  timestamp: number;
}

function useDeadline() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const isPast = now >= DEADLINE;
  const diff = DEADLINE.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { isPast, days, hours, mins, secs };
}

function Timecode() {
  const [tick, setTick] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 40);
    return () => clearInterval(id);
  }, []);
  const elapsed = Date.now() - startRef.current;
  const totalFrames = Math.floor(elapsed / 40);
  const ff = String(totalFrames % 25).padStart(2, "0");
  const ss = String(Math.floor(totalFrames / 25) % 60).padStart(2, "0");
  const mm = String(Math.floor(totalFrames / 25 / 60) % 60).padStart(2, "0");
  const hh = String(Math.floor(totalFrames / 25 / 3600)).padStart(2, "0");
  return (
    <span className="font-mono-tc text-xs tracking-widest tabular-nums text-muted-foreground">
      {hh}:{mm}:{ss}:{ff}
    </span>
  );
}

function ClapStripe({ className = "" }: { className?: string }) {
  return <div className={`clap-stripe ${className}`} aria-hidden="true" />;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display font-black text-foreground tabular-nums"
        style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", lineHeight: 1 }}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono-tc text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function MessageCard({ msg, index, onImageClick }: { msg: Message; index: number; onImageClick?: (msg: Message) => void }) {
  return (
    <div
      className="card-enter bg-card border border-border rounded-sm p-5 flex flex-col gap-3 hover:border-primary/25 transition-colors duration-300"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {msg.image && (
        <button
          type="button"
          onClick={() => onImageClick?.(msg)}
          className="w-full aspect-video overflow-hidden rounded-sm bg-muted cursor-zoom-in group relative"
        >
          <img
            src={msg.image}
            alt={`Imagen de ${msg.username}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity font-mono-tc text-[10px] uppercase tracking-[0.2em] text-white bg-black/60 px-3 py-1.5 rounded-sm">
              Ver imagen
            </span>
          </div>
        </button>
      )}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
          <span className="text-primary text-[10px] font-bold font-mono-tc">
            {msg.username[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <span className="font-mono-tc text-xs text-primary uppercase tracking-wide truncate">
          {msg.username}
        </span>
      </div>
      <p className="text-sm text-foreground/75 leading-relaxed flex-1 whitespace-pre-wrap break-words">
        {msg.text}
      </p>
      <span className="font-mono-tc text-[10px] text-muted-foreground/40 mt-auto">
        {new Date(msg.timestamp).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

// ─── Visor de imagen ampliada, con descarga ─────────────────────────────────
function ImageLightbox({ msg, onClose }: { msg: Message; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDownload = async () => {
    if (!msg.image) return;
    setDownloading(true);
    try {
      // Traemos la imagen como blob para forzar la descarga en vez de que
      // el navegador la abra en una pestaña nueva (pasa con links externos,
      // como los de Google Drive).
      const res = await fetch(msg.image);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${msg.username}-cumple-pol.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Si falla el fetch (por CORS u otro motivo), como último recurso
      // abrimos la imagen en una pestaña nueva para que la guarden a mano.
      window.open(msg.image, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono-tc text-xs uppercase tracking-[0.2em] text-white/80">
            De {msg.username}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <img
          src={msg.image}
          alt={`Imagen de ${msg.username}`}
          className="w-full max-h-[70vh] object-contain rounded-sm bg-black"
        />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-mono-tc text-xs uppercase tracking-[0.2em] px-5 py-3 rounded-sm hover:bg-primary/85 disabled:opacity-60 transition-all duration-200 shrink-0"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {downloading ? "Descargando..." : "Descargar imagen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vista especial para el streamer ────────────────────────────────────────
function StreamerView({ messages, loading, loadError }: { messages: Message[]; loading: boolean; loadError: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const [lightboxMsg, setLightboxMsg] = useState<Message | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="font-mono-tc text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Revelando el rollo...
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="font-mono-tc text-xs uppercase tracking-[0.22em] text-red-400">
          No se pudo cargar el archivo
        </span>
        <p className="text-sm text-muted-foreground max-w-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="vignette fixed inset-0 pointer-events-none z-10" aria-hidden="true" />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono-tc text-[10px] uppercase tracking-[0.22em] text-muted-foreground hidden sm:block">
            PROYECCIÓN FINAL
          </span>
        </div>
        <Timecode />
        <div className="flex items-center gap-2">
          <span className="font-mono-tc text-[10px] text-muted-foreground hidden sm:block">
            ARCHIVO SELLADO
          </span>
          <Clapperboard className="w-3.5 h-3.5 text-primary" />
        </div>
      </header>

      {/* Hero de revelación */}
      <section className="relative z-20 flex flex-col items-center pt-14 pb-10 px-6 text-center">
        <ClapStripe className="w-full max-w-xl mb-10" />

        <p className="font-mono-tc text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-8">
          PRODUCCIÓN ESPECIAL
        </p>

        {!revealed ? (
          <div className="flex flex-col items-center gap-8">
            <h1 className="leading-[0.88]">
              <span
                className="font-display font-black uppercase text-foreground block"
                style={{ fontSize: "clamp(2.4rem, 10vw, 5.5rem)", letterSpacing: "-0.02em" }}
              >
                ESTA PELÍCULA ES TUYA,
              </span>
              <span
                className="font-display font-black uppercase text-primary block"
                style={{ fontSize: "clamp(4rem, 16vw, 9rem)", letterSpacing: "-0.03em" }}
              >
                POL
              </span>
            </h1>

            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              Tu comunidad grabó{" "}
              <span className="text-foreground font-medium">
                {messages.length} {messages.length === 1 ? "escena" : "escenas"}
              </span>{". "}
               El archivo está listo para proyectarse.
            </p>

            <button
              onClick={() => setRevealed(true)}
              className="mt-2 flex items-center gap-3 bg-primary text-primary-foreground font-mono-tc text-xs uppercase tracking-[0.25em] px-8 py-4 rounded-sm hover:bg-primary/85 transition-all duration-200 group"
            >
              <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Proyectar la película
            </button>
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            <h2
              className="font-display font-black uppercase text-foreground mb-2"
              style={{ fontSize: "clamp(1.8rem, 6vw, 3.5rem)", letterSpacing: "-0.02em" }}
            >
              FELIZ CUMPLE,{" "}
              <span className="text-primary">POL</span>
            </h2>
            <p className="font-mono-tc text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-12">
              {messages.length} {messages.length === 1 ? "TOMA" : "TOMAS"} EN EL ROLLO
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {messages.map((msg, i) => (
                <MessageCard key={msg.id} msg={msg} index={i} onImageClick={setLightboxMsg} />
              ))}
            </div>
          </div>
        )}
      </section>

      {lightboxMsg && <ImageLightbox msg={lightboxMsg} onClose={() => setLightboxMsg(null)} />}

      <footer className="relative z-20 border-t border-border py-6 px-6 text-center mt-12">
        <span className="font-mono-tc text-[10px] uppercase tracking-[0.22em] text-muted-foreground/40">
          © PRODUCCIÓN ESPECIAL · CUMPLEAÑOS 50 POL
        </span>
      </footer>
    </div>
  );
}

// ─── Vista pública (formulario + muro) ──────────────────────────────────────
export default function App() {
  const { isPast, days, hours, mins, secs } = useDeadline();

  // Los mensajes de TODOS solo se cargan del lado del streamer, después del
  // deadline. Antes de eso nunca se piden ni se muestran acá, para que sea
  // sorpresa (aunque alguien mire el código o la red del navegador).
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Cuando pasa el deadline, pedir todos los mensajes al backend para armar
  // la vista del streamer.
  useEffect(() => {
    if (!isPast) return;
    let cancelled = false;
    setLoadingMessages(true);
    fetch(`${API_URL}?action=list`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setMessages(data.messages);
        } else {
          setLoadError(data.error || "Todavía no está disponible el archivo.");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("No se pudo conectar con la base de datos.");
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPast]);

  // Cuando pasa el deadline, mostrar la vista del streamer
  if (isPast) return <StreamerView messages={messages} loading={loadingMessages} loadError={loadError} />;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const clearImage = () => {
    setImageData(undefined);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError("Necesitas poner tu usuario de Twitch."); return; }
    if (!text.trim()) { setError("El mensaje no puede estar vacío."); return; }

    // Chequeo de palabras bloqueadas del lado del cliente (feedback instantáneo).
    // La validación que de verdad importa la hace el servidor (Apps Script).
    const modCheck = checkBlockedWords(username, text);
    if (modCheck.blocked) {
      setError("Tu mensaje contiene una palabra no permitida. Editalo y volvé a intentar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS con Apps Script
        body: JSON.stringify({
          action: "add",
          username: username.trim(),
          text: text.trim(),
          image: imageData || "",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "No se pudo grabar tu escena. Probá de nuevo.");
        setSubmitting(false);
        return;
      }
    } catch {
      setError("No se pudo conectar con la base de datos. Probá de nuevo en un rato.");
      setSubmitting(false);
      return;
    }

    setUsername("");
    setText("");
    setImageData(undefined);
    if (fileRef.current) fileRef.current.value = "";
    setError(null);
    setSubmitting(false);
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 2800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="vignette fixed inset-0 pointer-events-none z-10" aria-hidden="true" />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono-tc text-[10px] uppercase tracking-[0.22em] text-muted-foreground hidden sm:block">
            ROLLO DE CUMPLEAÑOS
          </span>
        </div>
        <Timecode />
        <div className="flex items-center gap-2">
          <span className="font-mono-tc text-[10px] text-muted-foreground hidden sm:block">
            25fps · REC
          </span>
          <div className="rec-dot w-1.5 h-1.5 rounded-full bg-red-500" />
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-20 flex flex-col items-center pt-14 pb-10 px-6 text-center">
        <ClapStripe className="w-full max-w-xl mb-10 rounded-none" />

        <p className="font-mono-tc text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-8">
          PRODUCCIÓN ESPECIAL · CUMPLEAÑOS POL
        </p>

        <h1 className="leading-[0.88] mb-0">
          <span
            className="font-display font-black uppercase text-foreground block"
            style={{ fontSize: "clamp(3.2rem, 13vw, 7.5rem)", letterSpacing: "-0.02em" }}
          >
            FELIZ CUMPLE
          </span>
          <span
            className="font-display font-black uppercase text-primary block"
            style={{ fontSize: "clamp(4rem, 16vw, 9rem)", letterSpacing: "-0.03em" }}
          >
            POL
          </span>
        </h1>

        <p className="mt-8 max-w-sm text-sm text-muted-foreground leading-relaxed">
          En este espacio podes dejar tu mensajito para Pol. Es sorpresa, nadie la va a ver hasta que abra el archivo el día de su cumpleaños.
        </p>

        {/* Countdown */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <span className="font-mono-tc text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            El envío se cierra en
          </span>
          <div className="flex items-end gap-5">
            <CountdownUnit value={days} label="días" />
            <span className="font-display font-black text-muted-foreground/30 pb-5" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>:</span>
            <CountdownUnit value={hours} label="horas" />
            <span className="font-display font-black text-muted-foreground/30 pb-5" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>:</span>
            <CountdownUnit value={mins} label="min" />
            <span className="font-display font-black text-muted-foreground/30 pb-5" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>:</span>
            <CountdownUnit value={secs} label="seg" />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-8">
          <div className="h-px w-16 bg-border" />
          <Camera className="w-4 h-4 text-muted-foreground/40" />
          <div className="h-px w-16 bg-border" />
        </div>
      </section>

      {/* Form */}
      <section className="relative z-20 px-4 pb-20 flex justify-center">
        <div ref={formRef} className={`w-full max-w-lg ${justSubmitted ? "flash-success" : ""}`}>
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <ClapStripe />
            <form onSubmit={handleSubmit} className="p-7 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono-tc text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  TU ESCENA
                </span>
              </div>

              <div className="space-y-2">
                <label className="font-mono-tc text-[10px] uppercase tracking-[0.22em] text-muted-foreground block">
                  Usuario de Twitch
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu_usuario"
                  maxLength={50}
                  className="w-full bg-muted border border-border rounded-sm px-4 py-3 text-foreground placeholder:text-muted-foreground/40 font-mono-tc text-sm focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono-tc text-[10px] uppercase tracking-[0.22em] text-muted-foreground block">
                  Tu Mensaje
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribe tu dedicatoria..."
                  maxLength={1000}
                  rows={4}
                  className="w-full bg-muted border border-border rounded-sm px-4 py-3 text-foreground placeholder:text-muted-foreground/40 font-mono-tc text-sm focus:outline-none focus:border-primary/60 transition-colors resize-none"
                />
                <div className="text-right font-mono-tc text-[10px] text-muted-foreground/40">
                  {text.length}/1000
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono-tc text-[10px] uppercase tracking-[0.22em] text-muted-foreground block">
                  Imagen / Dibujo{" "}
                  <span className="text-muted-foreground/30 normal-case tracking-normal">(opcional)</span>
                </label>
                {imageData ? (
                  <div className="relative group rounded-sm overflow-hidden border border-border">
                    <img src={imageData} alt="Preview de tu imagen" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-background/85 p-1.5 rounded-sm border border-border hover:bg-background hover:border-primary/40 transition-colors"
                    >
                      <X className="w-3 h-3 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border border-dashed border-border rounded-sm py-7 flex flex-col items-center gap-2.5 text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors duration-200"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="font-mono-tc text-[10px] uppercase tracking-[0.22em]">Subir imagen</span>
                    <span className="text-[10px] opacity-40">PNG, JPG · máx 5 MB</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              {error && (
                <p className="font-mono-tc text-xs text-red-400/90 border border-red-400/15 bg-red-400/5 rounded-sm px-3 py-2.5">
                  {error}
                </p>
              )}
              {justSubmitted && (
                <p className="font-mono-tc text-xs text-primary/90 border border-primary/20 bg-primary/5 rounded-sm px-3 py-2.5 text-center">
                  ¡Escena grabada en el rollo! 🎬
                </p>
              )}

              <button
                type="submit"
                disabled={justSubmitted || submitting}
                className="w-full bg-primary text-primary-foreground font-mono-tc text-xs uppercase tracking-[0.2em] py-3.5 rounded-sm flex items-center justify-center gap-2 hover:bg-primary/85 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {submitting ? "Grabando..." : "Grabar mi escena"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="relative z-20 border-t border-border py-6 px-6 text-center">
        <span className="font-mono-tc text-[10px] uppercase tracking-[0.22em] text-muted-foreground/40">
          © PRODUCCIÓN ESPECIAL · CUMPLEAÑOS 50 POL
        </span>
      </footer>
    </div>
  );
}
