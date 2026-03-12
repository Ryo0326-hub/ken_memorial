import { FormEvent, useEffect, useMemo, useState } from "react";

type TributeType = "birthday" | "yearly_letter";
type DisplayMode = "named" | "anonymous";
type TributeStatus = "pending" | "approved" | "rejected" | "hidden";
type Visibility = "public" | "private";

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
  public_display_name: string;
  status: TributeStatus;
  visibility: Visibility;
  moderation_notes: string | null;
  submitted_at: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  is_anonymous: boolean;
  public_author_label: string;
};

type SubmissionFormState = {
  type: TributeType;
  title: string;
  content: string;
  display_mode: DisplayMode;
  submitted_name: string;
  relationship_to_ken: string;
  year_tag: string;
  occasion_date: string;
  image_data_url: string | null;
  image_name: string;
};

type TributeFilters = {
  type: "all" | TributeType;
  year: string;
  anonymous: "all" | "true" | "false";
  featured: boolean;
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
  relationship_to_ken: "",
  year_tag: "",
  occasion_date: "",
  image_data_url: null,
  image_name: ""
};

const INITIAL_FILTERS: TributeFilters = {
  type: "all",
  year: "",
  anonymous: "all",
  featured: false
};

const ADMIN_TOKEN_KEY = "ken_admin_token";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function normalizePath(pathname: string): string {
  if (!pathname) {
    return "/";
  }
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function toDisplayType(type: TributeType): string {
  return type === "birthday" ? "Birthday Message" : "Yearly Tribute Letter";
}

function toExcerpt(content: string, max = 180): string {
  if (content.length <= max) {
    return content;
  }
  return `${content.slice(0, max).trim()}...`;
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
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? fallback;
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
        <button className="wordmark" onClick={() => navigate("/")} type="button">
          Ken Memorial
        </button>
        <nav className="top-nav" aria-label="Primary">
          <NavLink currentPath={path} href="/" label="Home" onNavigate={navigate} />
          <NavLink currentPath={path} href="/about" label="Ken's Story" onNavigate={navigate} />
          <NavLink currentPath={path} href="/tributes" label="Tribute Wall" onNavigate={navigate} />
          <NavLink currentPath={path} href="/submit" label="Leave Tribute" onNavigate={navigate} />
          <NavLink currentPath={path} href="/guidelines" label="Guidelines" onNavigate={navigate} />
          <NavLink currentPath={path} href="/admin/login" label="Admin" onNavigate={navigate} />
        </nav>
      </header>

      <main>
        {path === "/" && <HomePage onNavigate={navigate} />}
        {path === "/about" && <AboutPage />}
        {path === "/tributes" && <TributesPage />}
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
          "/about",
          "/tributes",
          "/submit",
          "/guidelines",
          "/admin/login",
          "/admin",
          "/admin/tributes",
          "/admin/tributes/pending"
        ].includes(path) && <NotFound onNavigate={navigate} />}
      </main>

      <footer className="site-footer">
        <p>Built with love to preserve Ken's memory with dignity and care.</p>
      </footer>
    </div>
  );
}

function NavLink({
  currentPath,
  href,
  label,
  onNavigate
}: {
  currentPath: string;
  href: string;
  label: string;
  onNavigate: (path: string) => void;
}) {
  const active = currentPath === href;
  return (
    <a
      href={href}
      className={active ? "nav-link active" : "nav-link"}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {label}
    </a>
  );
}

function HomePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="hero-panel reveal">
      <p className="eyebrow">Digital Tribute Wall & Living Archive</p>
      <h1>Ken Memorial</h1>
      <p className="lede">
        A calm and lasting place for friends and family to honor Ken through birthday messages,
        yearly letters, and shared remembrance.
      </p>
      <div className="cta-row">
        <button className="btn btn-primary" onClick={() => onNavigate("/tributes")} type="button">
          Read Memories
        </button>
        <button className="btn btn-soft" onClick={() => onNavigate("/submit")} type="button">
          Leave a Tribute
        </button>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="content-panel reveal">
      <h2>Ken's Story</h2>
      <p>
        Ken's life is remembered through kindness, humor, and the way he brought people together.
        This space preserves those memories with care.
      </p>
      <div className="about-grid">
        <article>
          <h3>Purpose</h3>
          <p>This memorial is a long-term archive where meaningful tributes can be revisited.</p>
        </article>
        <article>
          <h3>Moderation</h3>
          <p>
            Every tribute is reviewed before publication to maintain dignity and protect the
            memorial tone.
          </p>
        </article>
        <article>
          <h3>Longevity</h3>
          <p>
            The architecture is built for gradual expansion into richer archive and search features.
          </p>
        </article>
      </div>
    </section>
  );
}

