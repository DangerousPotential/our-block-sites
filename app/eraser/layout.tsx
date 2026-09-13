import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flag Eraser Showdown — Our Block',
  description:
    'A two-player school-desk battle. Swing your phone or swipe to flick a flag eraser. Land on top to win.',
};
export default function EraserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
