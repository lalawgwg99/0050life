import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

old_init = """  if (!loadStateFromLocal()) {
    applyPreset();
  } else {
    togglePledgeFields();
    syncFromBirthYear();
    calculate(true);
  }"""

new_init = """  if (!loadStateFromLocal()) {
    applyPreset();
  } else {
    if ($('withdrawalMode')) setWithdrawalMode($('withdrawalMode').value);
    if ($('pensionMode')) setPensionMode($('pensionMode').value);
    togglePledgeFields();
    syncFromBirthYear();
    calculate(true);
  }"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(old_init, new_init)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Loading bug fixed!")
