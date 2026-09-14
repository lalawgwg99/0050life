files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add alias right after saveStateToLocal definition
    search_target = "function saveStateToLocal() {"
    replace_target = "function saveStateToLocal() {\n    // alias\n  }\n  function saveLocalState() { saveStateToLocal(); }\n  function _unused_"
    
    # Better yet, search for function saveStateToLocal() { ... }
    content = content.replace(
        "function saveStateToLocal() {\n    try {",
        "function saveStateToLocal() {\n    try {\n      const saveLocalState = saveStateToLocal;"
    )
    
    # Also define saveLocalState globally right next to saveStateToLocal
    content = content.replace(
        "function saveStateToLocal() {",
        "function saveLocalState() { saveStateToLocal(); }\n  function saveStateToLocal() {"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("saveLocalState function alias injected successfully!")
