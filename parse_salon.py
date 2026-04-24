import sys, json
data = json.load(sys.stdin)
salon = data.get('data', data)
print("=== TOP-LEVEL KEYS ===")
for k, v in salon.items():
    if isinstance(v, list):
        print(f"  {k}: list[{len(v)}]")
    elif isinstance(v, dict):
        print(f"  {k}: dict{list(v.keys())}")
    else:
        print(f"  {k}: {type(v).__name__} = {repr(v)[:80]}")

if salon.get('services'):
    print("\n=== FIRST SERVICE ===")
    print(json.dumps(salon['services'][0], indent=2))

if salon.get('workers'):
    print("\n=== FIRST WORKER ===")
    print(json.dumps(salon['workers'][0], indent=2))
