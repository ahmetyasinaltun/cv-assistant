"use client";

// Hand-drawn loop around a supporting CV line, like an editor's grease pencil on a contact sheet.
// Solid for a full match, dashed for a partial one; drawn on through a mask so the dash pattern stays intact.

import { useId, useLayoutEffect, useRef, useState } from "react";

// Clearance between the text box and the loop, so the stroke never crosses the words it circles.
const PAD_X = 15;
const PAD_Y = 11;
const MAX_CORNER = 24;
const JITTER_PX = 5;
const MAX_TILT_DEG = 0.8;

/** Deterministic noise in [-0.5, 0.5] so each loop looks hand-drawn but stays identical across renders. */
function noise(seed: string, index: number): number {
  let hash = 2166136261;
  for (const char of `${seed}:${index}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967295 - 0.5;
}

const point = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

// An uneven dash rhythm, as when a pencil skips: used for partial matches.
const HAND_DASHES = "11 6 7 5 13 6 9 5 6 6";

/**
 * A loop drawn clockwise from the top-left, with corners kept outside the text box. Each corner gets
 * its own radius and the long edges bow slightly, so the body is never an even rounded rectangle.
 * A closed (solid) loop comes back past its own start and crosses it, the way a pencil loop closes;
 * an open (dashed) loop stops where it began, so no stray dash fragment sits on the crossing.
 */
function loopPaths(width: number, height: number, seed: string, closed: boolean) {
  let index = 0;
  const j = () => noise(seed, index++) * JITTER_PX;
  const corner = () => Math.min(height / 2, MAX_CORNER) * (1 + noise(seed, index++) * 0.5);
  const [tl, tr, br, bl] = [corner(), corner(), corner(), corner()];
  const bow = () => noise(seed, index++) * 4;
  const w = width;
  const h = height;
  const start = { x: tl * 1.6 + j(), y: 4 + j() * 0.4 };

  const segments = [
    `M ${point(start.x, start.y)}`,
    `C ${point(w * 0.35, bow())}, ${point(w * 0.65, 2.5 + bow())}, ${point(w - tr + j(), 1.5 + j() * 0.3)}`,
    `C ${point(w - tr * 0.4, 1)}, ${point(w - 1 + j() * 0.3, tr * 0.4)}, ${point(w - 1.5 + j() * 0.3, h * 0.5)}`,
    `C ${point(w - 1, h - br * 0.4)}, ${point(w - br * 0.4, h - 1 + j() * 0.3)}, ${point(w - br + j(), h - 1.5 + j() * 0.3)}`,
    `C ${point(w * 0.6, h + bow())}, ${point(w * 0.35, h - 2.5 + bow())}, ${point(bl + j(), h - 1.5 + j() * 0.3)}`,
    `C ${point(bl * 0.4, h - 1)}, ${point(1 + j() * 0.3, h - bl * 0.4)}, ${point(1.5 + j() * 0.3, h * 0.5)}`,
    closed
      ? `C ${point(1.5, tl * 0.45)}, ${point(tl * 0.5, 0.5)}, ${point(start.x + tl * 1.4 + j(), -1.5 + j() * 0.3)}`
      : `C ${point(1.5, tl * 0.5)}, ${point(tl * 0.45, 2.5)}, ${point(start.x - 3, start.y + 0.5)}`,
  ];
  const main = segments.join(" ");

  // A thinner second pass along the top arc, where the pencil presses hardest as the stroke starts.
  const pressure = [
    `M ${point(start.x - 2, start.y + 1.2)}`,
    `C ${point(w * 0.3, 1.2 + j() * 0.3)}, ${point(w * 0.5, 2.8 + j() * 0.3)}, ${point(w * 0.62, 2.6 + j() * 0.3)}`,
  ].join(" ");

  const tilt = noise(seed, index++) * 2 * MAX_TILT_DEG;
  return { main, pressure, tilt };
}

interface GreasePencilLoopProps {
  seed: string;
  dashed: boolean;
  /** Skip the draw-on (keyboard selection); reduced motion is handled in CSS. */
  instant: boolean;
}

export function GreasePencilLoop({ seed, dashed, instant }: GreasePencilLoopProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const maskId = useId();

  useLayoutEffect(() => {
    const target = anchorRef.current?.parentElement;
    if (!target) return;
    const measure = () =>
      setSize({ width: target.offsetWidth + PAD_X * 2, height: target.offsetHeight + PAD_Y * 2 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!size) return <span ref={anchorRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;

  const { main, pressure, tilt } = loopPaths(size.width, size.height, seed, !dashed);
  const centre = `${(size.width / 2).toFixed(1)} ${(size.height / 2).toFixed(1)}`;

  return (
    <span ref={anchorRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        className="loop-layer absolute overflow-visible"
        style={{ left: -PAD_X, top: -PAD_Y }}
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
      >
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <path
            d={main}
            pathLength={1}
            fill="none"
            stroke="white"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="1 1"
            className="loop-reveal"
            data-instant={instant}
          />
        </mask>
        <g
          transform={`rotate(${tilt.toFixed(2)} ${centre})`}
          mask={`url(#${maskId})`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-marker"
        >
          <path d={main} strokeWidth={2.4} strokeDasharray={dashed ? HAND_DASHES : undefined} />
          {!dashed && <path d={pressure} strokeWidth={1.1} opacity={0.6} />}
        </g>
      </svg>
    </span>
  );
}
