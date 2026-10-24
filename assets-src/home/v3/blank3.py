import numpy as np, cv2, sys
from PIL import Image
sys.path.insert(0,'/home/claude/3d-car-run/scripts/home')
D='/tmp/claude-0/-home-claude/39d56846-bb15-5fba-a835-90ad1574d4e2/scratchpad/h3'
exec(open('/home/claude/3d-car-run/scripts/home/blank.py').read().split('# profile bar')[0])  # tile_fill + inpaint helpers
p=np.array(Image.open(f'{D}/raw-profile.png'))
tile_fill(p,145,362,26,120,362,392,6)
inpaint(p,(38,104,98,132),7)
Image.fromarray(p).save(f'{D}/profile.png')
c=np.array(Image.open(f'{D}/raw-currency.png'))
tile_fill(c,72,172,20,70,170,179,5)
Image.fromarray(c).save(f'{D}/currency.png')
# menu: remove the red dot (top-right) by mirroring the top-left corner, then inpaint specks
m=np.array(Image.open(f'{D}/raw-menu.png')).astype(float)
H,W=m.shape[:2]
x0,y1=W-36,36
src=m[0:y1,0:W-x0][:, ::-1]
reg=m[0:y1,x0:W]
hh,ww=reg.shape[:2]; yy,xx=np.mgrid[0:hh,0:ww]
wg=np.clip(np.minimum(xx/4,(hh-1-yy)/4),0,1)[...,None]
m[0:y1,x0:W]=reg*(1-wg)+src*wg
m=m.clip(0,255).astype(np.uint8)
r,g,b=[m[...,i].astype(int) for i in range(3)]
sp=((r>150)&(g<80)&(b<80)&(m[...,3]>40)).astype(np.uint8); sp[:, :W//2]=0; sp[H//2:,:]=0
m[...,:3]=cv2.inpaint(np.ascontiguousarray(m[...,:3]),cv2.dilate(sp,np.ones((5,5),np.uint8)),4,cv2.INPAINT_TELEA)
Image.fromarray(m).save(f'{D}/menu.png')
Image.open(f'{D}/raw-gear.png').save(f'{D}/gear.png')
print('ok')
