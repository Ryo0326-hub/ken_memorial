import { KeyboardEvent, PointerEvent, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";

import { MemoryPaper } from "./MemoryPaper";
import { MemoryDecoration, STICKER_ASSETS, StickerAsset } from "./types";

type Props = {
  content: string;
  decorations: MemoryDecoration[];
  photoUrl: string | null;
  onContentChange: (content: string) => void;
  onDecorationsChange: (decorations: MemoryDecoration[]) => void;
  onRemovePhoto: () => void;
};

const SCALE_STEPS = [0.65, 1, 1.35];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function MemoryRecollectionEditor({
  content,
  decorations,
  photoUrl,
  onContentChange,
  onDecorationsChange,
  onRemovePhoto
}: Props) {
  const paperShellRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(decorations[0]?.instance_id ?? null);
  const selected = decorations.find((item) => item.instance_id === selectedId) ?? null;
  const stickerDecorations = decorations.filter((item) => item.asset !== "photo");

  function updateDecoration(id: string, changes: Partial<MemoryDecoration>): void {
    onDecorationsChange(decorations.map((item) => item.instance_id === id ? { ...item, ...changes } : item));
  }

  function addDecoration(asset: StickerAsset): void {
    if (stickerDecorations.length >= 5) return;
    const instanceId = `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const index = decorations.length;
    const next: MemoryDecoration = {
      instance_id: instanceId,
      asset,
      x: index % 2 === 0 ? 0.14 : 0.86,
      y: clamp(0.18 + index * 0.14, 0.12, 0.88),
      scale: 1,
      rotation: index % 2 === 0 ? -8 : 8
    };
    onDecorationsChange([...decorations, next]);
    setSelectedId(instanceId);
  }

  function removeSelected(): void {
    if (!selectedId) return;
    removeDecoration(selectedId);
  }

  function removeDecoration(id: string): void {
    const decoration = decorations.find((item) => item.instance_id === id);
    const remaining = decorations.filter((item) => item.instance_id !== id);
    if (decoration?.asset === "photo") {
      onRemovePhoto();
      setSelectedId(remaining[0]?.instance_id ?? null);
      return;
    }
    onDecorationsChange(remaining);
    setSelectedId((current) => current === id ? remaining[0]?.instance_id ?? null : current);
  }

  function moveFromPointer(event: PointerEvent<HTMLElement>, id: string): void {
    const bounds = paperShellRef.current?.getBoundingClientRect();
    if (!bounds) return;
    updateDecoration(id, {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0.06, 0.94),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0.06, 0.94)
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, id: string): void {
    event.preventDefault();
    dragIdRef.current = id;
    setSelectedId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    moveFromPointer(event, id);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (dragIdRef.current) moveFromPointer(event, dragIdRef.current);
  }

  function handlePointerEnd(): void {
    dragIdRef.current = null;
  }

  function handleDecorationKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string): void {
    const decoration = decorations.find((item) => item.instance_id === id);
    if (!decoration || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.015;
    updateDecoration(id, {
      x: clamp(decoration.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), 0.06, 0.94),
      y: clamp(decoration.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0), 0.06, 0.94)
    });
  }

  function resize(direction: -1 | 1): void {
    if (!selected) return;
    const nearest = SCALE_STEPS.reduce((best, value, index) =>
      Math.abs(value - selected.scale) < Math.abs(SCALE_STEPS[best] - selected.scale) ? index : best, 0);
    updateDecoration(selected.instance_id, { scale: SCALE_STEPS[clamp(nearest + direction, 0, SCALE_STEPS.length - 1)] });
  }

  return (
    <div className="memory-editor">
      <div
        ref={paperShellRef}
        className="memory-editor__paper-shell"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <MemoryPaper
          theme="plain"
          decorations={decorations}
          photoUrl={photoUrl}
          interactive
          selectedId={selectedId}
          onSelectDecoration={setSelectedId}
          onDecorationPointerDown={handlePointerDown}
          onDecorationKeyDown={handleDecorationKeyDown}
          onRemoveDecoration={removeDecoration}
        >
          <label className="memory-paper__input-label">
            <span className="sr-only">Your memory of Ken</span>
            <textarea
              value={content}
              onChange={(event) => onContentChange(event.target.value)}
              minLength={10}
              maxLength={5000}
              required
              placeholder="Write down a memory you shared with Ken…"
            />
          </label>
        </MemoryPaper>
      </div>

      <div className="memory-sticker-workbench">
        <div className="memory-sticker-heading">
          <div>
            <h3>Decorations</h3>
          </div>
          <span aria-live="polite">{stickerDecorations.length} / 5</span>
        </div>
        <div className="memory-sticker-tray">
          {STICKER_ASSETS.map((sticker) => (
            <button
              key={sticker.value}
              type="button"
              disabled={stickerDecorations.length >= 5}
              onClick={() => addDecoration(sticker.value)}
              aria-label={`Add ${sticker.label}`}
            >
              <img src={`/memory-decorations/${sticker.value}.svg`} alt="" />
              <span>{sticker.label}</span>
            </button>
          ))}
        </div>
        {selected ? (
          <div className="memory-sticker-controls" aria-label="Selected decoration controls">
            <span><strong>{selected.asset === "photo" ? "Photo" : STICKER_ASSETS.find((item) => item.value === selected.asset)?.label}</strong></span>
            <button type="button" onClick={() => updateDecoration(selected.instance_id, { rotation: clamp(selected.rotation - 15, -30, 30) })} aria-label="Rotate left"><RotateCcw /></button>
            <button type="button" onClick={() => updateDecoration(selected.instance_id, { rotation: clamp(selected.rotation + 15, -30, 30) })} aria-label="Rotate right"><RotateCw /></button>
            <button type="button" onClick={() => resize(-1)} aria-label="Make smaller"><Minus /></button>
            <button type="button" onClick={() => resize(1)} aria-label="Make larger"><Plus /></button>
            <button type="button" onClick={removeSelected} aria-label="Remove decoration"><Trash2 /></button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
