import numpy as np, cv2
from PIL import Image
# v1.0.2: builds the Home background (src/assets/images/home/home-bg.webp) from the owner's key art:
# removes the painted UI + car (top bar → sky, lower UI + car → dust), adds a 420 px sky extension on top.
#   python3 scripts/home/make-home-bg.py   (needs numpy, opencv-python, pillow)
import os
ROOT=os.path.join(os.path.dirname(__file__),'..','..')
SRC=os.path.join(ROOT,'assets-src','reference','home-v3.webp')
OUT=os.path.join(ROOT,'assets-src','home'); os.makedirs(OUT,exist_ok=True)
img=np.array(Image.open(SRC).convert('RGB')).astype(np.float32)
H,W=img.shape[:2]
out=img.copy()

# ---- 1) top bar → sky: fill only the cut-out shapes (the real painted sky stays everywhere else)
rng=np.random.default_rng(7)
def fbm(h,w,scales):
    acc=np.zeros((h,w),np.float32)
    for sx,sy,amp in scales:
        n=cv2.GaussianBlur(rng.normal(0,1,(h,w)).astype(np.float32),(0,0),sigmaX=sx,sigmaY=sy)
        acc+=n/(np.abs(n).max()+1e-6)*amp
    return acc
tm=np.zeros((H,W),np.uint8)
SP=os.path.join(ROOT,'assets-src','home','v3')
for k,(ox,oy) in {'profile':(25,40),'currency':(480,65),'gear':(736,61),'menu':(835,60)}.items():
    a_=np.array(Image.open(os.path.join(SP,f'raw-{k}.png')))[...,3]
    tm[oy:oy+a_.shape[0],ox:ox+a_.shape[1]]=np.maximum(tm[oy:oy+a_.shape[0],ox:ox+a_.shape[1]],(a_>8).astype(np.uint8)*255)
tm=cv2.dilate(tm,np.ones((9,9),np.uint8))
u8=out.clip(0,255).astype(np.uint8)
small=cv2.resize(u8,(W//4,H//4),interpolation=cv2.INTER_AREA)
ms=cv2.resize(tm,(W//4,H//4),interpolation=cv2.INTER_NEAREST)
coarse=cv2.resize(cv2.inpaint(small,ms,8,cv2.INPAINT_TELEA),(W,H),interpolation=cv2.INTER_CUBIC).astype(np.float32)
coarse=cv2.GaussianBlur(coarse,(0,0),6)
cl=fbm(H,W,[(30,9,1.0),(12,4,0.5)])
coarse+=np.clip(cl,0,None)[...,None]*np.array([34,28,22],np.float32)
tf=cv2.GaussianBlur(tm.astype(np.float32)/255,(0,0),4)[...,None]
out=out*(1-tf)+coarse*tf

# ---- 2) lower UI + the car → dust: low-frequency colour from a coarse inpaint + high-frequency dust grain
# v1.0.7: by default the painted car STAYS (the fill left a blurred patch around the 3D car); --no-car removes it
import sys
NO_CAR='--no-car' in sys.argv
m=np.zeros((H,W),np.uint8)
def rect(a,b,c,d): m[b:d,a:c]=255
pts=np.array([[190,1000],[215,955],[330,925],[470,895],[560,888],[650,915],[720,972],[755,1050],[762,1150],[738,1240],[640,1250],[560,1205],[420,1185],[300,1152],[200,1112],[184,1050]],np.int32)
if NO_CAR: cv2.fillPoly(m,[pts],255)
m=cv2.dilate(m,np.ones((31,31),np.uint8))
m=cv2.dilate(m,np.ones((11,11),np.uint8))
# never paint dust over the painted signs, their posts, PLAY or the bottom buttons (they are the buttons)
for (x0_,y0_,x1_,y1_) in [(18,1145,190,1345),(755,1145,930,1400),(160,1288,800,1475),(25,1482,925,1600)]:
    m[y0_:y1_,x0_:x1_]=0
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
# painted red dots on BONUS / ENTRY (live dots replace them): small inpaint from the wood around
dm=np.zeros((H,W),np.uint8)
for (cx,cy) in [(160,1168),(900,1168)]: cv2.circle(dm,(cx,cy),17,255,-1)
o8=out.clip(0,255).astype(np.uint8)
out=cv2.inpaint(np.ascontiguousarray(o8),dm,7,cv2.INPAINT_TELEA).astype(np.float32)
Image.fromarray(out.clip(0,255).astype(np.uint8)).save(f'{OUT}/clean.png')

# ---- 3) sky extension on top (tall phones: the art is width-fitted and bottom-aligned, this fills above it)
EXT=420
clean=out.clip(0,255).astype(np.float32)
c0=cv2.GaussianBlur(clean[0:6].mean(0)[None],(0,0),sigmaX=80)[0]
deep=np.array([44,104,186],np.float32)
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

Image.fromarray(full.clip(0,255).astype(np.uint8)).save(os.path.join(ROOT,'src','assets','images','home','home-bg.webp'),quality=72,method=6,sharp_yuv=True)
