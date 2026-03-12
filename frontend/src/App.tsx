import { FormEvent, useEffect, useMemo, useState } from "react";

type TributeType = "birthday" | "yearly_letter";
type DisplayMode = "named" | "anonymous";

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
  public_display_name: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  submitted_at: string;
  is_featured: boolean;
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
};

type TributeFilters = {
  type: "all" | TributeType;
  year_tag: string;
  author_visibility: "all" | DisplayMode;
  featured_only: boolean;
};

const INITIAL_FORM: SubmissionFormState = {
  type: "birthday",
  title: "",
  content: "",
  display_mode: "named",
  submitted_name: "",
  relationship_to_ken: "",
  year_tag: "",
  occasion_date: ""
};

const INITIAL_FILTERS: TributeFilters = {
  type: "all",
  year_tag: "",
  author_visibility: "all",
  featured_only: false
};

function normalizePath(pathname: string): string {
  if (pathname === "") {
    return "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
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

export function App() {
  const [path, setPath] = useState<string>(normalizePath(window.location.pathname));

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
          <NavLink
            currentPath={path}
            href="/guidelines"
            label="Guidelines"
            onNavigate={navigate}
          />
        </nav>
      </header>

      <main>
        {path === "/" && <HomePage onNavigate={navigate} />}
        {path === "/about" && <AboutPage />}
        {path === "/tributes" && <TributesPage />}
        {path === "/submit" && <SubmitPage />}
        {path === "/guidelines" && <GuidelinesPage />}
        {path.startsWith("/admin") && <AdminPlaceholder />}
        {![
          "/",
          "/about",
          "/tributes",
          "/submit",
          "/guidelines"
        ].includes(path) && !path.startsWith("/admin") && <NotFound onNavigate={navigate} />}
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
        Ken's life continues to be remembered through his laughter, kindness, and the way he made
        people feel seen. This page is a shared space for that memory to stay present and alive.
      </p>
      <div className="about-grid">
        <article>
          <h3>What This Space Is For</h3>
          <p>
            To collect thoughtful messages that can be revisited over years, in one place designed
            for dignity, warmth, and respect.
          </p>
        </article>
        <article>
          <h3>How The Wall Works</h3>
          <p>
            Every tribute is reviewed before publication. Approved tributes appear on the wall and
            can be filtered by type, year, and author visibility.
          </p>
        </article>
        <article>
          <h3>Long-Term Vision</h3>
          <p>
            This memorial will grow into a richer living archive over time, while keeping tone and
            quality curated.
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
        <li>Write with care and respect for Ken, family, and community members.</li>
        <li>All submissions are reviewed before appearing publicly.</li>
        <li>
          If you choose anonymous, your post appears as <strong>Anonymous</strong> on the wall.
        </li>
        <li>Do not include sensitive personal details that should not be public.</li>
        <li>Minor formatting may be adjusted during moderation for clarity.</li>
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
        const response = await fetch(`/api/v1/tributes/${selectedId}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Unable to load full tribute");
        }
        const data = (await response.json()) as Tribute;
        setSelectedTribute(data);
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
      if (filters.year_tag) {
        params.set("year_tag", filters.year_tag);
      }
      if (filters.author_visibility !== "all") {
        params.set("author_visibility", filters.author_visibility);
      }
      if (filters.featured_only) {
        params.set("featured_only", "true");
      }

      const query = params.toString();
      const url = query ? `/api/v1/tributes?${query}` : "/api/v1/tributes";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load tribute wall");
      }

      const data = (await response.json()) as Tribute[];
      setTributes(data);
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
        <p>Browse approved memories and letters shared for Ken.</p>
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
            value={filters.year_tag}
            onChange={(event) => setFilters((prev) => ({ ...prev, year_tag: event.target.value }))}
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
          Visibility
          <select
            value={filters.author_visibility}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                author_visibility: event.target.value as TributeFilters["author_visibility"]
              }))
            }
          >
            <option value="all">All</option>
            <option value="named">Named</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={filters.featured_only}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, featured_only: event.target.checked }))
            }
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
            {tribute.title ? <h3>{tribute.title}</h3> : null}
            <p>{toExcerpt(tribute.content)}</p>
            <p className="card-meta">
              - {tribute.public_display_name}
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
                <p className="chip">{toDisplayType(selectedTribute.type)}</p>
                {selectedTribute.title ? <h3>{selectedTribute.title}</h3> : null}
                <p>{selectedTribute.content}</p>
                <p className="card-meta">
                  - {selectedTribute.public_display_name}
                  {selectedTribute.relationship_to_ken
                    ? ` • ${selectedTribute.relationship_to_ken}`
                    : ""}
                </p>
                <button className="btn btn-primary" onClick={() => setSelectedId(null)} type="button">
                  Close
                </button>
              </>
            )}
          </div>
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
      const response = await fetch("/api/v1/submissions", {
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
          occasion_date: form.occasion_date || null
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { detail?: string };
        throw new Error(payload.detail ?? "Submission failed");
      }

      setForm(INITIAL_FORM);
      setSuccess("Thank you. Your tribute has been submitted and is now awaiting moderation.");
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

        <div className="privacy-note">
          <h3>Privacy Notice</h3>
          <p>
            Public posts show your selected display mode and tribute content. Anonymous submissions
            are always displayed as Anonymous. Submissions are reviewed before publication.
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

function AdminPlaceholder() {
  return (
    <section className="content-panel reveal">
      <h2>Admin Area</h2>
      <p>
        Admin routes are reserved for authenticated moderation workflows. This UI scaffold will be
        expanded with login and dashboard in the next implementation step.
      </p>
    </section>
  );
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
