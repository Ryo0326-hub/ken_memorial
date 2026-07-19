import { useEffect, useState } from "react";

import { ParticleButton } from "@/components/ui/particle-button";

type Persona = {
  id: string;
  version: number;
  status: "draft" | "active" | "archived";
  profile: Record<string, unknown>;
  change_note: string;
  created_by: string;
  activated_at: string | null;
};

type Feedback = {
  id: string;
  rating: string;
  comment: string | null;
  source_tribute_ids: string[];
  persona_version: number;
  created_at: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail || "Request failed";
  } catch {
    return "Request failed";
  }
}

export function AdminAiPanel({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [profileJson, setProfileJson] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = personas.find((persona) => persona.id === selectedId) ?? null;

  useEffect(() => {
    void loadAll();
  }, [token]);

  useEffect(() => {
    if (!selected) return;
    setProfileJson(JSON.stringify(selected.profile, null, 2));
    setChangeNote(selected.change_note);
  }, [selectedId, personas]);

  async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }
    });
    if (response.status === 401 || response.status === 403) onUnauthorized();
    return response;
  }

  async function loadAll(): Promise<void> {
    try {
      setError("");
      const [personaResponse, feedbackResponse] = await Promise.all([
        adminFetch("/api/admin/ai/personas"),
        adminFetch("/api/admin/ai/feedback")
      ]);
      if (!personaResponse.ok) throw new Error(await errorMessage(personaResponse));
      if (!feedbackResponse.ok) throw new Error(await errorMessage(feedbackResponse));
      const loadedPersonas = (await personaResponse.json()) as Persona[];
      setPersonas(loadedPersonas);
      setFeedback((await feedbackResponse.json()) as Feedback[]);
      setSelectedId((current) => current || loadedPersonas[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load AI controls");
    }
  }

  async function saveDraft(): Promise<void> {
    if (!selected || selected.status !== "draft") return;
    try {
      setSaving(true);
      setError("");
      const profile = JSON.parse(profileJson) as Record<string, unknown>;
      const response = await adminFetch(`/api/admin/ai/personas/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ profile, change_note: changeNote })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setStatus("Draft saved. Public chat behavior has not changed.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save persona draft");
    } finally {
      setSaving(false);
    }
  }

  async function createDraft(): Promise<void> {
    if (!selected) return;
    try {
      setError("");
      const response = await adminFetch("/api/admin/ai/personas", {
        method: "POST",
        body: JSON.stringify({ profile: selected.profile, change_note: `Draft based on version ${selected.version}` })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const created = (await response.json()) as Persona;
      await loadAll();
      setSelectedId(created.id);
      setStatus(`Created draft version ${created.version}.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create draft");
    }
  }

  async function activate(persona: Persona): Promise<void> {
    if (!window.confirm(`Activate Core Persona version ${persona.version}? This changes public chat behavior.`)) return;
    const response = await adminFetch(`/api/admin/ai/personas/${persona.id}/activate`, { method: "POST" });
    if (!response.ok) {
      setError(await errorMessage(response));
      return;
    }
    setStatus(`Core Persona version ${persona.version} is active.`);
    await loadAll();
  }

  async function resolveFeedback(item: Feedback): Promise<void> {
    const notes = window.prompt("Resolution notes (do not paste private user data):", item.resolution_notes ?? "") ?? "";
    const response = await adminFetch(`/api/admin/ai/feedback/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ reviewed: true, resolution_notes: notes || null })
    });
    if (!response.ok) {
      setError(await errorMessage(response));
      return;
    }
    await loadAll();
  }

  return (
    <div className="admin-ai-workspace">
      <div className="section-head"><div><h2>AI Memorial Governance</h2><p>Manage versioned persona drafts and review answer feedback.</p></div></div>
      {error ? <p className="status error">{error}</p> : null}
      {status ? <p className="status success">{status}</p> : null}
      <div className="admin-ai-grid">
        <section className="admin-ai-card">
          <div className="admin-ai-card-head"><h3>Core Persona versions</h3><ParticleButton type="button" size="sm" variant="soft" onClick={() => void createDraft()}>New draft from selected</ParticleButton></div>
          <div className="persona-version-list">
            {personas.map((persona) => (
              <button key={persona.id} type="button" className={selectedId === persona.id ? "selected" : ""} onClick={() => setSelectedId(persona.id)}>
                <strong>v{persona.version}</strong><span className={`persona-status persona-status--${persona.status}`}>{persona.status}</span><small>{persona.change_note}</small>
              </button>
            ))}
          </div>
          {selected ? (
            <div className="persona-editor">
              <label>Change note<input value={changeNote} disabled={selected.status !== "draft"} onChange={(event) => setChangeNote(event.target.value)} /></label>
              <label>Structured profile JSON<textarea value={profileJson} disabled={selected.status !== "draft"} onChange={(event) => setProfileJson(event.target.value)} spellCheck={false} /></label>
              <div className="cta-row">
                {selected.status === "draft" ? <ParticleButton type="button" disabled={saving} onClick={() => void saveDraft()}>{saving ? "Saving..." : "Save draft"}</ParticleButton> : null}
                {selected.status !== "active" ? <ParticleButton type="button" variant="soft" onClick={() => void activate(selected)}>{selected.status === "archived" ? "Roll back to this version" : "Activate version"}</ParticleButton> : null}
              </div>
              <p className="privacy-caption">Activation is Ryo's approval step. Raw workbook text is not stored here unless you deliberately add it.</p>
            </div>
          ) : null}
        </section>

        <section className="admin-ai-card">
          <h3>Feedback queue</h3>
          <div className="feedback-queue">
            {feedback.map((item) => (
              <article key={item.id} className={item.reviewed_at ? "reviewed" : ""}>
                <div><strong>{item.rating.replace("_", " ")}</strong><span>Persona v{item.persona_version}</span></div>
                {item.comment ? <p>{item.comment}</p> : <p className="privacy-caption">No comment supplied.</p>}
                <small>{new Date(item.created_at).toLocaleString()} · {item.source_tribute_ids.length} sources</small>
                {!item.reviewed_at ? <ParticleButton type="button" size="sm" variant="soft" onClick={() => void resolveFeedback(item)}>Mark reviewed</ParticleButton> : <span className="persona-status persona-status--active">reviewed</span>}
              </article>
            ))}
            {feedback.length === 0 ? <p className="empty">No feedback yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
