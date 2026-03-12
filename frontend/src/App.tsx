import { FormEvent, useEffect, useMemo, useState } from "react";

type TributeType = "birthday" | "yearly_letter";
type DisplayMode = "named" | "anonymous";

type Tribute = {
  id: string;
  type: TributeType;
  content: string;
  display_mode: DisplayMode;
  submitted_name: string | null;
  public_display_name: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  submitted_at: string;
  is_featured: boolean;
};

type SubmissionFormState = {
  type: TributeType;
  content: string;
  display_mode: DisplayMode;
  submitted_name: string;
};

const INITIAL_FORM: SubmissionFormState = {
  type: "birthday",
  content: "",
  display_mode: "named",
  submitted_name: ""
};

export function App() {
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [form, setForm] = useState<SubmissionFormState>(INITIAL_FORM);
  const [loadingTributes, setLoadingTributes] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    void fetchTributes();
  }, []);

  const sortedTributes = useMemo(
    () =>
      [...tributes].sort((a, b) => {
        if (a.is_featured !== b.is_featured) {
          return a.is_featured ? -1 : 1;
        }
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      }),
    [tributes]
  );

  async function fetchTributes(): Promise<void> {
    try {
      setLoadingTributes(true);
      const response = await fetch("/api/v1/tributes");
      if (!response.ok) {
        throw new Error("Failed to load tributes");
      }
      const data = (await response.json()) as Tribute[];
      setTributes(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unexpected error");
    } finally {
      setLoadingTributes(false);
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

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          content: form.content,
          display_mode: form.display_mode,
          submitted_name: form.display_mode === "anonymous" ? null : form.submitted_name.trim()
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { detail?: string };
        throw new Error(payload.detail ?? "Submission failed");
      }

      setForm(INITIAL_FORM);
      setSuccess("Your tribute was submitted and is now pending moderation.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>Ken Memorial</h1>
        <p>A living archive of remembrance, where friends and family share tributes with care.</p>
      </section>

      <section className="submission" aria-label="Submit a tribute">
        <h2>Leave a Tribute</h2>
        <form className="form" onSubmit={handleSubmit}>
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
            Message
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              minLength={10}
              maxLength={5000}
              required
              placeholder="Write your memory or message for Ken..."
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
              <option value="named">Show my name</option>
              <option value="anonymous">Post anonymously</option>
            </select>
          </label>

          {form.display_mode === "named" && (
            <label>
              Your Name
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

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Tribute"}
          </button>
        </form>
        {error && <p className="status error">{error}</p>}
        {success && <p className="status success">{success}</p>}
      </section>

      <section className="wall" aria-label="Tribute wall">
        <h2>Tribute Wall</h2>
        {loadingTributes ? <p>Loading tributes...</p> : null}
        {!loadingTributes && sortedTributes.length === 0 ? (
          <p className="empty">No approved tributes have been published yet.</p>
        ) : null}

        <div className="grid">
          {sortedTributes.map((tribute) => (
            <article className="card" key={tribute.id}>
              <p className="meta">
                {tribute.type === "birthday" ? "Birthday Message" : "Yearly Tribute Letter"}
              </p>
              <p>{tribute.content}</p>
              <p className="author">- {tribute.public_display_name}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
