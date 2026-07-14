import { CSSProperties, DragEvent, FormEvent, useEffect, useState } from "react";
import { Ban, Check, EyeOff, House, ImageMinus, LogOut, Send } from "lucide-react";

import { ParticleButton } from "@/components/ui/particle-button";
import uploadIconSrc from "@/assets/upload-icon.png";

type TributeType = "birthday" | "yearly_letter";
type DisplayMode = "named" | "anonymous";
type TributeStatus = "pending" | "approved" | "rejected" | "hidden";
type Visibility = "public" | "private";
type StickyNoteColor = "sky" | "mint" | "lavender";
type PenStyle = "classic" | "marker" | "fountain" | "gel";

type Tribute = {
  id: string;
  type: TributeType;
  title: string | null;
  content: string;
  display_mode: DisplayMode;
  submitted_name: string | null;
  relationship_to_ken: string | null;
  year_tag: number | null;
  occasion_date: string | null;
  image_data_url: string | null;
  sticky_note_color: StickyNoteColor;
  pen_style: PenStyle;
  public_display_name: string;
  status: TributeStatus;
  visibility: Visibility;
  moderation_notes: string | null;
  submitted_at: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  has_image?: boolean;
  is_anonymous: boolean;
  public_author_label: string;
};

type SubmissionFormState = {
  type: TributeType;
  title: string;
  content: string;
  display_mode: DisplayMode;
  submitted_name: string;
  image_data_url: string | null;
  image_name: string;
  sticky_note_color: StickyNoteColor;
  pen_style: PenStyle;
};

type TributeFilters = {
  type: "all" | TributeType;
  anonymous: "all" | "true" | "false";
};

type AdminPatchForm = {
  title: string;
  content: string;
  relationship_to_ken: string;
  year_tag: string;
  occasion_date: string;
  moderation_notes: string;
  visibility: Visibility;
  moderation_status: TributeStatus;
  featured: boolean;
  image_data_url: string | null;
};

const INITIAL_FORM: SubmissionFormState = {
  type: "birthday",
  title: "",
  content: "",
  display_mode: "named",
  submitted_name: "",
  image_data_url: null,
  image_name: "",
  sticky_note_color: "mint",
  pen_style: "classic"
};

const INITIAL_FILTERS: TributeFilters = {
  type: "all",
  anonymous: "all"
};

const ADMIN_TOKEN_KEY = "ken_admin_token";
const TRIBUTE_STYLE_OVERRIDES_KEY = "ken_tribute_style_overrides";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const NOTE_COLORS: Array<{ value: StickyNoteColor; label: string; className: string }> = [
  { value: "sky", label: "Sky", className: "note-sky" },
  { value: "mint", label: "Mint", className: "note-mint" },
  { value: "lavender", label: "Lavender", className: "note-lavender" }
];
const LOADING_TRIBUTE_PLACEHOLDERS: StickyNoteColor[] = ["mint", "sky", "lavender", "mint", "sky", "lavender"];
const PEN_STYLES: Array<{ value: PenStyle; label: string; className: string; preview: string }> = [
  { value: "classic", label: "Classic Pen", className: "pen-classic", preview: "Steady handwriting" },
  { value: "marker", label: "Marker", className: "pen-marker", preview: "Bold strokes" },
  { value: "fountain", label: "Fountain Pen", className: "pen-fountain", preview: "Elegant flow" }
];
type TributeStyleOverrides = Record<string, { sticky_note_color: StickyNoteColor; pen_style: PenStyle }>;

function normalizeStickyNoteColor(value: string | null | undefined): StickyNoteColor {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.includes("lavender") || raw.includes("lavendar")) {
    return "lavender";
  }
  if (raw.includes("sky")) {
    return "sky";
  }
  if (raw.includes("mint")) {
    return "mint";
  }
  if (raw.includes("sunshine")) {
    return "mint";
  }
  if (raw.includes("blossom")) {
    return "lavender";
  }
  return "mint";
}

