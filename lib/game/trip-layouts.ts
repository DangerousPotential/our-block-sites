import pastimes from '../../public/assets/trip/pastimes.json';
import estate from '../../public/assets/trip/estate.json';
import type { Layout } from './trip-navigation';
export const LAYOUTS: Record<string, Layout> = {
  river: pastimes,
  fair: estate,
  estate,
  town: estate,
  garden: estate,
};

export const EXPLORATION_LAYOUTS: Record<string, Layout> = {
  ...LAYOUTS,
  pastimes,
};
