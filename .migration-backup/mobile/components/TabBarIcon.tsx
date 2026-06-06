import React from 'react';
import { Feather } from '@expo/vector-icons';

const ICON_MAP: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  house: 'archive',
  folder: 'folder',
  magnifyingglass: 'search',
  gearshape: 'settings',
};

interface Props {
  name: string;
  color: string;
  size: number;
}

export function TabBarIcon({ name, color, size }: Props) {
  return <Feather name={ICON_MAP[name] ?? 'circle'} color={color} size={size} />;
}