function GuidelinesPage() {
  return (
    <section className="content-panel reveal">
      <h2>Submission & Privacy Guidelines</h2>
      <ul className="guide-list">
        <li>Write with respect for Ken, family, and community members.</li>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTribute, setSelectedTribute] = useState<Tribute | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    void loadTributes();
  }, [filters]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTribute(null);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        setLoadingDetail(true);
        const response = await fetch(`/api/tributes/${selectedId}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Unable to load full tribute"));
        }
        setSelectedTribute((await response.json()) as Tribute);
      } catch (detailError) {
        setError(detailError instanceof Error ? detailError.message : "Unexpected error");
      } finally {
        setLoadingDetail(false);
      }
    })();

    return () => controller.abort();
  }, [selectedId]);

  async function loadTributes(): Promise<void> {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (filters.type !== "all") {
        params.set("type", filters.type);
      }
      if (filters.year) {
        params.set("year", filters.year);
      }
      if (filters.anonymous !== "all") {
        params.set("anonymous", filters.anonymous);
      }
      if (filters.featured) {
        params.set("featured", "true");
      }

      const query = params.toString();
      const url = query ? `/api/tributes?${query}` : "/api/tributes";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load tribute wall"));
      }

      setTributes((await response.json()) as Tribute[]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  const years = useMemo(() => {
    const values = new Set<number>();
    for (const tribute of tributes) {
      if (tribute.year_tag) {
        values.add(tribute.year_tag);
      }
    }
    return [...values].sort((a, b) => b - a);
  }, [tributes]);

  return (
    <section className="content-panel reveal">
      <div className="section-head">
        <h2>Tribute Wall</h2>
        <p>Browse approved messages and letters shared in Ken's memory.</p>
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
            <option value="yearly_letter">Yearly Tribute Letters</option>
          </select>
        </label>

        <label>
          Year
          <select
            value={filters.year}
            onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
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

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={filters.featured}
            onChange={(event) => setFilters((prev) => ({ ...prev, featured: event.target.checked }))}
          />
          Featured only
        </label>
      </div>

      {loading && <p>Loading tributes...</p>}
      {error && <p className="status error">{error}</p>}
      {!loading && tributes.length === 0 && (
        <p className="empty">No approved tributes match this filter yet.</p>
      )}

      <div className="tribute-grid">
        {tributes.map((tribute) => (
          <article className="tribute-card" key={tribute.id}>
            <div className="chip-row">
              <span className="chip">{toDisplayType(tribute.type)}</span>
              {tribute.is_featured ? <span className="chip feature">Featured</span> : null}
            </div>
            {tribute.image_data_url ? (
              <button
                type="button"
                className="photo-frame card-photo-frame"
                onClick={() => setLightboxImage(tribute.image_data_url)}
                aria-label="Open tribute image"
              >
                <img src={tribute.image_data_url} alt="Tribute memory" className="framed-photo" />
              </button>
            ) : null}
            {tribute.title ? <h3>{tribute.title}</h3> : null}
            <p>{toExcerpt(tribute.content)}</p>
            <p className="card-meta">
              - {tribute.public_author_label}
              {tribute.year_tag ? ` • ${tribute.year_tag}` : ""}
            </p>
            <button className="btn btn-soft" onClick={() => setSelectedId(tribute.id)} type="button">
              Read Full Tribute
            </button>
          </article>
        ))}
      </div>

      {selectedId && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedId(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Full tribute"
            onClick={(event) => event.stopPropagation()}
          >
            {loadingDetail || !selectedTribute ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="chip-row">
                  <span className="chip">{toDisplayType(selectedTribute.type)}</span>
                  {selectedTribute.is_featured ? <span className="chip feature">Featured</span> : null}
                </div>
                {selectedTribute.image_data_url ? (
                  <button
                    type="button"
                    className="photo-frame modal-photo-frame"
                    onClick={() => setLightboxImage(selectedTribute.image_data_url)}
                    aria-label="Open tribute image"
                  >
                    <img
                      src={selectedTribute.image_data_url}
                      alt="Tribute memory"
                      className="framed-photo"
                    />
                  </button>
                ) : null}
                {selectedTribute.title ? <h3>{selectedTribute.title}</h3> : null}
                <p>{selectedTribute.content}</p>
                <p className="card-meta">
                  - {selectedTribute.public_author_label}
                  {selectedTribute.relationship_to_ken ? ` • ${selectedTribute.relationship_to_ken}` : ""}
                </p>
                <button className="btn btn-primary" onClick={() => setSelectedId(null)} type="button">
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.display_mode === "named" && !form.submitted_name.trim()) {
      setError("Please enter your name or choose anonymous.");
      return;
    }

    if (form.type === "yearly_letter" && !form.title.trim()) {
      setError("A title is required for yearly tribute letters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/tributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim() || null,
          content: form.content,
          display_mode: form.display_mode,
          submitted_name: form.display_mode === "anonymous" ? null : form.submitted_name.trim(),
          relationship_to_ken: form.relationship_to_ken.trim() || null,
          year_tag: form.year_tag ? Number(form.year_tag) : null,
          occasion_date: form.occasion_date || null,
          image_data_url: form.image_data_url
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Submission failed"));
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
        <p>Share a birthday message or yearly letter for Ken.</p>
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
              <option value="yearly_letter">Yearly Tribute Letter</option>
            </select>
          </label>

          <label>
            Title {form.type === "yearly_letter" ? "(Required)" : "(Optional)"}
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              maxLength={140}
              required={form.type === "yearly_letter"}
              placeholder={form.type === "yearly_letter" ? "A short title" : "Optional title"}
            />
          </label>

          <label>
            Your Relationship To Ken (Optional)
            <input
              value={form.relationship_to_ken}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, relationship_to_ken: event.target.value }))
              }
              maxLength={80}
              placeholder="Friend, classmate, teammate, family..."
            />
          </label>

          <label>
            Year Tag (Optional)
            <input
              type="number"
              value={form.year_tag}
              onChange={(event) => setForm((prev) => ({ ...prev, year_tag: event.target.value }))}
              min={2000}
              max={2100}
              placeholder="2026"
            />
          </label>

          <label>
            Occasion Date (Optional)
            <input
              type="date"
              value={form.occasion_date}
              onChange={(event) => setForm((prev) => ({ ...prev, occasion_date: event.target.value }))}
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

        <label>
          Message
          <textarea
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            minLength={10}
            maxLength={5000}
            required
            placeholder="Write your remembrance for Ken..."
          />
        </label>

        <label>
          Optional Photo (Max 1 image, up to 3MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleImageSelection(event.target.files?.[0] ?? null)}
          />
        </label>

        {form.image_data_url ? (
          <div className="photo-upload-preview">
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
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => setForm((prev) => ({ ...prev, image_data_url: null, image_name: "" }))}
              >
                Remove Image
              </button>
            </div>
          </div>
        ) : null}

        <div className="privacy-note">
          <h3>Privacy Notice</h3>
          <p>
            You may show your name or post anonymously. Anonymous tributes appear publicly as
            Anonymous. All submissions may be reviewed before publication.
          </p>
        </div>

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Tribute"}
        </button>

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
      const response = await fetch("/api/admin/login", {
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
        <p>Sign in to moderate tributes and manage public visibility.</p>
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
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
          <button className="btn btn-soft" onClick={() => onNavigate("/")} type="button">
            Cancel
          </button>
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

  async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, {
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
        <button className="btn btn-soft" onClick={onLogout} type="button">
          Logout
        </button>
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
                    <button
                      type="button"
                      className="btn btn-soft"
                      onClick={() =>
                        setPatchForm((prev) => (prev ? { ...prev, image_data_url: null } : prev))
                      }
                    >
                      Remove Image
                    </button>
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
                <button className="btn btn-primary" onClick={() => void savePatch()} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  className="btn btn-soft"
                  type="button"
                  onClick={() => void runQuickAction(selectedTribute.id, "approve")}
                >
                  Approve
                </button>
                <button
                  className="btn btn-soft"
                  type="button"
                  onClick={() => void runQuickAction(selectedTribute.id, "reject")}
                >
                  Reject
                </button>
                <button
                  className="btn btn-soft"
                  type="button"
                  onClick={() => void runQuickAction(selectedTribute.id, "hide")}
                >
                  Hide
                </button>
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
      <button className="btn btn-primary" onClick={() => onNavigate("/")} type="button">
        Return Home
      </button>
    </section>
  );
}
