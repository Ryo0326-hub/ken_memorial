import * as React from "react";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ParticleButtonProps extends ButtonProps {
  onSuccess?: () => void;
  successDuration?: number;
  icon?: React.ReactNode;
}

function resolveParticleToneClass(
  variant: ButtonProps["variant"] | undefined,
  className: string | undefined
): string {
  const classes = className ?? "";
  if (classes.includes("read-tribute-btn--sky")) {
    return "particle-tone--sky";
  }
  if (classes.includes("read-tribute-btn--mint")) {
    return "particle-tone--mint";
  }
  if (classes.includes("read-tribute-btn--lavender")) {
    return "particle-tone--lavender";
  }
  if (variant === "soft" || variant === "ghost" || variant === "outline" || variant === "link") {
    return "particle-tone--soft";
  }
  return "particle-tone--default";
}

function SuccessParticles({
  buttonRef
}: {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const button = buttonRef.current;
  if (!button) {
    return null;
  }

  return (
    <AnimatePresence>
      {Array.from({ length: 10 }).map((_, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const horizontal = direction * (20 + (index % 5) * 8);
        const vertical = -18 - (index % 4) * 10;
        return (
          <motion.div
            key={index}
            className="particle-burst"
            style={{ left: "50%", top: "56%" }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.15, 0],
              x: [0, horizontal],
              y: [0, vertical, vertical - 16],
              opacity: [0, 0.95, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.7,
              delay: index * 0.03,
              ease: "easeOut"
            }}
          />
        );
      })}
      <motion.div
        className="particle-halo"
        initial={{ scale: 0.72, opacity: 0 }}
        animate={{ scale: [0.72, 1.18, 1.36], opacity: [0, 0.34, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.62, ease: "easeOut" }}
      />
    </AnimatePresence>
  );
}

function ParticleButton({
  children,
  onClick,
  onSuccess,
  successDuration = 1000,
  className,
  icon,
  disabled,
  ...props
}: ParticleButtonProps) {
  const [showParticles, setShowParticles] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const particleToneClass = resolveParticleToneClass(props.variant, className);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    setShowParticles(true);
    window.setTimeout(() => {
      setShowParticles(false);
      onSuccess?.();
    }, successDuration);

    onClick?.(event);
  };

  return (
    <span className={cn("particle-button-shell", particleToneClass)}>
      {showParticles ? <SuccessParticles buttonRef={buttonRef} /> : null}
      <Button
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "particle-button",
          showParticles && "particle-button--active",
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