function toStickyNoteStyle(value: string | null | undefined): CSSProperties {
  const normalized = normalizeStickyNoteColor(value);
  if (normalized === "sky") {
    return {
      "--note-top": "#d3eff7",
      "--note-bottom": "#acd7e5"
    } as CSSProperties;
  }
  if (normalized === "lavender") {
    return {
      "--note-top": "#ece4fa",
      "--note-bottom": "#d9cbed"
    } as CSSProperties;
  }
  return {
    "--note-top": "#dff1d4",
    "--note-bottom": "#c7e2b5"
  } as CSSProperties;
}

function normalizePenStyle(value: string | null | undefined): PenStyle {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.includes("marker")) {
    return "marker";
  }
  if (raw.includes("fountain")) {
    return "fountain";
  }
  return "classic";
}

function readTributeStyleOverrides(): TributeStyleOverrides {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(TRIBUTE_STYLE_OVERRIDES_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, { sticky_note_color?: string; pen_style?: string }>;
    const normalized: TributeStyleOverrides = {};
    for (const [id, style] of Object.entries(parsed)) {
      normalized[id] = {
        sticky_note_color: normalizeStickyNoteColor(style?.sticky_note_color),
        pen_style: normalizePenStyle(style?.pen_style)
      };
    }
    return normalized;
  } catch {
    return {};
  }
}

function writeTributeStyleOverride(tributeId: string, stickyColor: StickyNoteColor, penStyle: PenStyle): void {
  if (!tributeId || typeof window === "undefined") {
    return;
  }
  const current = readTributeStyleOverrides();
  current[tributeId] = {
    sticky_note_color: stickyColor,
    pen_style: penStyle
  };
  window.localStorage.setItem(TRIBUTE_STYLE_OVERRIDES_KEY, JSON.stringify(current));
}

function withStyleOverrides(
  tribute: Tribute,
  overrides: TributeStyleOverrides = readTributeStyleOverrides()
): Tribute {
  const normalizedColor = normalizeStickyNoteColor(tribute.sticky_note_color);
  const normalizedPen = normalizePenStyle(tribute.pen_style);
  const tributeOverrides = overrides[tribute.id];
  return {
    ...tribute,
    sticky_note_color: tributeOverrides?.sticky_note_color ?? normalizedColor,
    pen_style: tributeOverrides?.pen_style ?? normalizedPen
  };
}

function normalizePath(pathname: string): string {
  if (!pathname) {
    return "/";
  }
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function getTributeImageUrl(tribute: Tribute): string | null {
  if (tribute.image_data_url) {
    return tribute.image_data_url;
  }
  return tribute.has_image ? apiUrl(`/api/tributes/${tribute.id}/image`) : null;
}

function toDisplayType(type: TributeType): string {
  return type === "birthday" ? "Birthday Message" : "Letter";
}

function getMessagePlaceholder(type: TributeType): string {
  return type === "birthday"
    ? "Happy Birthday Ken..."
    : "Dear Ken, ...";
}

function toExcerpt(content: string, max = 180): string {
  if (content.length <= max) {
    return content;
  }
  return `${content.slice(0, max).trim()}...`;
}

function toPostedDateLabel(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function isSupportedImageType(type: string): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(type);
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
        message?: string;
      };
      const detail = payload.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
      if (Array.isArray(detail)) {
        const messages = detail
          .map((entry) => (typeof entry?.msg === "string" ? entry.msg.trim() : ""))
          .filter(Boolean);
        if (messages.length > 0) {
          return messages.join(", ");
        }
      }
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        const detailObj = detail as { msg?: string };
        if (typeof detailObj.msg === "string" && detailObj.msg.trim()) {
          return detailObj.msg;
        }
      }
      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }
    } catch {
      return fallback;
    }
    return fallback;
  }

  const text = await response.text();
  return text.trim() || fallback;
}

function getStoredAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

