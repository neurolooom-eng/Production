import * as Lucide from 'lucide-react';

// Resolve an icon name from the registry to a Lucide component, with fallback.
export function Icon({ name, size = 18, className }: { name?: string; size?: number; className?: string }) {
  const Cmp = (name && (Lucide as any)[name]) || Lucide.Circle;
  return <Cmp size={size} className={className} />;
}
