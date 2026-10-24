# v1.0.2 Home sprites from assets-src/reference/ui-kit-sheet.webp (cut per component, see docs/carrun-v1/HOME-V2.md).
# Run inside a folder holding sprite-<name>.png crops: dedot.py removes the baked red dots, blank.py blanks text.
import numpy as np, sys
from PIL import Image
# (x0, y1) of the top-right patch that replaces the baked red dot with the mirrored top-left corner
patch={'menu':(88,48),'garage':(207,41),'entry':(198,66),'bonus':(186,62)}
for k,(x0,y1) in patch.items():
    a=np.array(Image.open(f'sprite-{k}.png')).astype(float)
    H,W=a.shape[:2]
    src=a[0:y1, 0:W-x0][:, ::-1]
    reg=a[0:y1, x0:W]
    hh,ww=reg.shape[:2]
    yy,xx=np.mgrid[0:hh,0:ww]
    f=4.0
    wgt=np.clip(np.minimum(xx/f, (hh-1-yy)/f),0,1)[...,None]
    out=reg*(1-wgt)+src*wgt
    a[0:y1,x0:W]=out
    Image.fromarray(a.clip(0,255).astype(np.uint8)).save(f'clean-{k}.png')
# leftover red glow specks in the top-right quarter → inpaint from the surrounding wood
import cv2
for k in patch:
    a=np.array(Image.open(f'clean-{k}.png'))
    H,W=a.shape[:2]
    r,g,b,al=[a[...,i].astype(int) for i in range(4)]
    m=((r>150)&(g<75)&(b<75)&(r>g*2.6)&(al>60)).astype(np.uint8)
    zone=np.zeros_like(m); zone[0:patch[k][1]+22, patch[k][0]-12:]=1; m*=zone
    m=cv2.dilate(m,np.ones((5,5),np.uint8))
    rgb=cv2.inpaint(np.ascontiguousarray(a[...,:3]),m,5,cv2.INPAINT_TELEA)
    a[...,:3]=rgb
    Image.fromarray(a).save(f'clean-{k}.png')
    print(k,'specks',int(m.sum()))
