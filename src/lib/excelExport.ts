import * as XLSX from 'xlsx';

export function downloadWorkbook(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][]
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Allocations');
  XLSX.writeFile(workbook, filename);
}
