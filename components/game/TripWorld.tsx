'use client';
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { WorldEra } from '@/lib/game/pastimes1950s';
import type CultureWorld from './CultureTripWorld';

const CultureTripWorld = dynamic(() => import('./CultureTripWorld'), {
  ssr: false,
});
const HeritageWorld = dynamic(() => import('./HeritageWorld'), { ssr: false });
type Props = Omit<ComponentProps<typeof CultureWorld>, 'era'> & {
  era: WorldEra;
};

// PR #7 extends the published renderer; keep its 1950s and baseline river
// presentation separate from the later cultural additions in the other eras.
export default function TripWorld(props: Props) {
  if (props.era === 'pastimes' || props.era === 'river')
    return <HeritageWorld {...props} key="pastimes" era="pastimes" />;
  return <CultureTripWorld {...props} key="estate" era="estate" />;
}
