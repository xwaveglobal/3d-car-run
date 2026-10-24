import numpy as np, cv2
from PIL import Image
# v1.0.2: builds the Home background (src/assets/images/home/home-bg.webp) from the owner's key art:
# removes the painted UI + car (top bar → sky, lower UI + car → dust), adds a 420 px sky extension on top.
#   python3 scripts/home/make-home-bg.py   (needs numpy, opencv-python, pillow)
import os
ROOT=os.path.join(os.path.dirname(__file__),'..','..')
SRC=os.path.join(ROOT,'assets-src','reference','home-v2.webp')
OUT=os.path.join(ROOT,'assets-src','home'); os.makedirs(OUT,exist_ok=True)
img=np.array(Image.open(SRC).convert('RGB')).astype(np.float32)
H,W=img.shape[:2]
out=img.copy()

# ---- 1) top bar → sky: smooth gradient between heavily blurred clean rows + soft cloud billows
y0,y1=0,190
def rowcol(r0,r1):
    row=img[r0:r1].mean(0)
    return cv2.GaussianBlur(row[None],(0,0),sigmaX=70)[0]
top=rowcol(0,10)
# the hat / horns reach this row in the middle: take the colour from the sky on both sides instead
L=img[192:200,0:90].mean((0,1)); R=img[192:200,820:941].mean((0,1))
xs=np.linspace(0,1,W)[:,None]
bot=L[None]*(1-xs)+R[None]*xs
t=(np.linspace(0,1,y1-y0)**1.1)[:,None,None]
sky=top[None]*(1-t)+bot[None]*t
rng=np.random.default_rng(7)
def fbm(h,w,scales):
    acc=np.zeros((h,w),np.float32)
    for sx,sy,amp in scales:
        n=cv2.GaussianBlur(rng.normal(0,1,(h,w)).astype(np.float32),(0,0),sigmaX=sx,sigmaY=sy)
        acc+=n/(np.abs(n).max()+1e-6)*amp
    return acc
cl=fbm(y1-y0,W,[(40,10,1.0),(16,5,0.5),(6,3,0.25)])
sky=sky+np.clip(cl,0,None)[...,None]*np.array([60,48,40],np.float32)-np.clip(-cl,0,None)[...,None]*np.array([8,10,14],np.float32)
fe=np.clip((y1-y0-1-np.arange(y1-y0))/14,0,1)[:,None]*np.ones((1,W))
# keep the logo (hat + horns) where it reaches into the band
lg=np.zeros((H,W),np.uint8)
cv2.fillPoly(lg,[np.array([[400,192],[412,158],[470,150],[560,157],[578,192]],np.int32),np.array([[185,192],[193,176],[214,179],[226,192]],np.int32)],255)
lg=cv2.GaussianBlur(lg.astype(np.float32)/255,(0,0),5)[y0:y1]
fe=(fe*(1-lg))[...,None]
out[y0:y1]=img[y0:y1]*(1-fe)+sky*fe

# ---- 2) lower UI + the car → dust: low-frequency colour from a coarse inpaint + high-frequency dust grain
m=np.zeros((H,W),np.uint8)
def rect(a,b,c,d): m[b:d,a:c]=255
pts=np.array([[150,1010],[170,975],[260,945],[330,900],[420,872],[560,868],[640,900],[700,955],[745,1000],[765,1080],[750,1170],[700,1235],[600,1240],[520,1210],[420,1180],[280,1150],[175,1110],[148,1060]],np.int32)
cv2.fillPoly(m,[pts],255)
m=cv2.dilate(m,np.ones((31,31),np.uint8))
rect(26,1158,192,1328); rect(752,1158,928,1310); rect(143,1258,808,1488)
rect(36,1494,320,1618); rect(338,1494,604,1618); rect(616,1494,908,1618)
m=cv2.dilate(m,np.ones((11,11),np.uint8))
u8=out.clip(0,255).astype(np.uint8)
small=cv2.resize(u8,(W//8,H//8),interpolation=cv2.INTER_AREA)
ms=cv2.resize(m,(W//8,H//8),interpolation=cv2.INTER_NEAREST)
fs=cv2.inpaint(small,ms,6,cv2.INPAINT_TELEA)
low=cv2.GaussianBlur(cv2.resize(fs,(W,H),interpolation=cv2.INTER_CUBIC).astype(np.float32),(0,0),12)
# dust: billowing clouds + pebbles (procedural, so nothing repeats)
bill=fbm(H,W,[(60,40,1.0),(22,16,0.6),(8,6,0.3)])
grain=bill[...,None]*np.array([34,26,18],np.float32)
specks=np.zeros((H,W),np.float32)
for _ in range(2600):
    x=int(rng.integers(0,W)); y=int(rng.integers(820,H)); r=float(rng.choice([1,1,1.5,2,2.5,3.5]))
    cv2.circle(specks,(x,y),int(max(1,r)),float(rng.uniform(0.4,1.0)),-1,lineType=cv2.LINE_AA)
specks=cv2.GaussianBlur(specks,(0,0),0.8)
grain=grain-specks[...,None]*np.array([95,75,55],np.float32)
fill=low+grain
mf=cv2.GaussianBlur(m.astype(np.float32)/255,(0,0),5)[...,None]
out=out*(1-mf)+fill*mf
Image.fromarray(out.clip(0,255).astype(np.uint8)).save(f'{OUT}/clean.png')

# ---- 3) sky extension on top (tall phones: the art is width-fitted and bottom-aligned, this fills above it)
EXT=420
clean=out.clip(0,255).astype(np.float32)
c0=cv2.GaussianBlur(clean[0:6].mean(0)[None],(0,0),sigmaX=80)[0]
deep=np.array([70,92,140],np.float32)
t=(np.linspace(1,0,EXT)**1.6)[:,None,None]
ext=c0[None]*(1-t)+deep[None,None]*t
cl=fbm(EXT,W,[(50,12,1.0),(18,6,0.5)])
ext=ext+np.clip(cl,0,None)[...,None]*np.array([40,36,34],np.float32)*(1-t*0.6)
B=60
mir=clean[0:B][::-1]
wb=(np.linspace(0,1,B)**1.5)[:,None,None]
ext[EXT-B:]=ext[EXT-B:]*(1-wb)+mir*wb
full=np.concatenate([ext,clean],0)
Image.fromarray(full.clip(0,255).astype(np.uint8)).save(f'{OUT}/home-bg.png')
print('ext',full.shape)

Image.fromarray(full.clip(0,255).astype(np.uint8)).save(os.path.join(ROOT,'src','assets','images','home','home-bg.webp'),quality=80,method=6)
