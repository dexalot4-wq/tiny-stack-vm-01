import{mkdirSync as m,readdirSync as r,readFileSync as f,writeFileSync as w}from'node:fs';
import{join as j}from'node:path';
const A=process.env.MAKEFUN_INPUT_DIR??'/input',B=process.env.MAKEFUN_OUTPUT_DIR??'/output';
const P=new Uint8Array(256),Q=new Uint8Array(256),I=new Uint8Array(256),K=new Uint8Array(256),O='0001020304050607101112131415161718191a1b1c1d1e2021223031323334404150515253',T='000011014100120220230330210210210210210210210110210210210110210210210210210210002102102002000110200100100010100';
for(let i=0;i<37;i++){const x=parseInt(O.slice(i+i,i+i+2),16);P[x]=+T[i*3];Q[x]=+T[i*3+1];I[x]=+T[i*3+2];K[x]=1}
function R(p,q){
const S=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536);
let s=0,c=0,t=0,u=0,g=0,l=0;const n=p.length,D=e=>({o:o.slice(0,l),c:e});
for(;;){
if(u==1e6)return D(10);
if(t<0||t>=n)return D(9);
const x=p[t];
if(!K[x])return D(5);
const i=I[x];
if(t+i>=n)return D(9);
u++;
if(s<P[x])return D(2);
if(s-P[x]+Q[x]>256)return D(3);
const y=t+=1+i;
switch(x){
case 0:return D(0);
case 1:S[s++]=(p[y-1]<<24)>>24;break;
case 2:S[s++]=p[y-4]|(p[y-3]<<8)|(p[y-2]<<16)|(p[y-1]<<24);break;
case 3:s--;break;
case 4:S[s]=S[s-1];s++;break;
case 5:{[S[s-2],S[s-1]]=[S[s-1],S[s-2]];break}
case 6:S[s]=S[s-2];s++;break;
case 7:{[S[s-3],S[s-2],S[s-1]]=[S[s-2],S[s-1],S[s-3]];break}
case 23:S[s-1]=-S[s-1];break;
case 27:S[s-1]=~S[s-1];break;
case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
const b=S[s-1],a=S[s-2];let r;
if(x<23){if(x==16)r=a+b;else if(x==17)r=a-b;else if(x==18)r=Math.imul(a,b);else if(!b)return D(4);else if(x==19)r=a==-2147483648&&b==-1?a:a/b;else if(x==20)r=b==-1?0:a%b;else if(x==21)r=Math.floor((a>>>0)/(b>>>0));else r=(a>>>0)%(b>>>0)}
else if(x<31){if(x==24)r=a&b;else if(x==25)r=a|b;else if(x==26)r=a^b;else if(x==28)r=a<<(b&31);else if(x==29)r=a>>(b&31);else r=a>>>(b&31)}
else{if(x==32)r=a==b?1:0;else if(x==33)r=a<b?1:0;else r=(a>>>0)<(b>>>0)?1:0}
S[s-2]=r;s--;break}
case 48:case 49:case 50:{const e=((p[y-2]|(p[y-1]<<8))<<16)>>16;if(x==48)t=y+e;else{const v=S[--s];if((x==49)===(v===0))t=y+e}break}
case 51:if(c==64)return D(7);C[c++]=y;t=p[y-2]|(p[y-1]<<8);break;
case 52:if(!c)return D(8);t=C[--c];break;
case 64:{const a=S[s-1];if(a<0||a>255)return D(6);S[s-1]=M[a];break}
case 65:{const a=S[s-1],v=S[s-2];if(a<0||a>255)return D(6);s-=2;M[a]=v;break}
case 80:{const z=String(S[s-1]);if(l+z.length>65536)return D(11);s--;for(let i=0;i<z.length;i++)o[l++]=z.charCodeAt(i);break}
case 81:if(l+1>65536)return D(11);o[l++]=S[--s];break;
case 82:S[s++]=g<q.length?q[g++]:-1;break;
case 83:return D(S[--s]&255);
}
}
}
for(const id of r(A).sort()){const d=j(B,id);m(d,{recursive:true});try{const z=R(f(j(A,id,'program.bin')),f(j(A,id,'input.bin')));w(j(d,'stdout.bin'),z.o);w(j(d,'exit.txt'),z.c+'\n')}catch{w(j(d,'stdout.bin'),new Uint8Array(0));w(j(d,'exit.txt'),'0\n')}}
