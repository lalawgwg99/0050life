files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add const swr at the top
    content = content.replace(
        "const monthsToRetire = Math.round(Math.max(0, retire - age) * 12);",
        "const monthsToRetire = Math.round(Math.max(0, retire - age) * 12);\n    const swr = n('withdrawRate') / 100;"
    )

    # 2. Remove downstream duplicate declaration
    content = content.replace(
        "    const shortfall = R.assetShortfall;\n    const readiness = R.readinessRate / 100;\n    const swr = n('withdrawRate') / 100;",
        "    const shortfall = R.assetShortfall;\n    const readiness = R.readinessRate / 100;"
    )

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Scope of swr fixed in both files!")
