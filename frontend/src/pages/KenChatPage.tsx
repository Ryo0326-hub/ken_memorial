import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Flag, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";

import { ParticleButton } from "@/components/ui/particle-button";

type Relationship = "family" | "friend" | "school" | "teammate" | "other" | "prefer_not_to_say";
type GroundingMode = "profile" | "memory" | "mixed" | "uncertain" | "safety";
type FeedbackRating = "helpful" | "inaccurate" | "inappropriate" | "too_personal";

type ChatConfig = {
  enabled: boolean;
  persona_version: number | null;
  notice_version: string;
  notice: string;
  starter_prompts: string[];
  max_message_characters: number;
};

type SourceCard = {
  tribute_id: string;
  title: string;
  author_label: string;
  snippet: string;
};

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  request_id?: string;
  grounding_mode?: GroundingMode;
  sources?: SourceCard[];
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const SESSION_KEY = "ken_ai_memorial_chat";
const SESSION_ID_KEY = "ken_ai_memorial_session_id";

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const created = makeId();
  sessionStorage.setItem(SESSION_ID_KEY, created);
  return created;
}

function readTurns(): ChatTurn[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]") as ChatTurn[];
    return Array.isArray(parsed) ? parsed.slice(-24) : [];
  } catch {
    return [];
  }
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail || fallback;
  } catch {
    return fallback;
  }
}

