import json
with open('src/config/friends.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
checks = ['小鱼钓猫', '风起', '云峥博客（博创云途）', 'LsAng']
for d in data:
    if d['name'] in checks:
        rss = d.get('rss', '(none)')
        print(f'{d["name"]}: rss={rss}')
print(f'\nTotal: {len(data)} entries')
has_rss = sum(1 for d in data if d.get('rss'))
print(f'With RSS: {has_rss}')
print(f'Without RSS: {len(data) - has_rss}')
print('JSON valid, encoding OK')
