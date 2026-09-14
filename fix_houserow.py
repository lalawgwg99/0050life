import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will search for partTimeRow block
    search_str = "    const partTimeRow = R.nominalPartTime > 0\n      ? '<div class=\"cashflow-row\"><span class=\"cashflow-row-name\">微型兼職收入</span><span class=\"cashflow-row-val\" style=\"color:var(--system-green-dark);\">+' + fmtMoney(R.nominalPartTime) + '／月</span></div>'\n      : '';"
    
    replace_str = search_str + "\n\n    const houseRow = R.monthlyReverseMortgage > 0\n      ? '<div class=\"cashflow-row\"><span class=\"cashflow-row-name\">房產：以房養老</span><span class=\"cashflow-row-val\" style=\"color:var(--system-green-dark); font-weight:700;\">+' + fmtMoney(R.monthlyReverseMortgage) + '／月</span></div>'\n      : '';"
    
    content = content.replace(search_str, replace_str)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("houseRow fixed successfully!")