export function KenChatPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>(readTurns);
  const [draft, setDraft] = useState("");
  const [relationship, setRelationship] = useState<Relationship | "">("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryMessage, setRetryMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<Record<string, FeedbackRating>>({});
  const [reportRequestId, setReportRequestId] = useState<string | null>(null);
  const [reportComment, setReportComment] = useState("");
  const [attachExchange, setAttachExchange] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void loadConfig();
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(turns.slice(-24)));
  }, [turns]);

  async function loadConfig(): Promise<void> {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/ai-chat/config"));
      if (!response.ok) throw new Error(await readError(response, "Unable to load memorial chat."));
      const loaded = (await response.json()) as ChatConfig;
      setConfig(loaded);
      setAcknowledged(localStorage.getItem(`ken_ai_notice_${loaded.notice_version}`) === "accepted");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load memorial chat.");
    } finally {
      setLoading(false);
    }
  }

  function acceptNotice(): void {
    if (!config) return;
    localStorage.setItem(`ken_ai_notice_${config.notice_version}`, "accepted");
    setAcknowledged(true);
  }

  function startOver(): void {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setTurns([]);
    setDraft("");
    setError("");
    setRetryMessage("");
    setReportRequestId(null);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
  }

  async function sendMessage(rawMessage: string): Promise<void> {
    const message = rawMessage.trim();
    if (!message || sending || !config?.enabled) return;
    const userTurn: ChatTurn = { id: makeId(), role: "user", content: message };
    const history = turns
      .filter((turn) => turn.role === "user" || turn.role === "assistant")
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    setTurns((current) => [...current, userTurn]);
    setDraft("");
    setError("");
    setRetryMessage("");
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(apiUrl("/api/ai-chat/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: getSessionId(),
          message,
          relationship: relationship || null,
          history
        })
      });
      if (!response.ok) throw new Error(await readError(response, "The memorial chat could not answer."));
      const payload = (await response.json()) as {
        request_id: string;
        message: string;
        grounding_mode: GroundingMode;
        sources: SourceCard[];
      };
      setTurns((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: payload.message,
          request_id: payload.request_id,
          grounding_mode: payload.grounding_mode,
          sources: payload.sources
        }
      ]);
    } catch (sendError) {
      if ((sendError as Error).name !== "AbortError") {
        setError(sendError instanceof Error ? sendError.message : "The memorial chat could not answer.");
        setRetryMessage(message);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
    }
  }

  async function submitFeedback(
    turn: ChatTurn,
    rating: FeedbackRating,
    includeExchange = false
  ): Promise<void> {
    if (!turn.request_id) return;
    const turnIndex = turns.findIndex((item) => item.id === turn.id);
    const precedingUser = [...turns.slice(0, turnIndex)].reverse().find((item) => item.role === "user");
    try {
      const response = await fetch(apiUrl("/api/ai-chat/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: turn.request_id,
          rating,
          comment: reportComment.trim() || null,
          attach_exchange: includeExchange,
          reported_exchange:
            includeExchange && precedingUser
              ? { user_message: precedingUser.content, assistant_message: turn.content }
              : null
        })
      });
      if (!response.ok) throw new Error(await readError(response, "Feedback could not be sent."));
      setFeedbackSent((current) => ({ ...current, [turn.request_id as string]: rating }));
      setReportRequestId(null);
      setReportComment("");
      setAttachExchange(false);
    } catch (feedbackError) {
      setError(feedbackError instanceof Error ? feedbackError.message : "Feedback could not be sent.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await sendMessage(draft);
  }

  const lastAssistant = useMemo(
    () => [...turns].reverse().find((turn) => turn.role === "assistant" && turn.request_id),
    [turns]
  );
  const remaining = (config?.max_message_characters ?? 1000) - draft.length;

  if (loading) {
    return <section className="content-panel chat-page"><p>Opening the memorial chat...</p></section>;
  }

  return (
    <section className="content-panel reveal chat-page">
      <div className="chat-heading">
        <div>
          <span className="ai-memorial-badge"><ShieldCheck size={15} /> AI memorial</span>
          <h1>Talk with Ken</h1>
        </div>
        <ParticleButton
          type="button"
          variant="soft"
          className="action-button action-button--start-over chat-start-over"
          onClick={startOver}
          icon={<img src="/action-icons/start-over.png" alt="" className="action-button__icon" />}
        >
          Start over
        </ParticleButton>
      </div>

      {!acknowledged && config ? (
        <div className="chat-notice" role="dialog" aria-labelledby="chat-notice-title">
          <div>
            <div className="chat-notice-title-row">
              <img
                src="/action-icons/notice-alert.png"
                alt=""
                aria-hidden="true"
                className="chat-notice-alert-icon"
              />
              <h2 id="chat-notice-title">Before we begin</h2>
            </div>
            <p>{config.notice}</p>
            <div className="cta-row">
              <ParticleButton
                type="button"
                variant="soft"
                className="action-button chat-notice-action"
                onClick={acceptNotice}
                icon={<img src="/action-icons/chat-ai.png" alt="" className="action-button__icon" />}
              >
                I understand — start chatting
              </ParticleButton>
              <ParticleButton
                type="button"
                variant="soft"
                className="action-button chat-notice-action"
                onClick={() => onNavigate("/guidelines")}
                icon={<img src="/action-icons/read-how-it-works.png" alt="" className="action-button__icon" />}
              >
                Read how this works
              </ParticleButton>
            </div>
          </div>
        </div>
      ) : null}

      {acknowledged ? (
        <>
          {!config?.enabled ? (
            <div className="chat-resting" role="status">
              <h2>The memorial chat is resting right now.</h2>
              <p>The persona is still under review or the feature is switched off. Please visit the tribute wall.</p>
              <ParticleButton type="button" variant="soft" onClick={() => onNavigate("/")}>Visit tribute wall</ParticleButton>
            </div>
          ) : (
            <>
              <div className="chat-context-row">
                <label>
                  How did you know Ken? <span>(optional)</span>
                  <select value={relationship} onChange={(event) => setRelationship(event.target.value as Relationship | "")}>
                    <option value="">Choose if you'd like</option>
                    <option value="family">Family</option>
                    <option value="friend">Friend</option>
                    <option value="school">School</option>
                    <option value="teammate">Teammate</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">I'd rather not say</option>
                  </select>
                </label>
                <button className="how-link" type="button" onClick={() => onNavigate("/guidelines")}>How this works</button>
              </div>

              {turns.length === 0 ? (
                <div className="starter-prompts" aria-label="Conversation starters">
                  {config.starter_prompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => setDraft(prompt)}>{prompt}</button>
                  ))}
                </div>
              ) : null}

              <div className="chat-transcript" aria-live="polite">
                {turns.map((turn) => (
                  <article key={turn.id} className={`chat-message chat-message--${turn.role}`}>
                    <span className="chat-message-label">{turn.role === "user" ? "You" : "AI memorial"}</span>
                    <p>{turn.content}</p>
                    {turn.role === "assistant" && turn.sources?.length ? (
                      <details className="chat-sources">
                        <summary>Based on {turn.sources.length === 1 ? "a shared memory" : "shared memories"}</summary>
                        <div className="chat-source-list">
                          {turn.sources.map((source) => (
                            <div className="chat-source-card" key={source.tribute_id}>
                              <strong>{source.title}</strong>
                              <span>Shared by {source.author_label}</span>
                              <p>{source.snippet}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    {turn.role === "assistant" && turn.request_id ? (
                      <div className="chat-feedback-row" aria-label="Rate this answer">
                        {feedbackSent[turn.request_id] ? (
                          <span>Thank you for the feedback.</span>
                        ) : (
                          <>
                            <button type="button" onClick={() => void submitFeedback(turn, "helpful")}><ThumbsUp size={14} /> Helpful</button>
                            <button type="button" onClick={() => void submitFeedback(turn, "inaccurate")}><ThumbsDown size={14} /> Inaccurate</button>
                            <button type="button" onClick={() => void submitFeedback(turn, "inappropriate")}><Flag size={14} /> Inappropriate</button>
                            <button type="button" onClick={() => void submitFeedback(turn, "too_personal")}>Too personal</button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </article>
                ))}
                {sending ? <div className="chat-typing" role="status">The memorial is gathering the right memories<span>...</span></div> : null}
              </div>

              {error ? <p className="status error">{error}</p> : null}
              {retryMessage ? <button className="how-link" type="button" onClick={() => void sendMessage(retryMessage)}>Try that message again</button> : null}

              <form className="chat-composer" onSubmit={handleSubmit}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={config.max_message_characters}
                  placeholder="Write a message..."
                  aria-label="Message the AI memorial"
                  rows={3}
                />
                <div className="chat-composer-actions">
                  <span className={remaining <= 120 ? "character-count near-limit" : "character-count"}>{remaining} left</span>
                  {sending ? (
                    <ParticleButton type="button" variant="soft" onClick={() => abortRef.current?.abort()}>Cancel</ParticleButton>
                  ) : null}
                  <ParticleButton
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="action-button action-button--submit chat-send-button"
                    aria-label="Send message"
                    title="Send message"
                    icon={
                      <img
                        src="/action-icons/chat-send.png"
                        alt=""
                        className="action-button__icon action-button__icon--submit chat-send-icon"
                      />
                    }
                  >
                    Send
                  </ParticleButton>
                </div>
              </form>

              {lastAssistant?.request_id ? (
                <div className="chat-report">
                  <button type="button" className="how-link" onClick={() => setReportRequestId(lastAssistant.request_id as string)}>Report this conversation</button>
                  {reportRequestId === lastAssistant.request_id ? (
                    <div className="chat-report-box">
                      <label>What felt wrong? (optional)<textarea value={reportComment} onChange={(event) => setReportComment(event.target.value)} maxLength={1000} /></label>
                      <label className="checkbox-row"><input type="checkbox" checked={attachExchange} onChange={(event) => setAttachExchange(event.target.checked)} />Attach the related message and answer to this report. This is optional and requires your permission.</label>
                      <div className="cta-row"><ParticleButton type="button" size="sm" onClick={() => void submitFeedback(lastAssistant, "inappropriate", attachExchange)}>Send report</ParticleButton><ParticleButton type="button" size="sm" variant="soft" onClick={() => setReportRequestId(null)}>Cancel</ParticleButton></div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
