import re

# File 1: blog/index.html
file1 = '/Users/jazzxx/Desktop/德人參/blog/index.html'
with open(file1, 'r', encoding='utf-8') as f:
    content1 = f.read()
content1 = content1.replace('怪老子精算評析', '財務精算評析')
content1 = content1.replace('怪老子年金現值', '財務學年金現值')
with open(file1, 'w', encoding='utf-8') as f:
    f.write(content1)

# File 2: blog/die-with-zero-vs-4percent.html
file2 = '/Users/jazzxx/Desktop/德人參/blog/die-with-zero-vs-4percent.html'
with open(file2, 'r', encoding='utf-8') as f:
    content2 = f.read()
content2 = content2.replace('怪老子年金現值', '財務學年金現值')
content2 = content2.replace('怪老子實質年金模型', '實質年金精算模型')
content2 = content2.replace('怪老子年金模型解析', '年金現值模型解析')
content2 = content2.replace('平滑享老（怪老子 PV 模型 / Die with Zero 死前花光）', '計畫提領（年金現值 PV 模型 / Die with Zero 死前花光）')
content2 = content2.replace('怪老子實質年金精算公式', '實質年金精算公式')
content2 = content2.replace('怪老子平滑消耗模型', '年金現值平滑消耗模型')
content2 = content2.replace('怪老子 NPER 反推', 'NPER 反推')
content2 = content2.replace('怪老子著名的', '財務學著名的')
with open(file2, 'w', encoding='utf-8') as f:
    f.write(content2)

# File 3: RetirementSimulatorView.swift
file3 = '/Users/jazzxx/Desktop/德人參/RetirementSimulatorView.swift'
with open(file3, 'r', encoding='utf-8') as f:
    content3 = f.read()
content3 = content3.replace('怪老子模型', '年金精算模型')
content3 = content3.replace('怪老子 NPER', '精算 NPER')
content3 = content3.replace('怪老子資產支援', '資產支援')
with open(file3, 'w', encoding='utf-8') as f:
    f.write(content3)

print("Jargon removed successfully.")
