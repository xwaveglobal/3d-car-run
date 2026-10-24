import numpy as np, cv2
from PIL import Image
D='/tmp/claude-0/-home-claude/39d56846-bb15-5fba-a835-90ad1574d4e2/scratchpad/h3'
rgb=np.array(Image.open(f'{D}/art.png').convert('RGB'))
img=cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR)
H,W=img.shape[:2]
def shape(k):
    m=np.zeros((H,W),np.uint8)
    if k=='profile':
        cv2.circle(m,(94,104),66,255,-1)
        cv2.fillPoly(m,[np.array([[120,52],[440,50],[462,100],[445,158],[120,160]],np.int32)],255)
        cv2.rectangle(m,(50,132),(134,172),255,-1)
    elif k=='currency':
        cv2.fillPoly(m,[np.array([[500,68],[712,68],[727,96],[726,124],[712,149],[497,149],[483,124],[483,92]],np.int32)],255)
    elif k=='gear': cv2.rectangle(m,(738,62),(829,153),255,-1)
    elif k=='menu': cv2.rectangle(m,(836,62),(929,153),255,-1)
    return m
for k in ['profile','currency','gear','menu']:
    s=shape(k)
    gc=np.full((H,W),cv2.GC_BGD,np.uint8)
    gc[cv2.dilate(s,np.ones((25,25),np.uint8))>0]=cv2.GC_PR_BGD
    gc[s>0]=cv2.GC_PR_FGD
    gc[cv2.erode(s,np.ones((15,15),np.uint8))>0]=cv2.GC_FGD
    ys,xs=np.where(cv2.dilate(s,np.ones((31,31),np.uint8))>0)
    x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    sub=gc[y0:y1,x0:x1].copy()
    bg=np.zeros((1,65)); fg=np.zeros((1,65))
    cv2.grabCut(np.ascontiguousarray(img[y0:y1,x0:x1]),sub,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
    mm=np.where((sub==1)|(sub==3),255,0).astype(np.uint8)
    n,lab,st,_=cv2.connectedComponentsWithStats(mm,8)
    big=1+np.argmax(st[1:,4]); mm=np.where(lab==big,255,0).astype(np.uint8)
    cnts,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    mm=np.zeros_like(mm); cv2.drawContours(mm,cnts,-1,255,-1)
    mm=cv2.GaussianBlur(mm,(3,3),0)
    crop=np.dstack([rgb[y0:y1,x0:x1],mm])
    bb=cv2.boundingRect((mm>8).astype(np.uint8))
    crop=crop[bb[1]:bb[1]+bb[3],bb[0]:bb[0]+bb[2]]
    Image.fromarray(crop).save(f'{D}/raw-{k}.png')
    print(k,'art box',x0+bb[0],y0+bb[1],bb[2],bb[3])
