files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(
        "const houseStockAddon = downsizingCashToStock + extraMortgageStock;",
        "const houseStockAddon = (R.downsizingCashToStock || 0) + (R.extraMortgageStock || 0);"
    )

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed houseStockAddon in both files!")
