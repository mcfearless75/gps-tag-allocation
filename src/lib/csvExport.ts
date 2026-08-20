export function buildCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escapeCell = (cell: string | number | null): string => {
    const text = cell === null || cell === undefined ? '' : String(cell);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return lines.join('\n');
}
