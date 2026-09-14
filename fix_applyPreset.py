import re
files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    old = "function applyPortfolioPreset() {\n    setPortfolio($('portfolioPreset').value);\n  }"
    new = "function applyPortfolioPreset() {\n    const preset = $('portfolioPreset').value;\n    const chip = Array.from(document.querySelectorAll('.port-chip')).find(el => el.getAttribute('onclick').includes(preset));\n    setPortfolio(preset, chip);\n  }"
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("applyPreset fixed!")
