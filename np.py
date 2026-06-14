import sys
import os
from datetime import datetime

POSTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'content', 'posts')

def sanitize_filename(name):
    name = name.strip().replace(' ', '-')
    name = ''.join(c for c in name if c not in r'<>:"/\|?*')
    return name if name else 'untitled'

def main():
    if len(sys.argv) < 2:
        print("Usage: np <post-title>")
        sys.exit(1)

    title = ' '.join(sys.argv[1:])
    filename = sanitize_filename(title) + '.md'
    filepath = os.path.join(POSTS_DIR, filename)

    if os.path.exists(filepath):
        print(f"Error: {filename} already exists")
        sys.exit(1)

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    frontmatter = f"""---
title: "{title}"
published: {now}
description: ""
tags: []
category: ""
---
"""

    os.makedirs(POSTS_DIR, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(frontmatter)

    print(f"Created: {filepath}")

if __name__ == '__main__':
    main()