function setStoredAdminToken(token: string): void {
  if (!token) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return;
  }
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function App() {
  const [path, setPath] = useState<string>(normalizePath(window.location.pathname));
  const [adminToken, setAdminToken] = useState<string>(() => getStoredAdminToken());

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string): void {
    const normalized = normalizePath(nextPath);
    if (normalized === path) {
      return;
    }
    window.history.pushState({}, "", normalized);
    setPath(normalized);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAdminLogin(token: string): void {
    setStoredAdminToken(token);
    setAdminToken(token);
    navigate("/admin/tributes");
  }

  function handleAdminLogout(): void {
    setStoredAdminToken("");
    setAdminToken("");
    navigate("/admin/login");
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <nav className="top-nav" aria-label="Primary">
          <NavLink currentPath={path} href="/" iconSrc="/nav-icons/home.png" label="Home" onNavigate={navigate} />
          <NavLink
            currentPath={path}
            href="/submit"
            iconSrc="/nav-icons/send-message.png"
            label="Send Message"
            onNavigate={navigate}
          />
          <NavLink
            currentPath={path}
            href="/guidelines"
            iconSrc="/nav-icons/guidelines.png"
            label="Guidelines"
            onNavigate={navigate}
          />
          <NavLink
            currentPath={path}
            href="/admin/login"
            iconSrc="/nav-icons/admin.png"
            label="Admin"
            onNavigate={navigate}
          />
        </nav>
      </header>

      <main>
        {path === "/" && <HomePage onNavigate={navigate} />}
        {path === "/submit" && <SubmitPage />}
        {path === "/guidelines" && <GuidelinesPage />}
        {path === "/admin/login" && (
          <AdminLoginPage onLogin={handleAdminLogin} onNavigate={navigate} />
        )}
        {(path === "/admin" || path === "/admin/tributes" || path === "/admin/tributes/pending") && (
          <AdminDashboardPage
            token={adminToken}
            onNavigate={navigate}
            onLogout={handleAdminLogout}
          />
        )}
        {![
          "/",
          "/submit",
          "/guidelines",
          "/admin/login",
          "/admin",
          "/admin/tributes",
          "/admin/tributes/pending"
        ].includes(path) && <NotFound onNavigate={navigate} />}
      </main>

      <footer className="site-footer">
        <p>Built by Ryo (Codex)</p>
      </footer>
    </div>
  );
}

function NavLink({
  currentPath,
  href,
  iconSrc,
  label,
  onNavigate
}: {
  currentPath: string;
  href: string;
  iconSrc: string;
  label: string;
  onNavigate: (path: string) => void;
}) {
  const active = currentPath === href;
  return (
    <a
      href={href}
      className={active ? "nav-link active" : "nav-link"}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      <img src={iconSrc} alt="" className="nav-link-icon" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </a>
  );
}

function HomePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <>
      <section className="hero-panel reveal">
        <div className="hero-main-row">
          <div className="hero-copy">
            <div className="hero-title-row">
              <h1>Ken's digital album</h1>
              <button
                className="hero-leave-icon-btn"
                onClick={() => onNavigate("/submit")}
                type="button"
                aria-label="Leave a Tribute"
              >
                <img src="/send-tribute-icon.png" alt="" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div id="home-tribute-wall" className="home-tribute-wall">
        <TributesPage />
      </div>
    </>
  );
}

function GuidelinesPage() {
  return (
    <section className="content-panel reveal">
      <h2>Submission & Privacy Guidelines</h2>
      <ul className="guide-list">
        <li>Submissions may be reviewed before appearing publicly.</li>
        <li>Anonymous submissions are displayed publicly as <strong>Anonymous</strong>.</li>
        <li>Avoid sharing private contact details or sensitive personal information.</li>
        <li>Minor formatting edits may be made during moderation for readability.</li>
      </ul>
    </section>
  );
}

