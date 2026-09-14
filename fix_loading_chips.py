import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find where setWithdrawalMode is called on load
    search_str = "if ($('withdrawalMode')) setWithdrawalMode($('withdrawalMode').value);"
    replace_str = search_str + "\n    if ($('portfolioPreset')) {\n      const preset = $('portfolioPreset').value;\n      const chip = Array.from(document.querySelectorAll('.port-chip')).find(el => el.getAttribute('onclick').includes(preset));\n      setPortfolio(preset, chip);\n    }"
    
    if "const preset = $('portfolioPreset').value;" not in content:
        content = content.replace(search_str, replace_str)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Loading chips fixed!")
