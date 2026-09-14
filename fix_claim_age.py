import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

# We will inject a validation inside calculate()
old_calc = """  function calculate(isSettingBaseline = false) {
    const age = n('currentAge');"""

new_calc = """  function calculate(isSettingBaseline = false) {
    // 防呆：勞保必須「退保」才能起領，因此起領年齡不得低於停止工作(退保)年齡
    if (n('claimAge') < n('retireAge')) {
      $('claimAge').value = $('retireAge').value;
      // 可以在這裡加入閃爍動畫提示使用者
      $('claimAge').style.transition = 'background-color 0.3s';
      $('claimAge').style.backgroundColor = '#FFE5E5';
      setTimeout(() => $('claimAge').style.backgroundColor = '', 600);
    }
    
    const age = n('currentAge');"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(old_calc, new_calc)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Age validation fixed!")