function TributesPage() {
  const [filters, setFilters] = useState<TributeFilters>(INITIAL_FILTERS);
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    void loadTributes();
  }, [filters]);

  async function loadTributes(): Promise<void> {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (filters.type !== "all") {
        params.set("type", filters.type);
      }
      if (filters.anonymous !== "all") {
        params.set("anonymous", filters.anonymous);
      }
      params.set("include_images", "false");

      const query = params.toString();
      const path = query ? `/api/tributes?${query}` : "/api/tributes";
      const response = await fetch(apiUrl(path));
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load tribute wall"));
      }

      const loaded = (await response.json()) as Tribute[];
      const styleOverrides = readTributeStyleOverrides();
      setTributes(loaded.map((tribute) => withStyleOverrides(tribute, styleOverrides)));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="content-panel reveal">
      <div className="section-head">
        <h2 className="tribute-wall-title">Tribute Wall</h2>
      </div>

      <div className="filters">
        <label>
          Type
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, type: event.target.value as TributeFilters["type"] }))
            }
          >
            <option value="all">All Types</option>
            <option value="birthday">Birthday Messages</option>
            <option value="yearly_letter">Letters</option>
          </select>
        </label>

        <label>
          Author Visibility
          <select
            value={filters.anonymous}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                anonymous: event.target.value as TributeFilters["anonymous"]
              }))
            }
          >
            <option value="all">All</option>
            <option value="false">Named</option>
            <option value="true">Anonymous</option>
          </select>
        </label>
      </div>

      {loading && (
        <div className="tribute-loading" role="status" aria-live="polite">
          <span>Loading tributes</span>
          <span className="loading-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      )}
      {error && <p className="status error">{error}</p>}
      {!loading && tributes.length === 0 && (
        <p className="empty">No approved tributes match this filter yet.</p>
      )}

      <div className="tribute-grid">
        {loading ? (
          LOADING_TRIBUTE_PLACEHOLDERS.map((noteTone, index) => (
            <article
              aria-hidden="true"
              className={`tribute-card loading-tribute-card note-${noteTone} pen-classic`}
              key={`loading-tribute-${noteTone}-${index}`}
              style={toStickyNoteStyle(noteTone)}
            >
              <div className="loading-note-lines">
                <span className="loading-note-line loading-note-line--title" />
                <span className="loading-note-line" />
                <span className="loading-note-line loading-note-line--short" />
                <span className="loading-note-line loading-note-line--meta" />
              </div>
            </article>
          ))
        ) : (
          tributes.map((tribute) => {
            const noteTone = normalizeStickyNoteColor(tribute.sticky_note_color);
            const imageUrl = getTributeImageUrl(tribute);
            return (
              <article
                className={`tribute-card note-${noteTone} pen-${tribute.pen_style} ${
                  tribute.type === "yearly_letter" && imageUrl ? "note-double-row" : ""
                }`}
                key={tribute.id}
                style={toStickyNoteStyle(tribute.sticky_note_color)}
              >
                {tribute.is_featured ? (
                  <div className="chip-row">
                    <span className="chip feature">Featured</span>
                  </div>
                ) : null}
                {imageUrl ? (
                  <button
                    type="button"
                    className="photo-frame card-photo-frame"
                    onClick={() => setLightboxImage(imageUrl)}
                    aria-label="Open tribute image"
                  >
                    <img
                      src={imageUrl}
                      alt="Tribute memory"
                      className="framed-photo"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ) : null}
                {tribute.title ? <h3>{tribute.title}</h3> : null}
                <p>{toExcerpt(tribute.content)}</p>
                <p className="card-meta">- {tribute.public_author_label}</p>
                <p className="posted-date">{toPostedDateLabel(tribute.submitted_at)}</p>
              </article>
            );
          })
        )}
      </div>

      {lightboxImage && (
        <div className="lightbox-backdrop" role="presentation" onClick={() => setLightboxImage(null)}>
          <button
            type="button"
            className="lightbox-card"
            aria-label="Close image viewer"
            onClick={() => setLightboxImage(null)}
          >
            <img src={lightboxImage} alt="Tribute memory full view" className="lightbox-image" />
          </button>
        </div>
      )}
    </section>
  );
}

