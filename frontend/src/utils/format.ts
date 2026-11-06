export const fmt = (n: number | string | null | undefined): string => {
  const v = Number(n ?? 0);
  return `KSh ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
};

export const fmtNum = (n: number | string): string =>
  Number(n ?? 0).toLocaleString('en-KE');

export const fmtDate = (d: string | Date | null | undefined): string => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (d: string | Date | null | undefined): string => {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const todayISO = (): string => new Date().toISOString().split('T')[0];
