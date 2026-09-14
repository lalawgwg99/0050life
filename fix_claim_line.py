files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(
        "    const retire = n('retireAge');\n    const claim = n('claimAge');",
        "    const retire = n('retireAge');\n    claim = n('claimAge');"
    )

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Line 2896 fixed!")
