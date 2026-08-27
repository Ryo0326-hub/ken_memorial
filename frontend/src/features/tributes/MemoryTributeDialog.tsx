import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { MemoryPaper } from "./MemoryPaper";
import { Tribute } from "./types";

type Props = {
  tribute: Tribute | null;
  imageUrl: string | null;
  onClose: () => void;
  formatDate: (value: string) => string;
};

export function MemoryTributeDialog({ tribute, imageUrl, onClose, formatDate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!tribute || !dialog) return;
    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (dialog.open) dialog.close();
      window.requestAnimationFrame(() => returnFocusTo?.focus());
    };
  }, [tribute, onClose]);

  if (!tribute) return null;

  return (
    <dialog
      ref={dialogRef}
      className="memory-dialog"
      aria-labelledby="memory-dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="memory-dialog__inner">
        <div className="memory-dialog__head">
          <div>
            <span>Memory Recollection</span>
            <h2 id="memory-dialog-title">A memory shared by {tribute.public_author_label}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close memory"><X /></button>
        </div>
        <MemoryPaper
          theme={tribute.paper_theme ?? "plain"}
          decorations={tribute.decorations ?? []}
          photoUrl={imageUrl}
          content={tribute.content}
        />
        <p className="memory-dialog__byline">Shared by {tribute.public_author_label} · {formatDate(tribute.submitted_at)}</p>
        {imageUrl && !tribute.decorations?.some((decoration) => decoration.asset === "photo") ? (
          <figure className="memory-gallery-frame">
            <img src={imageUrl} alt="Photo shared with this memory" />
          </figure>
        ) : null}
      </div>
    </dialog>
  );
}
