import React from 'react';
import { Feather } from '@expo/vector-icons';

const ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  vault: 'archive',
  folders: 'folder',
  search: 'search',
  settings: 'settings',
};

interface Props {
  name: string;
  color: string;
  focused: boolean;
}

export function TabIcon({ name, color, focused }: Props) {
  return <Feather name={ICONS[name] ?? ICONS.vault} size={22} color={color} style={{ opacity: focused ? 1 : 0.55 }} />;
}
