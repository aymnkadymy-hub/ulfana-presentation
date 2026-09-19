"""Package the public presentation only; never publish local app data or credentials."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
out=root/'_site'
if out.exists(): shutil.rmtree(out)
out.mkdir()
for name in ['index.html','slides.css','slides.js']:
 shutil.copy2(root/name,out/name)
for name in ['fonts','companions']:
 dst=out/'assets'/name;dst.mkdir(parents=True,exist_ok=True)
 for p in (root/'assets'/name).iterdir():
  if p.is_file() and p.suffix in {'.woff2','.css','.md','.txt','.svg','.png','.webp'}:shutil.copy2(p,dst/p.name)
for name in ['logo.png','logo.svg','social-card.svg']:
 p=root/'assets'/name
 if p.exists():shutil.copy2(p,out/'assets'/name)
shutil.copytree(root/'data',out/'data')
(out/'investor').mkdir()
shutil.copy2(root/'investor'/'index.html',out/'investor'/'index.html')
(out/'.nojekyll').touch()
print(f'Packaged {len(list(out.rglob("*")))} entries; {sum(p.stat().st_size for p in out.rglob("*") if p.is_file()):,} bytes')
