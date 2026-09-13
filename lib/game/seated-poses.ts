/** Measured frames in the unmodified generated atlas. Hip coordinates anchor
 * the body to native chairs independently of transparent sprite margins. */
export const SEATED_ATLAS_SIZE = 1254;
export const SEATED_POSES: Record<
  string,
  {
    x: number;
    y: number;
    width: number;
    height: number;
    hipX: number;
    hipY: number;
  }
> = {
  mei: { x: 162, y: 68, width: 369, height: 537, hipX: 310, hipY: 514 },
  aisyah: { x: 759, y: 66, width: 340, height: 538, hipX: 927, hipY: 523 },
  arun: { x: 191, y: 646, width: 337, height: 529, hipX: 332, hipY: 1087 },
  daniel: { x: 749, y: 646, width: 351, height: 529, hipX: 921, hipY: 1100 },
};
