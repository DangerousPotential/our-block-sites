/** Unbounded turns keep crossing the last seat from spinning a whole lap. */
export function nearestTurn(current: number, index: number, count: number) {
  return (
    current +
    ((((index - current) % count) + count + count / 2) % count) -
    count / 2
  );
}
export function wrapSeat(turn: number, count: number) {
  return ((Math.round(turn) % count) + count) % count;
}
export function orbitSeat(index: number, turn: number, count: number) {
  const angle = ((index - turn) * Math.PI * 2) / count;
  const depth = (Math.cos(angle) + 1) / 2;
  return {
    x: Math.sin(angle) * 40,
    y: -110 + depth * 180,
    scale: 0.42 + depth * 0.58,
    depth,
  };
}
