import { FLAG_CODES } from '../data/teams';

export const T = {
  bg:"#f7f8fa",wh:"#fff",g50:"#f9fafb",g100:"#f1f3f5",g200:"#e5e7eb",
  g300:"#d1d5db",g400:"#9ca3af",g500:"#6b7280",g700:"#374151",g900:"#111827",
  amb:"#d97706",ambL:"#fef3c7",ambD:"#92400e",
  gn:"#059669",gnL:"#dcfce7",gnD:"#166534",
  rd:"#dc2626",rdL:"#fee2e2",bl:"#2563eb",blL:"#dbeafe",pu:"#7c3aed",puL:"#f5f3ff"
};

export function Flag({ name, size = 14 }) {
  const code = FLAG_CODES[name];
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt=""
      style={{
        width: size,
        height: Math.round(size * 0.7),
        objectFit: 'cover',
        borderRadius: 2,
        verticalAlign: 'middle',
        marginRight: 3,
      }}
    />
  );
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: T.wh,
      borderRadius: 8,
      padding: 12,
      border: `1px solid ${T.g200}`,
      ...(style || {}),
    }}>
      {children}
    </div>
  );
}

export function Label({ children }) {
  return (
    <div style={{
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 6,
      borderLeft: `3px solid ${T.amb}`,
      paddingLeft: 10,
    }}>
      {children}
    </div>
  );
}
