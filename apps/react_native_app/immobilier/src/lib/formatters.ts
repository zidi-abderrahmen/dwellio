/** Format a number as TND price with thousands grouping. */
export function formatPrice(price: number): string {
  const formatted = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  })
    .format(price)
    .replace(/[\u00A0\u202F]/g, ' ');

  return `${formatted} TND`;
}

/** Compact relative time for chat list rows. */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('fr-TN', {
    day: 'numeric',
    month: 'short',
  });
}

/** Human-readable property type labels. */
export function propertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apartment: 'Apartment',
    house: 'House',
    villa: 'Villa',
    land: 'Land',
    office: 'Office',
    shop: 'Shop',
  };
  return labels[type] ?? type;
}