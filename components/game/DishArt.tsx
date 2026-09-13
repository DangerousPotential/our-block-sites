'use client';
import { useEffect, useRef } from 'react';
import { drawDish, loadMinigameArt } from './minigame-art';

export default function DishArt({ dish }: { dish: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    void loadMinigameArt('hawker-dishes.png')
      .then((art) => {
        if (!active || !ref.current) return;
        const ctx = ref.current.getContext('2d')!;
        ctx.clearRect(0, 0, 160, 120);
        drawDish(ctx, art, dish, 80, 135, 150);
      })
      .catch(() => {
        /* The button's dish label remains usable offline. */
      });
    return () => {
      active = false;
    };
  }, [dish]);
  return (
    <canvas
      ref={ref}
      className="party-dish-art"
      width={160}
      height={120}
      aria-hidden="true"
    />
  );
}
