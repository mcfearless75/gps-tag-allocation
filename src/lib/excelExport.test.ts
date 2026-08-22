import { describe, it, expect, vi } from 'vitest';

const aoaToSheetMock = vi.hoisted(() => vi.fn().mockReturnValue({ sheet: true }));
const bookNewMock = vi.hoisted(() => vi.fn().mockReturnValue({ book: true }));
const bookAppendSheetMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: aoaToSheetMock,
    book_new: bookNewMock,
    book_append_sheet: bookAppendSheetMock,
  },
  writeFile: writeFileMock,
}));

import { downloadWorkbook } from './excelExport';

describe('downloadWorkbook', () => {
  it('builds a workbook from headers and rows and writes it to the given filename', () => {
    downloadWorkbook('report.xlsx', ['A', 'B'], [[1, 2], [3, 4]]);

    expect(aoaToSheetMock).toHaveBeenCalledWith([['A', 'B'], [1, 2], [3, 4]]);
    expect(bookAppendSheetMock).toHaveBeenCalledWith({ book: true }, { sheet: true }, 'Allocations');
    expect(writeFileMock).toHaveBeenCalledWith({ book: true }, 'report.xlsx');
  });
});