function SubmitPage() {
  const [form, setForm] = useState<SubmissionFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [photoDragActive, setPhotoDragActive] = useState<boolean>(false);

  async function handleImageSelection(file: File | null): Promise<void> {
    if (!file) {
      setForm((prev) => ({ ...prev, image_data_url: null, image_name: "" }));
      return;
    }

    if (!isSupportedImageType(file.type)) {
      setError("Please upload a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be 3MB or smaller.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, image_data_url: dataUrl, image_name: file.name }));
      setError("");
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "Unable to process image");
    }
  }

  function handlePhotoDragEnter(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    if (Array.from(event.dataTransfer.types).includes("Files")) {
      setPhotoDragActive(true);
    }
  }

  function handlePhotoDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (Array.from(event.dataTransfer.types).includes("Files")) {
      setPhotoDragActive(true);
    }
  }

  function handlePhotoDragLeave(event: DragEvent<HTMLDivElement>): void {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setPhotoDragActive(false);
    }
  }

  function handlePhotoDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setPhotoDragActive(false);
    void handleImageSelection(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.display_mode === "named" && !form.submitted_name.trim()) {
      setError("Please enter your name or choose anonymous.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(apiUrl("/api/tributes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim() || null,
          content: form.content,
          display_mode: form.display_mode,
          submitted_name: form.display_mode === "anonymous" ? null : form.submitted_name.trim(),
          image_data_url: form.image_data_url,
          sticky_note_color: form.sticky_note_color,
          pen_style: form.pen_style
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Submission failed"));
      }

      const created = (await response.json()) as Tribute;
      if (created.id) {
        writeTributeStyleOverride(created.id, form.sticky_note_color, form.pen_style);
      }

      setForm(INITIAL_FORM);
      setSuccess("Thank you. Your tribute has been submitted and is awaiting moderation.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="content-panel reveal">
      <div className="section-head">
        <h2>Leave a Tribute</h2>
        <p>Share a birthday message or letter for Ken.</p>
      </div>

      <form className="tribute-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            Tribute Type
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as TributeType }))}
            >
              <option value="birthday">Birthday Message</option>
              <option value="yearly_letter">Letter</option>
            </select>
          </label>

          <label>
            Title (Optional)
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              maxLength={140}
              placeholder="Optional title"
            />
          </label>

          <label>
            Display Preference
            <select
              value={form.display_mode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, display_mode: event.target.value as DisplayMode }))
              }
            >
              <option value="named">Show my name publicly</option>
              <option value="anonymous">Post publicly as Anonymous</option>
            </select>
          </label>

          {form.display_mode === "named" && (
            <label>
              Display Name
              <input
                value={form.submitted_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, submitted_name: event.target.value }))
                }
                maxLength={100}
                required
                placeholder="Your name"
              />
            </label>
          )}
        </div>

        <div className="style-picker-row">
          <div className="style-picker-section">
            <div className="style-picker-head">
              <h3>Pick Your Sticky Note Color</h3>
              <p>Choose the note color your tribute will appear on.</p>
            </div>
            <div className="note-color-grid" role="radiogroup" aria-label="Sticky note color">
              {NOTE_COLORS.map((noteColor) => (
                <button
                  key={noteColor.value}
                  type="button"
                  className={`note-color-option ${noteColor.className} ${
                    form.sticky_note_color === noteColor.value ? "selected" : ""
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, sticky_note_color: noteColor.value }))}
                  aria-pressed={form.sticky_note_color === noteColor.value}
                >
                  <span>{noteColor.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="style-picker-section">
            <div className="style-picker-head">
              <h3>Choose Your Pen</h3>
              <p>Select the writing style that will be used on your tribute card.</p>
            </div>
            <div className="pen-grid" role="radiogroup" aria-label="Pen style">
              {PEN_STYLES.map((pen) => (
                <button
                  key={pen.value}
                  type="button"
                  className={`pen-option ${pen.className} ${form.pen_style === pen.value ? "selected" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, pen_style: pen.value }))}
                  aria-pressed={form.pen_style === pen.value}
                >
                  <strong>{pen.label}</strong>
                  <span>{pen.preview}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <label>
          Message
          <textarea
            className={`tribute-message-input note-${form.sticky_note_color} pen-${form.pen_style}`}
            style={toStickyNoteStyle(form.sticky_note_color)}
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            minLength={10}
            maxLength={5000}
            required
            placeholder={getMessagePlaceholder(form.type)}
          />
        </label>

        <div className="photo-upload-field">
          <div className="photo-upload-heading">
            <span className="photo-upload-label">Optional Photo</span>
            <span className="photo-upload-limit">Max 1 image · 3MB</span>
          </div>
          <div
            className={`photo-upload-box ${photoDragActive ? "is-dragging" : ""} ${
              form.image_data_url ? "has-photo" : ""
            }`}
            onDragEnter={handlePhotoDragEnter}
            onDragOver={handlePhotoDragOver}
            onDragLeave={handlePhotoDragLeave}
            onDrop={handlePhotoDrop}
          >
            <label className="photo-drop-zone">
              <input
                className="photo-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  void handleImageSelection(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              <span className="upload-icon-shell" aria-hidden="true">
                <img src={uploadIconSrc} alt="" className="upload-icon" />
              </span>
              <span className="photo-upload-copy">
                <span className="photo-upload-title">
                  {form.image_data_url ? "Replace photo" : "Add a photo"}
                </span>
                <span className="photo-upload-help">
                  {form.image_data_url ? form.image_name || "Selected image" : "Drag and drop or tap to choose"}
                </span>
                <span className="photo-upload-meta">JPEG, PNG, WEBP</span>
              </span>
              <span className="photo-upload-action">Choose</span>
            </label>

            {form.image_data_url ? (
              <div className="photo-upload-preview submit-upload-preview">
                <button
                  type="button"
                  className="photo-frame submit-photo-frame"
                  onClick={() => {
                    if (form.image_data_url) {
                      window.open(form.image_data_url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  aria-label="Open selected image preview"
                >
                  <img src={form.image_data_url} alt="Selected tribute preview" className="framed-photo" />
                </button>
                <div className="upload-meta">
                  <p>{form.image_name || "Selected image"}</p>
                  <ParticleButton
                    type="button"
                    variant="soft"
                    size="sm"
                    icon={<ImageMinus className="particle-button__svg" />}
                    onClick={() => setForm((prev) => ({ ...prev, image_data_url: null, image_name: "" }))}
                  >
                    Remove Image
                  </ParticleButton>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="privacy-note">
          <h3>Privacy Notice</h3>
          <p>
            You may show your name or post anonymously. Anonymous tributes appear publicly as
            Anonymous. All submissions may be reviewed before publication.
          </p>
        </div>

        <ParticleButton
          type="submit"
          disabled={submitting}
          variant="soft"
          size="lg"
          aria-label={submitting ? "Submitting tribute" : "Submit tribute"}
          className={`action-button action-button--submit${submitting ? " action-button--submit-busy" : ""}`}
          icon={<img src="/action-icons/submit.png" alt="Submit tribute" className="action-button__icon action-button__icon--submit" />}
        />

        {error && <p className="status error">{error}</p>}
        {success && <p className="status success">{success}</p>}
      </form>
    </section>
  );
}

function AdminLoginPage({
  onLogin,
  onNavigate
}: {
  onLogin: (token: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Login failed"));
      }

      const payload = (await response.json()) as { access_token: string };
      onLogin(payload.access_token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="content-panel reveal">
      <div className="section-head">
        <h2>Admin Login</h2>
        <p>Restricted access</p>
      </div>

      <form className="tribute-form" onSubmit={handleLogin}>
        <label>
          Admin Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <div className="cta-row">
          <ParticleButton
            type="submit"
            disabled={submitting}
            variant="soft"
            className="action-button action-button--sign-in"
            icon={<img src="/action-icons/sign-in.svg" alt="" className="action-button__icon" />}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </ParticleButton>
          <ParticleButton
            onClick={() => onNavigate("/")}
            type="button"
            variant="soft"
            className="action-button action-button--cancel"
            icon={<img src="/action-icons/cancel.svg" alt="" className="action-button__icon" />}
          >
            Cancel
          </ParticleButton>
        </div>

        {error && <p className="status error">{error}</p>}
      </form>
    </section>
  );
}

function AdminDashboardPage({
  token,
  onNavigate,
  onLogout
}: {
  token: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [selectedTribute, setSelectedTribute] = useState<Tribute | null>(null);
  const [patchForm, setPatchForm] = useState<AdminPatchForm | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      onNavigate("/admin/login");
      return;
    }
    void loadAdminTributes();
  }, [token, statusFilter]);

  async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {})
      }
    });

    if (response.status === 401 || response.status === 403) {
      onLogout();
      throw new Error("Session expired. Please sign in again.");
    }

    return response;
  }

  async function loadAdminTributes(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const response = await adminFetch(`/api/admin/tributes${query}`);
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load admin tributes"));
      }

      const data = (await response.json()) as Tribute[];
      setTributes(data);
      if (data.length > 0) {
        setSelectedTribute(data[0]);
        setPatchForm(makePatchForm(data[0]));
      } else {
        setSelectedTribute(null);
        setPatchForm(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function runQuickAction(tributeId: string, action: string): Promise<void> {
    try {
      setError("");
      const response = await adminFetch(`/api/admin/tributes/${tributeId}/${action}`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, `Failed to ${action} tribute`));
      }
      await loadAdminTributes();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unexpected error");
    }
  }

  async function savePatch(): Promise<void> {
    if (!selectedTribute || !patchForm) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await adminFetch(`/api/admin/tributes/${selectedTribute.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: patchForm.title || null,
          content: patchForm.content || null,
          relationship_to_ken: patchForm.relationship_to_ken || null,
          year_tag: patchForm.year_tag ? Number(patchForm.year_tag) : null,
          occasion_date: patchForm.occasion_date || null,
          moderation_notes: patchForm.moderation_notes || null,
          visibility: patchForm.visibility,
          moderation_status: patchForm.moderation_status,
          featured: patchForm.featured,
          image_data_url: patchForm.image_data_url
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to save moderation changes"));
      }

      const updated = (await response.json()) as Tribute;
      setSelectedTribute(updated);
      setPatchForm(makePatchForm(updated));
      await loadAdminTributes();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <section className="content-panel reveal admin-panel">
      <div className="section-head admin-head">
        <div>
          <h2>Moderation Dashboard</h2>
          <p>Review pending tributes, moderate content, and control public visibility.</p>
        </div>
        <ParticleButton
          onClick={onLogout}
          type="button"
          variant="soft"
          icon={<LogOut className="particle-button__svg" />}
        >
          Logout
        </ParticleButton>
      </div>

      <div className="filters">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="hidden">Hidden</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {loading && <p>Loading moderation queue...</p>}
      {error && <p className="status error">{error}</p>}

      {!loading && (
        <div className="admin-grid">
          <div className="admin-list">
            {tributes.map((tribute) => (
              <button
                key={tribute.id}
                type="button"
                className={selectedTribute?.id === tribute.id ? "admin-item selected" : "admin-item"}
                onClick={() => {
                  setSelectedTribute(tribute);
                  setPatchForm(makePatchForm(tribute));
                }}
              >
                <strong>{tribute.title || "Untitled Tribute"}</strong>
                <span>{toDisplayType(tribute.type)}</span>
                <span>{tribute.public_author_label}</span>
                <span>Status: {tribute.status}</span>
              </button>
            ))}
            {tributes.length === 0 && <p className="empty">No tributes found for this status.</p>}
          </div>

          {selectedTribute && patchForm && (
            <div className="admin-detail">
              <h3>Moderate Tribute</h3>
              <p className="card-meta">ID: {selectedTribute.id}</p>

              <div className="field-grid">
                <label>
                  Title
                  <input
                    value={patchForm.title}
                    onChange={(event) =>
                      setPatchForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                    }
                  />
                </label>

                <label>
                  Relationship To Ken
                  <input
                    value={patchForm.relationship_to_ken}
                    onChange={(event) =>
                      setPatchForm((prev) =>
                        prev ? { ...prev, relationship_to_ken: event.target.value } : prev
                      )
                    }
                  />
                </label>

                <label>
                  Year Tag
                  <input
                    type="number"
                    value={patchForm.year_tag}
                    onChange={(event) =>
                      setPatchForm((prev) => (prev ? { ...prev, year_tag: event.target.value } : prev))
                    }
                    min={2000}
                    max={2100}
                  />
                </label>

                <label>
                  Occasion Date
                  <input
                    type="date"
                    value={patchForm.occasion_date}
                    onChange={(event) =>
                      setPatchForm((prev) =>
                        prev ? { ...prev, occasion_date: event.target.value } : prev
                      )
                    }
                  />
                </label>

                <label>
                  Visibility
                  <select
                    value={patchForm.visibility}
                    onChange={(event) =>
                      setPatchForm((prev) =>
                        prev ? { ...prev, visibility: event.target.value as Visibility } : prev
                      )
                    }
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>

                <label>
                  Moderation Status
                  <select
                    value={patchForm.moderation_status}
                    onChange={(event) =>
                      setPatchForm((prev) =>
                        prev
                          ? { ...prev, moderation_status: event.target.value as TributeStatus }
                          : prev
                      )
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>

                <label className="checkbox-row admin-checkbox">
                  <input
                    type="checkbox"
                    checked={patchForm.featured}
                    onChange={(event) =>
                      setPatchForm((prev) => (prev ? { ...prev, featured: event.target.checked } : prev))
                    }
                  />
                  Featured
                </label>
              </div>

              <label>
                Content
                <textarea
                  value={patchForm.content}
                  onChange={(event) =>
                    setPatchForm((prev) => (prev ? { ...prev, content: event.target.value } : prev))
                  }
                />
              </label>

              {patchForm.image_data_url ? (
                <div className="photo-upload-preview">
                  <button
                    type="button"
                    className="photo-frame submit-photo-frame"
                    onClick={() => window.open(patchForm.image_data_url ?? "", "_blank", "noopener,noreferrer")}
                    aria-label="Open tribute image"
                  >
                    <img src={patchForm.image_data_url} alt="Tribute attachment" className="framed-photo" />
                  </button>
                  <div className="upload-meta">
                    <p>Attached tribute image</p>
                    <ParticleButton
                      type="button"
                      variant="soft"
                      size="sm"
                      icon={<ImageMinus className="particle-button__svg" />}
                      onClick={() =>
                        setPatchForm((prev) => (prev ? { ...prev, image_data_url: null } : prev))
                      }
                    >
                      Remove Image
                    </ParticleButton>
                  </div>
                </div>
              ) : null}

              <label>
                Moderation Notes
                <textarea
                  value={patchForm.moderation_notes}
                  onChange={(event) =>
                    setPatchForm((prev) =>
                      prev ? { ...prev, moderation_notes: event.target.value } : prev
                    )
                  }
                />
              </label>

              <div className="cta-row">
                <ParticleButton
                  onClick={() => void savePatch()}
                  disabled={saving}
                  variant="default"
                  icon={<Send className="particle-button__svg" />}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </ParticleButton>
                <ParticleButton
                  type="button"
                  variant="soft"
                  icon={<Check className="particle-button__svg" />}
                  onClick={() => void runQuickAction(selectedTribute.id, "approve")}
                >
                  Approve
                </ParticleButton>
                <ParticleButton
                  type="button"
                  variant="soft"
                  icon={<Ban className="particle-button__svg" />}
                  onClick={() => void runQuickAction(selectedTribute.id, "reject")}
                >
                  Reject
                </ParticleButton>
                <ParticleButton
                  type="button"
                  variant="soft"
                  icon={<EyeOff className="particle-button__svg" />}
                  onClick={() => void runQuickAction(selectedTribute.id, "hide")}
                >
                  Hide
                </ParticleButton>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function makePatchForm(tribute: Tribute): AdminPatchForm {
  return {
    title: tribute.title ?? "",
    content: tribute.content,
    relationship_to_ken: tribute.relationship_to_ken ?? "",
    year_tag: tribute.year_tag ? String(tribute.year_tag) : "",
    occasion_date: tribute.occasion_date ?? "",
    moderation_notes: tribute.moderation_notes ?? "",
    visibility: tribute.visibility,
    moderation_status: tribute.status,
    featured: tribute.is_featured,
    image_data_url: tribute.image_data_url
  };
}

function NotFound({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="content-panel reveal">
      <h2>Page Not Found</h2>
      <p>The page you requested does not exist.</p>
      <ParticleButton
        onClick={() => onNavigate("/")}
        type="button"
        variant="default"
        icon={<House className="particle-button__svg" />}
      >
        Return Home
      </ParticleButton>
    </section>
  );
}
