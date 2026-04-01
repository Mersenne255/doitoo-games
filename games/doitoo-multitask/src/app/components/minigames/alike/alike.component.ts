import { Component, ChangeDetectionStrategy, input, output, signal, OnInit, OnDestroy, inject, effect, ElementRef, AfterViewInit } from '@angular/core';
import { AlikeConfig, MinigameResult, Puzzle, ShapeCard, timeLimitForDifficulty } from '../../../models/game.models';
import { generatePuzzle } from '../../../utils/puzzle-generator.util';
import { computeCardPacking } from '../../../utils/card-packing.util';
import { GameService } from '../../../services/game.service';
const F:Record<string,string>={red:'#dc2626',blue:'#2563eb',green:'#16a34a',charcoal:'#374151'};
const FL:Record<string,string>={red:'#ef4444',blue:'#3b82f6',green:'#22c55e',charcoal:'#4b5563'};
const B:Record<string,string>={white:'#e2e8f0',gold:'#fbbf24',cyan:'#06b6d4',magenta:'#d946ef'};
@Component({selector:'app-alike',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
template:`
<div class="g" [class.ok]="solved()" [class.fail]="failed()">
<div class="tb"><div class="tf" [style.width.%]="tp()" [class.w]="tp()<25" [class.ok]="solved()"></div></div>
<div class="ct">@if(puzzle();as p){<div class="cr">
@for(card of p.cards;track $index){
<button class="cb" [style.width.px]="cs()" [style.height.px]="cs()" [class.correct]="solved()&&si()===$index" [class.incorrect]="failed()&&si()===$index" [class.answer]="failed()&&$index===p.answerIndex" (touchstart)="onTouch($event,$index)" (click)="pick($index)">
<svg viewBox="0 0 80 80" class="sv"><defs>
<linearGradient [attr.id]="gid($index)" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" [attr.stop-color]="fl(card,p)"/><stop offset="100%" [attr.stop-color]="fd(card,p)"/></linearGradient>
<filter [attr.id]="fid($index)" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
</defs>
@switch(card.shape){
@case('circle'){<circle cx="40" cy="40" r="26" [attr.fill]="fg(card,$index,p)" [attr.stroke]="bs(card,p)" stroke-width="5" [attr.filter]="ff($index)"/>}
@case('square'){<rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="fg(card,$index,p)" [attr.stroke]="bs(card,p)" stroke-width="5" [attr.filter]="ff($index)"/>}
@case('triangle'){<polygon points="40,8 70,66 10,66" [attr.fill]="fg(card,$index,p)" [attr.stroke]="bs(card,p)" stroke-width="5" stroke-linejoin="round" [attr.filter]="ff($index)"/>}
@case('diamond'){<polygon points="40,8 72,40 40,72 8,40" [attr.fill]="fg(card,$index,p)" [attr.stroke]="bs(card,p)" stroke-width="5" stroke-linejoin="round" [attr.filter]="ff($index)"/>}
@case('hexagon'){<polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="fg(card,$index,p)" [attr.stroke]="bs(card,p)" stroke-width="5" stroke-linejoin="round" [attr.filter]="ff($index)"/>}
@case('star'){<path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="fg(card,$index,p)" [attr.stroke]="bs(card,p)" stroke-width="4" stroke-linejoin="round" [attr.filter]="ff($index)"/>}
}
<text x="40" [attr.y]="card.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,0.95)" font-family="Inter,system-ui,sans-serif">{{lt(card,p)}}</text>
</svg></button>}
</div>}</div></div>`,
styles:[`
:host{display:flex;flex:1;min-height:0;overflow:hidden}
.g{display:flex;flex-direction:column;flex:1;border-radius:.5rem;overflow:hidden;position:relative;min-height:0;max-height:100%}
.g.ok{background:rgba(34,197,94,.08)}.g.fail{background:rgba(239,68,68,.1)}
.tb{height:6px;width:100%;background:rgba(255,255,255,.06);flex-shrink:0}
.tf{height:100%;background:#6366f1;transition:width .1s linear}.tf.w{background:#ef4444}.tf.ok{background:#22c55e}
.ct{display:flex;flex:1;min-height:0;overflow:hidden;padding:8px}
.cr{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;align-items:center;gap:8px;width:100%;height:100%}
.cb{flex:0 0 auto;background:transparent;border:none;border-radius:.5rem;cursor:pointer;padding:0;transition:transform .15s;outline:none;display:flex;align-items:center;justify-content:center}
.cb:hover{transform:scale(1.04)}.cb:active{transform:scale(.96)}
.cb.correct{border:3px solid #22c55e;box-shadow:0 0 12px rgba(34,197,94,.4)}
.cb.incorrect{border:3px solid #ef4444;box-shadow:0 0 12px rgba(239,68,68,.4)}
.cb.answer{border:3px solid #22c55e;box-shadow:0 0 12px rgba(34,197,94,.4)}
.sv{width:100%;height:100%}
`]})
export class AlikeComponent implements OnInit,OnDestroy,AfterViewInit{
  readonly config=input.required<AlikeConfig>();readonly active=input.required<boolean>();
  readonly slotIndex=input.required<number>();readonly completed=output<MinigameResult>();
  private readonly game=inject(GameService);private readonly el=inject(ElementRef);
  readonly puzzle=signal<Puzzle|null>(null);readonly si=signal<number|null>(null);
  readonly solved=signal(false);readonly failed=signal(false);
  readonly correctCount=signal(0);readonly totalCount=signal(0);
  readonly tp=signal(100);readonly cs=signal(80);
  private ms=0;private elapsed=0;private ti:any=null;private at:any=null;private done=false;private ro:ResizeObserver|null=null;
  selectedIndex=this.si;
  gid(i:number){return`a${this.slotIndex()}-${i}-g`}
  fid(i:number){return`a${this.slotIndex()}-${i}-s`}
  ff(i:number){return`url(#${this.fid(i)})`}
  fg(c:ShapeCard,i:number,p:Puzzle){return p.activeKeys.includes('shapeColor')?`url(#${this.gid(i)})`:'#6366f1'}
  bs(c:ShapeCard,p:Puzzle){return p.activeKeys.includes('borderColor')?(B[c.borderColor]||'#e2e8f0'):'transparent'}
  lt(c:ShapeCard,p:Puzzle){return p.activeKeys.includes('innerLetter')?c.innerLetter:''}
  fd(c:ShapeCard,p:Puzzle){return p.activeKeys.includes('shapeColor')?(F[c.shapeColor]||'#4f46e5'):'#6366f1'}
  fl(c:ShapeCard,p:Puzzle){return p.activeKeys.includes('shapeColor')?(FL[c.shapeColor]||'#6366f1'):'#6366f1'}
  private se=effect(()=>{const s=this.game.stage();if(s==='summary'&&!this.done){this.done=true;this.clr()}else if(s==='playing'&&this.done){this.rst();this.next()}});
  ngOnInit(){this.next()}
  ngAfterViewInit(){const e=(this.el.nativeElement as HTMLElement).querySelector('.cr');if(e){this.ro=new ResizeObserver(()=>this.lay());this.ro.observe(e)}setTimeout(()=>this.lay(),50)}
  ngOnDestroy(){this.clr();this.ro?.disconnect()}
  private lay(){const e=(this.el.nativeElement as HTMLElement).querySelector('.cr');if(!e)return;const n=this.puzzle()?.cards.length??3;this.cs.set(computeCardPacking(e.clientWidth,e.clientHeight,n,8,30,130).cardSize)}
  private next(){const p=generatePuzzle(this.game.currentDifficulty());this.puzzle.set(p);this.si.set(null);this.solved.set(false);this.timer();setTimeout(()=>this.lay(),0)}
  private timer(){this.clr();this.ms=timeLimitForDifficulty(this.game.currentDifficulty())*1000;this.elapsed=0;this.tp.set(100);this.ti=setInterval(()=>{this.elapsed+=50;this.tp.set(Math.max(0,100-this.elapsed/this.ms*100));if(this.elapsed>=this.ms){this.clr();this.end()}},50)}
  private clr(){if(this.ti){clearInterval(this.ti);this.ti=null}if(this.at){clearTimeout(this.at);this.at=null}}
  onTouch(e:TouchEvent,i:number){e.preventDefault();this.pick(i)}
  pick(i:number){if(this.done||this.solved()||this.failed()||this.si()!==null)return;this.si.set(i);const p=this.puzzle();if(!p)return;if(i===p.answerIndex){this.solved.set(true);this.correctCount.update(c=>c+1);this.totalCount.update(c=>c+1);this.clr();this.at=setTimeout(()=>this.next(),1000)}else this.end()}
  private end(){if(this.done)return;this.done=true;this.failed.set(true);this.totalCount.update(c=>c+1);this.clr();const t=this.totalCount();this.completed.emit({slotIndex:this.slotIndex(),score:this.correctCount(),total:t,maxDifficulty:this.game.currentDifficulty(),details:{correct:this.correctCount(),incorrect:t-this.correctCount(),timedOut:0}})}
  private rst(){this.clr();this.done=false;this.puzzle.set(null);this.si.set(null);this.solved.set(false);this.failed.set(false);this.correctCount.set(0);this.totalCount.set(0);this.tp.set(100)}
}
