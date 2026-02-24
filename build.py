#!/usr/bin/env python3
"""Build script: replaces <!-- @include name --> markers with include file contents.
Run by Netlify before deploying. Can also be run locally to preview the built site."""
import os
import glob

INCLUDES_DIR = '_includes'

def load_includes():
    """Load all include files from _includes/ directory."""
    includes = {}
    for filepath in glob.glob(os.path.join(INCLUDES_DIR, '*.html')):
        name = os.path.splitext(os.path.basename(filepath))[0]
        with open(filepath, 'r', encoding='utf-8') as f:
            includes[name] = f.read()
    return includes

def process_file(filepath, includes):
    """Replace <!-- @include name --> markers with actual content."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if '<!-- @include ' not in content:
        return False

    original = content
    for name, replacement in includes.items():
        marker = f'<!-- @include {name} -->'
        if marker in content:
            content = content.replace(marker, replacement)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    includes = load_includes()
    print(f'Loaded {len(includes)} includes: {", ".join(sorted(includes.keys()))}')

    count = 0
    patterns = ['*.html', 'pages/**/*.html']
    for pattern in patterns:
        for filepath in sorted(glob.glob(pattern, recursive=True)):
            if filepath.startswith('_includes'):
                continue
            if process_file(filepath, includes):
                print(f'  Built: {filepath}')
                count += 1

    print(f'\nProcessed {count} files.')

if __name__ == '__main__':
    main()
