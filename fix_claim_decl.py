files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

old_top = """    // 2. 勞保起領年齡法規限制：60 ～ 70 歲，且不得早於退休退保年齡
    const claim = n('claimAge');
    if (claim < 60) {
      $('claimAge').value = 60;
    } else if (claim > 70) {
      $('claimAge').value = 70;
    }
    if (n('claimAge') < n('retireAge')) {
      $('claimAge').value = $('retireAge').value;
      $('claimAge').style.transition = 'background-color 0.3s';
      $('claimAge').style.backgroundColor = '#FFE5E5';
      setTimeout(() => $('claimAge').style.backgroundColor = '', 600);
    }"""

new_top = """    // 2. 勞保起領年齡法規限制：60 ～ 70 歲，且不得早於退休退保年齡
    let rawClaim = n('claimAge');
    if (rawClaim < 60) {
      $('claimAge').value = 60;
    } else if (rawClaim > 70) {
      $('claimAge').value = 70;
    }
    if (n('claimAge') < n('retireAge')) {
      $('claimAge').value = $('retireAge').value;
      $('claimAge').style.transition = 'background-color 0.3s';
      $('claimAge').style.backgroundColor = '#FFE5E5';
      setTimeout(() => $('claimAge').style.backgroundColor = '', 600);
    }"""

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(old_top, new_top)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed claim redeclaration!")
