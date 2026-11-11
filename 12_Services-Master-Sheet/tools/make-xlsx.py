import json, sys, datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from openpyxl.utils import get_column_letter
d = json.load(sys.stdin)
wb = Workbook(); wb.remove(wb.active)
lists = wb.create_sheet('Lists')
for i, (k, vals) in enumerate(d['lists'].items(), 1):
    lists.cell(1, i, k).font = Font(bold=True)
    for j, v in enumerate(vals, 2): lists.cell(j, i, v)
lists.sheet_state = 'hidden'
listcol = {k: (get_column_letter(i), len(v)) for i, (k, v) in enumerate(d['lists'].items(), 1)}
STATUS = {'Requested': 'FEF3C7', 'Attempting': 'DBEAFE', 'Booked': 'D1FAE5', 'Not Booked': 'FEE2E2', 'Lucky Dip - Registered': 'EDE9FE', 'Lucky Dip - Selected': 'D1FAE5', 'Lucky Dip - Not Selected': 'FCE7F3', 'Payment Failed': 'FFEDD5', 'Cancelled': 'E5E7EB', 'Completed': 'CCFBF1'}
for i, s in enumerate(d['sheets']):
    ws = wb.create_sheet(s['name'], i)
    ws.sheet_properties.tabColor = s['color'].lstrip('#')
    fill = PatternFill('solid', fgColor=s['color'].lstrip('#'))
    for r, row in enumerate(s['rows'], 1):
        for c, v in enumerate(row, 1):
            cell = ws.cell(r, c, v if v != '' else None)
            if r == 1:
                cell.font = Font(bold=True, color='FFFFFF'); cell.fill = fill
                cell.alignment = Alignment(wrap_text=True, vertical='center')
            elif isinstance(v, str) and '\n' in v:
                cell.alignment = Alignment(wrap_text=True, vertical='top')
    ws.row_dimensions[1].height = 34
    ws.freeze_panes = 'A2'
    for c, col in enumerate(s['cols'], 1):
        L = get_column_letter(c)
        ws.column_dimensions[L].width = max(10, col['width'] / 7)
        rng = f'{L}2:{L}1000'
        fmt = {'date': 'DD/MM/YYYY', 'datetime': 'DD/MM/YYYY HH:MM', 'money': '"₹"#,##0', 'number': '0', 'text': '@'}[col['type']]
        for r in range(2, 201):
            if ws.cell(r, c).value is None or col['type'] == 'text': ws.cell(r, c).number_format = fmt
        if col['list']:
            lc, n = listcol[col['list']]
            dv = DataValidation(type='list', formula1=f"=Lists!${lc}$2:${lc}${n+1}", allow_blank=True)
            dv.error = 'Pick from the list'; ws.add_data_validation(dv); dv.add(rng)
        if s['name'] == 'Bookings' and col['key'] == 'status':
            for k, colr in STATUS.items():
                ws.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=[f'"{k}"'], fill=PatternFill('solid', fgColor=colr), font=Font(bold=True)))
wb.save(sys.argv[1])
print('saved', sys.argv[1])
