import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ParticleButtonProps extends ButtonProps {
  onSuccess?: () => void;
  successDuration?: number;
  icon?: React.ReactNode;
}

function resolveParticleToneClass(variant: ButtonProps["variant"] | undefined): string {
  if (variant === "soft" || variant === "ghost" || variant === "outline" || variant === "link") {
    return "particle-tone--soft";
  }
  return "particle-tone--default";
}

function MechanicalFeedback() {
  return (
    <span className="mechanical-feedback" aria-hidden="true">
      <span className="mechanical-feedback__frame" />
      <span className="mechanical-feedback__latch mechanical-feedback__latch--left" />
      <span className="mechanical-feedback__latch mechanical-feedback__latch--right" />
    </span>
  );
}

function ParticleButton({
  children,
  onClick,
  onSuccess,
  successDuration = 460,
  className,
  icon,
  disabled,
  ...props
}: ParticleButtonProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const particleToneClass = resolveParticleToneClass(props.variant);

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    setShowFeedback(true);
    feedbackTimerRef.current = window.setTimeout(() => {
      setShowFeedback(false);
      feedbackTimerRef.current = null;
      onSuccess?.();
    }, successDuration);

    onClick?.(event);
  };

  return (
    <span className={cn("particle-button-shell", particleToneClass)}>
      {showFeedback ? <MechanicalFeedback /> : null}
      <Button
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "particle-button",
          showFeedback && "particle-button--active",
          className
        )}
        {...props}
      >
        <span className="particle-button__sheen" aria-hidden="true" />
        <span className="particle-button__glow" aria-hidden="true" />
        <span className="particle-button__label">{children}</span>
        <span className="particle-button__icon" aria-hidden="true">
          {icon ?? <Sparkles className="particle-button__svg" />}
        </span>
      </Button>
    </span>
  );
}

export { ParticleButton };
