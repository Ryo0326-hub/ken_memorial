import { KeyboardEvent, PointerEvent, ReactNode, SyntheticEvent, useState } from "react";
import { X } from "lucide-react";

import { MemoryDecoration, PaperTheme } from "./types";

type MemoryPaperProps = {
  content?: string;
  theme: PaperTheme;
  decorations: MemoryDecoration[];
  photoUrl?: string | null;
  children?: ReactNode;
  compact?: boolean;
  interactive?: boolean;
  selectedId?: string | null;
  onSelectDecoration?: (id: string) => void;
  onDecorationPointerDown?: (event: PointerEvent<HTMLButtonElement>, id: string) => void;
  onDecorationKeyDown?: (event: KeyboardEvent<HTMLButtonElement>, id: string) => void;
  onRemoveDecoration?: (id: string) => void;
};

export function MemoryPaper({
  content,
  theme,
  decorations,
  photoUrl,
  children,
  compact = false,
  interactive = false,
  selectedId,
  onSelectDecoration,
  onDecorationPointerDown,
  onDecorationKeyDown,
  onRemoveDecoration
}: MemoryPaperProps) {
  const [loadedPhoto, setLoadedPhoto] = useState<{ url: string; aspectRatio: number } | null>(null);
  const photoAspectRatio = loadedPhoto && loadedPhoto.url === photoUrl ? loadedPhoto.aspectRatio : null;

  function handlePhotoLoad(event: SyntheticEvent<HTMLImageElement>): void {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!photoUrl || naturalWidth <= 0 || naturalHeight <= 0) return;
    setLoadedPhoto({ url: photoUrl, aspectRatio: naturalWidth / naturalHeight });
  }

  return (
    <div
      className={`memory-paper memory-paper--${theme}${compact ? " memory-paper--compact" : ""}${interactive ? " memory-paper--interactive" : ""}`}
      data-testid="memory-paper"
    >
      <div className="memory-paper__grain" aria-hidden="true" />
      <div className="memory-paper__theme" aria-hidden="true" />
      <div className="memory-paper__decorations" aria-label={interactive ? "Placed decorations" : undefined}>
        {decorations.map((decoration) => {
          const isPhoto = decoration.asset === "photo";
          if (isPhoto && !photoUrl) return null;
          const positionStyle = {
            left: `${decoration.x * 100}%`,
            top: `${decoration.y * 100}%`
          };
          const photoFrameStyle = isPhoto && photoAspectRatio
            ? {
                aspectRatio: `${photoAspectRatio}`,
                width: photoAspectRatio < 1
                  ? `clamp(64px, ${24 * photoAspectRatio}%, ${160 * photoAspectRatio}px)`
                  : "clamp(108px, 24%, 160px)"
              }
            : {};
          const transformStyle = {
            transform: `rotate(${decoration.rotation}deg) scale(${decoration.scale})`
          };
          const image = isPhoto ? (
            <img
              src={photoUrl ?? ""}
              alt={interactive ? "Uploaded memory photo" : ""}
              draggable={false}
              onLoad={handlePhotoLoad}
            />
          ) : (
            <img
              src={`/memory-decorations/${decoration.asset}.svg`}
              alt=""
              draggable={false}
            />
          );
          return interactive ? (
            <span
              key={decoration.instance_id}
              className={`memory-sticker memory-sticker--interactive${isPhoto ? " memory-sticker--photo" : ""}`}
              style={{ ...positionStyle, ...photoFrameStyle, transform: "translate(-50%, -50%)" }}
            >
              <button
                type="button"
                className={`memory-sticker__move${selectedId === decoration.instance_id ? " is-selected" : ""}`}
                style={transformStyle}
                aria-label={`${decoration.asset.replace(/_/g, " ")} decoration. Use arrow keys to move.`}
                aria-pressed={selectedId === decoration.instance_id}
                onClick={() => onSelectDecoration?.(decoration.instance_id)}
                onPointerDown={(event) => onDecorationPointerDown?.(event, decoration.instance_id)}
                onKeyDown={(event) => onDecorationKeyDown?.(event, decoration.instance_id)}
              >
                {image}
              </button>
              <button
                type="button"
                className="memory-sticker__delete"
                aria-label={`Delete ${decoration.asset.replace(/_/g, " ")} decoration`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveDecoration?.(decoration.instance_id);
                }}
              >
                <X aria-hidden="true" />
              </button>
            </span>
          ) : (
            <span
              key={decoration.instance_id}
              className={`memory-sticker${isPhoto ? " memory-sticker--photo" : ""}`}
              style={{
                ...positionStyle,
                ...photoFrameStyle,
                transform: `translate(-50%, -50%) ${transformStyle.transform}`
              }}
              aria-hidden="true"
            >
              {image}
            </span>
          );
        })}
      </div>
      <div className="memory-paper__writing">
        {children ?? <p className="memory-paper__text">{content}</p>}
      </div>
    </div>
  );
}
