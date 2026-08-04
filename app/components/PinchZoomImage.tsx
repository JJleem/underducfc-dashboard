"use client";

// 브라우저 자체 화면 확대를 잠근 PWA에서 사진만 확대하기 위한 이미지 뷰어.
// 두 손가락 핀치, 확대 후 한 손가락 이동, 더블 탭 확대/원복을 지원한다.

import { useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function PinchZoomImage({
  src,
  alt = "",
  className = "",
  imageClassName = "",
  allowHorizontalSwipe = false,
  loading,
}: {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  /** 사진 캐러셀 안에서는 확대 전 한 손가락 좌우 스와이프를 부모에게 넘긴다. */
  allowHorizontalSwipe?: boolean;
  loading?: "eager" | "lazy";
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const panStart = useRef<{ id: number; point: Point; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef(0);
  const lastPointerType = useRef("");
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [gesturing, setGesturing] = useState(false);

  const apply = (scale: number, x: number, y: number) => {
    const nextScale = clamp(scale, MIN_SCALE, MAX_SCALE);
    const image = imageRef.current;
    const frame = frameRef.current;
    const width = image?.clientWidth || frame?.clientWidth || 0;
    const height = image?.clientHeight || frame?.clientHeight || 0;
    const maxX = (width * (nextScale - 1)) / 2;
    const maxY = (height * (nextScale - 1)) / 2;
    const next = {
      scale: nextScale,
      x: nextScale === 1 ? 0 : clamp(x, -maxX, maxX),
      y: nextScale === 1 ? 0 : clamp(y, -maxY, maxY),
    };
    transformRef.current = next;
    setTransform(next);
  };

  const reset = () => apply(1, 0, 0);
  const toggleZoom = () => {
    const current = transformRef.current;
    if (current.scale > 1) reset();
    else apply(DOUBLE_TAP_SCALE, 0, 0);
  };

  useEffect(() => {
    pointers.current.clear();
    pinchStart.current = null;
    panStart.current = null;
    transformRef.current = { scale: 1, x: 0, y: 0 };
    setTransform(transformRef.current);
  }, [src]);

  return (
    <div
      ref={frameRef}
      className={`flex h-full w-full select-none items-center justify-center overflow-hidden ${className}`}
      style={{
        touchAction:
          allowHorizontalSwipe && transform.scale === 1 ? "pan-x" : "none",
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        if (lastPointerType.current !== "mouse") return;
        event.preventDefault();
        toggleZoom();
      }}
      onPointerDown={(event) => {
        lastPointerType.current = event.pointerType;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const point = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, point);
        moved.current = false;
        setGesturing(true);

        const active = Array.from(pointers.current.values());
        if (active.length >= 2) {
          pinchStart.current = {
            distance: Math.max(1, distance(active[0], active[1])),
            scale: transformRef.current.scale,
          };
          panStart.current = null;
        } else if (transformRef.current.scale > 1) {
          panStart.current = {
            id: event.pointerId,
            point,
            x: transformRef.current.x,
            y: transformRef.current.y,
          };
        }
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        const before = pointers.current.get(event.pointerId)!;
        const point = { x: event.clientX, y: event.clientY };
        if (Math.hypot(point.x - before.x, point.y - before.y) > 3) moved.current = true;
        pointers.current.set(event.pointerId, point);

        const active = Array.from(pointers.current.values());
        if (active.length >= 2) {
          if (!pinchStart.current) {
            pinchStart.current = {
              distance: Math.max(1, distance(active[0], active[1])),
              scale: transformRef.current.scale,
            };
          }
          const nextScale =
            pinchStart.current.scale *
            (distance(active[0], active[1]) / pinchStart.current.distance);
          apply(nextScale, transformRef.current.x, transformRef.current.y);
          return;
        }

        const pan = panStart.current;
        if (pan && pan.id === event.pointerId && transformRef.current.scale > 1) {
          apply(
            transformRef.current.scale,
            pan.x + point.x - pan.point.x,
            pan.y + point.y - pan.point.y,
          );
        }
      }}
      onPointerUp={(event) => {
        const wasSingleTap = pointers.current.size === 1 && !moved.current;
        pointers.current.delete(event.pointerId);
        pinchStart.current = null;

        const remaining = Array.from(pointers.current.entries())[0];
        panStart.current =
          remaining && transformRef.current.scale > 1
            ? {
                id: remaining[0],
                point: remaining[1],
                x: transformRef.current.x,
                y: transformRef.current.y,
              }
            : null;
        if (pointers.current.size === 0) setGesturing(false);

        if (wasSingleTap && event.pointerType !== "mouse") {
          const now = Date.now();
          if (now - lastTap.current < 280) {
            lastTap.current = 0;
            toggleZoom();
          } else {
            lastTap.current = now;
          }
        }
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        pinchStart.current = null;
        panStart.current = null;
        if (pointers.current.size === 0) setGesturing(false);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        className={`max-h-full max-w-full object-contain ${
          gesturing ? "" : "transition-transform duration-200 ease-out"
        } ${imageClassName}`}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        }}
      />
    </div>
  );
}
