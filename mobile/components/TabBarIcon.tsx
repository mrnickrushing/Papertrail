import { Text } from 'react-native';

const ICON_MAP: Record<string, string> = {
  'house':           '⌂',
  'folder':          '⊞',
  'magnifyingglass': '⌕',
  'gearshape':       '⚙',
};

interface Props {
  name: string;
  color: string;
  size: number;
}

export function TabBarIcon({ name, color, size }: Props) {
  return (
    <Text style={{ fontSize: size - 2, color, lineHeight: size + 4 }}>
      {ICON_MAP[name] ?? '●'}
    </Text>
  );
}
