(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(s){if(s.ep)return;s.ep=!0;const n=t(s);fetch(s.href,n)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const L=globalThis,W=L.ShadowRoot&&(L.ShadyCSS===void 0||L.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,J=Symbol(),Z=new WeakMap;let ae=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==J)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(W&&e===void 0){const i=t!==void 0&&t.length===1;i&&(e=Z.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&Z.set(t,e))}return e}toString(){return this.cssText}};const fe=r=>new ae(typeof r=="string"?r:r+"",void 0,J),le=(r,...e)=>{const t=r.length===1?r[0]:e.reduce((i,s,n)=>i+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+r[n+1],r[0]);return new ae(t,r,J)},$e=(r,e)=>{if(W)r.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const i=document.createElement("style"),s=L.litNonce;s!==void 0&&i.setAttribute("nonce",s),i.textContent=t.cssText,r.appendChild(i)}},Q=W?r=>r:r=>r instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return fe(t)})(r):r;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:me,defineProperty:ge,getOwnPropertyDescriptor:ye,getOwnPropertyNames:_e,getOwnPropertySymbols:be,getPrototypeOf:ve}=Object,g=globalThis,X=g.trustedTypes,Ae=X?X.emptyScript:"",D=g.reactiveElementPolyfillSupport,O=(r,e)=>r,V={toAttribute(r,e){switch(e){case Boolean:r=r?Ae:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,e){let t=r;switch(e){case Boolean:t=r!==null;break;case Number:t=r===null?null:Number(r);break;case Object:case Array:try{t=JSON.parse(r)}catch{t=null}}return t}},G=(r,e)=>!me(r,e),Y={attribute:!0,type:String,converter:V,reflect:!1,useDefault:!1,hasChanged:G};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),g.litPropertyMetadata??(g.litPropertyMetadata=new WeakMap);let E=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Y){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(e,i,t);s!==void 0&&ge(this.prototype,e,s)}}static getPropertyDescriptor(e,t,i){const{get:s,set:n}=ye(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:s,set(o){const l=s==null?void 0:s.call(this);n==null||n.call(this,o),this.requestUpdate(e,l,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Y}static _$Ei(){if(this.hasOwnProperty(O("elementProperties")))return;const e=ve(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(O("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(O("properties"))){const t=this.properties,i=[..._e(t),...be(t)];for(const s of i)this.createProperty(s,t[s])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[i,s]of t)this.elementProperties.set(i,s)}this._$Eh=new Map;for(const[t,i]of this.elementProperties){const s=this._$Eu(t,i);s!==void 0&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const s of i)t.unshift(Q(s))}else e!==void 0&&t.push(Q(e));return t}static _$Eu(e,t){const i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(t=>t(this))}addController(e){var t;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return $e(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(t=>{var i;return(i=t.hostConnected)==null?void 0:i.call(t)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(t=>{var i;return(i=t.hostDisconnected)==null?void 0:i.call(t)})}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){var n;const i=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,i);if(s!==void 0&&i.reflect===!0){const o=(((n=i.converter)==null?void 0:n.toAttribute)!==void 0?i.converter:V).toAttribute(t,i.type);this._$Em=e,o==null?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(e,t){var n,o;const i=this.constructor,s=i._$Eh.get(e);if(s!==void 0&&this._$Em!==s){const l=i.getPropertyOptions(s),a=typeof l.converter=="function"?{fromAttribute:l.converter}:((n=l.converter)==null?void 0:n.fromAttribute)!==void 0?l.converter:V;this._$Em=s,this[s]=a.fromAttribute(t,l.type)??((o=this._$Ej)==null?void 0:o.get(s))??null,this._$Em=null}}requestUpdate(e,t,i){var s;if(e!==void 0){const n=this.constructor,o=this[e];if(i??(i=n.getPropertyOptions(e)),!((i.hasChanged??G)(o,t)||i.useDefault&&i.reflect&&o===((s=this._$Ej)==null?void 0:s.get(e))&&!this.hasAttribute(n._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:s,wrapped:n},o){i&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,o??t??this[e]),n!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),s===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var i;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[n,o]of this._$Ep)this[n]=o;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[n,o]of s){const{wrapped:l}=o,a=this[n];l!==!0||this._$AL.has(n)||a===void 0||this.C(n,void 0,o,a)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),(i=this._$EO)==null||i.forEach(s=>{var n;return(n=s.hostUpdate)==null?void 0:n.call(s)}),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(i=>{var s;return(s=i.hostUpdated)==null?void 0:s.call(i)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(t=>this._$ET(t,this[t]))),this._$EM()}updated(e){}firstUpdated(e){}};E.elementStyles=[],E.shadowRootOptions={mode:"open"},E[O("elementProperties")]=new Map,E[O("finalized")]=new Map,D==null||D({ReactiveElement:E}),(g.reactiveElementVersions??(g.reactiveElementVersions=[])).push("2.1.0");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const M=globalThis,j=M.trustedTypes,ee=j?j.createPolicy("lit-html",{createHTML:r=>r}):void 0,he="$lit$",m=`lit$${Math.random().toFixed(9).slice(2)}$`,ce="?"+m,Ee=`<${ce}>`,A=document,U=()=>A.createComment(""),N=r=>r===null||typeof r!="object"&&typeof r!="function",F=Array.isArray,Se=r=>F(r)||typeof(r==null?void 0:r[Symbol.iterator])=="function",q=`[ 	
\f\r]`,x=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,te=/-->/g,se=/>/g,_=RegExp(`>|${q}(?:([^\\s"'>=/]+)(${q}*=${q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ie=/'/g,re=/"/g,de=/^(?:script|style|textarea|title)$/i,we=r=>(e,...t)=>({_$litType$:r,strings:e,values:t}),$=we(1),w=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),ne=new WeakMap,b=A.createTreeWalker(A,129);function ue(r,e){if(!F(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return ee!==void 0?ee.createHTML(e):e}const Ce=(r,e)=>{const t=r.length-1,i=[];let s,n=e===2?"<svg>":e===3?"<math>":"",o=x;for(let l=0;l<t;l++){const a=r[l];let c,u,h=-1,p=0;for(;p<a.length&&(o.lastIndex=p,u=o.exec(a),u!==null);)p=o.lastIndex,o===x?u[1]==="!--"?o=te:u[1]!==void 0?o=se:u[2]!==void 0?(de.test(u[2])&&(s=RegExp("</"+u[2],"g")),o=_):u[3]!==void 0&&(o=_):o===_?u[0]===">"?(o=s??x,h=-1):u[1]===void 0?h=-2:(h=o.lastIndex-u[2].length,c=u[1],o=u[3]===void 0?_:u[3]==='"'?re:ie):o===re||o===ie?o=_:o===te||o===se?o=x:(o=_,s=void 0);const f=o===_&&r[l+1].startsWith("/>")?" ":"";n+=o===x?a+Ee:h>=0?(i.push(c),a.slice(0,h)+he+a.slice(h)+m+f):a+m+(h===-2?l:f)}return[ue(r,n+(r[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),i]};class k{constructor({strings:e,_$litType$:t},i){let s;this.parts=[];let n=0,o=0;const l=e.length-1,a=this.parts,[c,u]=Ce(e,t);if(this.el=k.createElement(c,i),b.currentNode=this.el.content,t===2||t===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(s=b.nextNode())!==null&&a.length<l;){if(s.nodeType===1){if(s.hasAttributes())for(const h of s.getAttributeNames())if(h.endsWith(he)){const p=u[o++],f=s.getAttribute(h).split(m),R=/([.?@])?(.*)/.exec(p);a.push({type:1,index:n,name:R[2],strings:f,ctor:R[1]==="."?xe:R[1]==="?"?Oe:R[1]==="@"?Me:I}),s.removeAttribute(h)}else h.startsWith(m)&&(a.push({type:6,index:n}),s.removeAttribute(h));if(de.test(s.tagName)){const h=s.textContent.split(m),p=h.length-1;if(p>0){s.textContent=j?j.emptyScript:"";for(let f=0;f<p;f++)s.append(h[f],U()),b.nextNode(),a.push({type:2,index:++n});s.append(h[p],U())}}}else if(s.nodeType===8)if(s.data===ce)a.push({type:2,index:n});else{let h=-1;for(;(h=s.data.indexOf(m,h+1))!==-1;)a.push({type:7,index:n}),h+=m.length-1}n++}}static createElement(e,t){const i=A.createElement("template");return i.innerHTML=e,i}}function C(r,e,t=r,i){var o,l;if(e===w)return e;let s=i!==void 0?(o=t._$Co)==null?void 0:o[i]:t._$Cl;const n=N(e)?void 0:e._$litDirective$;return(s==null?void 0:s.constructor)!==n&&((l=s==null?void 0:s._$AO)==null||l.call(s,!1),n===void 0?s=void 0:(s=new n(r),s._$AT(r,t,i)),i!==void 0?(t._$Co??(t._$Co=[]))[i]=s:t._$Cl=s),s!==void 0&&(e=C(r,s._$AS(r,e.values),s,i)),e}class Pe{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,s=((e==null?void 0:e.creationScope)??A).importNode(t,!0);b.currentNode=s;let n=b.nextNode(),o=0,l=0,a=i[0];for(;a!==void 0;){if(o===a.index){let c;a.type===2?c=new T(n,n.nextSibling,this,e):a.type===1?c=new a.ctor(n,a.name,a.strings,this,e):a.type===6&&(c=new Ue(n,this,e)),this._$AV.push(c),a=i[++l]}o!==(a==null?void 0:a.index)&&(n=b.nextNode(),o++)}return b.currentNode=A,s}p(e){let t=0;for(const i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class T{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,t,i,s){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=s,this._$Cv=(s==null?void 0:s.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=C(this,e,t),N(e)?e===d||e==null||e===""?(this._$AH!==d&&this._$AR(),this._$AH=d):e!==this._$AH&&e!==w&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Se(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==d&&N(this._$AH)?this._$AA.nextSibling.data=e:this.T(A.createTextNode(e)),this._$AH=e}$(e){var n;const{values:t,_$litType$:i}=e,s=typeof i=="number"?this._$AC(e):(i.el===void 0&&(i.el=k.createElement(ue(i.h,i.h[0]),this.options)),i);if(((n=this._$AH)==null?void 0:n._$AD)===s)this._$AH.p(t);else{const o=new Pe(s,this),l=o.u(this.options);o.p(t),this.T(l),this._$AH=o}}_$AC(e){let t=ne.get(e.strings);return t===void 0&&ne.set(e.strings,t=new k(e)),t}k(e){F(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,s=0;for(const n of e)s===t.length?t.push(i=new T(this.O(U()),this.O(U()),this,this.options)):i=t[s],i._$AI(n),s++;s<t.length&&(this._$AR(i&&i._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){var i;for((i=this._$AP)==null?void 0:i.call(this,!1,!0,t);e&&e!==this._$AB;){const s=e.nextSibling;e.remove(),e=s}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}}class I{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,s,n){this.type=1,this._$AH=d,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=n,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=d}_$AI(e,t=this,i,s){const n=this.strings;let o=!1;if(n===void 0)e=C(this,e,t,0),o=!N(e)||e!==this._$AH&&e!==w,o&&(this._$AH=e);else{const l=e;let a,c;for(e=n[0],a=0;a<n.length-1;a++)c=C(this,l[i+a],t,a),c===w&&(c=this._$AH[a]),o||(o=!N(c)||c!==this._$AH[a]),c===d?e=d:e!==d&&(e+=(c??"")+n[a+1]),this._$AH[a]=c}o&&!s&&this.j(e)}j(e){e===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class xe extends I{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===d?void 0:e}}class Oe extends I{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==d)}}class Me extends I{constructor(e,t,i,s,n){super(e,t,i,s,n),this.type=5}_$AI(e,t=this){if((e=C(this,e,t,0)??d)===w)return;const i=this._$AH,s=e===d&&i!==d||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,n=e!==d&&(i===d||s);s&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t;typeof this._$AH=="function"?this._$AH.call(((t=this.options)==null?void 0:t.host)??this.element,e):this._$AH.handleEvent(e)}}class Ue{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){C(this,e)}}const z=M.litHtmlPolyfillSupport;z==null||z(k,T),(M.litHtmlVersions??(M.litHtmlVersions=[])).push("3.3.0");const Ne=(r,e,t)=>{const i=(t==null?void 0:t.renderBefore)??e;let s=i._$litPart$;if(s===void 0){const n=(t==null?void 0:t.renderBefore)??null;i._$litPart$=s=new T(e.insertBefore(U(),n),n,void 0,t??{})}return s._$AI(r),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const v=globalThis;class S extends E{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t;const e=super.createRenderRoot();return(t=this.renderOptions).renderBefore??(t.renderBefore=e.firstChild),e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Ne(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return w}}var oe;S._$litElement$=!0,S.finalized=!0,(oe=v.litElementHydrateSupport)==null||oe.call(v,{LitElement:S});const B=v.litElementPolyfillSupport;B==null||B({LitElement:S});(v.litElementVersions??(v.litElementVersions=[])).push("4.2.0");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const pe=r=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(r,e)}):customElements.define(r,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ke={attribute:!0,type:String,converter:V,reflect:!1,hasChanged:G},Te=(r=ke,e,t)=>{const{kind:i,metadata:s}=t;let n=globalThis.litPropertyMetadata.get(s);if(n===void 0&&globalThis.litPropertyMetadata.set(s,n=new Map),i==="setter"&&((r=Object.create(r)).wrapped=!0),n.set(t.name,r),i==="accessor"){const{name:o}=t;return{set(l){const a=e.get.call(this);e.set.call(this,l),this.requestUpdate(o,a,r)},init(l){return l!==void 0&&this.C(o,void 0,r,l),l}}}if(i==="setter"){const{name:o}=t;return function(l){const a=this[o];e.call(this,l),this.requestUpdate(o,a,r)}}throw Error("Unsupported decorator location: "+i)};function He(r){return(e,t)=>typeof t=="object"?Te(r,e,t):((i,s,n)=>{const o=s.hasOwnProperty(n);return s.constructor.createProperty(n,i),o?Object.getOwnPropertyDescriptor(s,n):void 0})(r,e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function H(r){return He({...r,state:!0,attribute:!1})}var Re=Object.getOwnPropertyDescriptor,Le=(r,e,t,i)=>{for(var s=i>1?void 0:i?Re(e,t):e,n=r.length-1,o;n>=0;n--)(o=r[n])&&(s=o(s)||s);return s};let K=class extends S{emit(r){this.dispatchEvent(new CustomEvent("input-key",{detail:{key:r},bubbles:!0,composed:!0}))}render(){return $`
      <div class="keyboard">
        ${["1","2","3","4","5","6","7","8","9","del","0","ok"].map(e=>$`<button @click=${()=>this.emit(e)}>${e}</button>`)}
      </div>
    `}};K.styles=le`
    :host {
        box-sizing: border-box;
    }
    .keyboard {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
      justify-content: center;
    }
    button {
      font-size: 1.25rem;
      padding: 1rem;
      background: #4b5563;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
  `;K=Le([pe("number-keyboard")],K);var Ve=Object.defineProperty,je=Object.getOwnPropertyDescriptor,P=(r,e,t,i)=>{for(var s=i>1?void 0:i?je(e,t):e,n=r.length-1,o;n>=0;n--)(o=r[n])&&(s=(i?o(e,t,s):o(s))||s);return i&&s&&Ve(e,t,s),s};let y=class extends S{constructor(){super(),this.mode="sequence",this.stage="idle",this.displayValue="",this.inputValue="",this.result=$``,this.config={interval:1e3,numberLength:8,duration:2e3},this.sequence=[],this._handleRealKeyboardInput=t=>{let i=t.key;switch(t.key){case"Enter":i="ok";break;case"Backspace":i="del";break}this.handleKey(i)};const r=localStorage.getItem("config");r&&(this.config=JSON.parse(r));const e=localStorage.getItem("mode");e&&(this.mode=JSON.parse(e))}connectedCallback(){super.connectedCallback(),window.addEventListener("keydown",this._handleRealKeyboardInput)}updated(){}updateConfig(r,e){this.config={...this.config,[r]:e},localStorage.setItem("config",JSON.stringify(this.config))}async startGame(){if(this.inputValue="",this.result=$``,await new Promise(r=>setTimeout(r,100)),this.mode==="sequence"){this.sequence=Array.from({length:this.config.numberLength},()=>Math.floor(Math.random()*10).toString()),this.stage="showing";for(const r of this.sequence)this.displayValue=r,await new Promise(e=>setTimeout(e,this.config.interval)),this.displayValue="",await new Promise(e=>setTimeout(e,100))}else{const r="0123456789",e=Array.from({length:this.config.numberLength},()=>r[Math.floor(Math.random()*10)]).join("");this.sequence=[e],this.displayValue=e,this.stage="showing",await new Promise(t=>setTimeout(t,this.config.duration))}this.displayValue="",this.stage="input"}handleKey(r){if(this.stage==="input"){if(r==="del")this.inputValue=this.inputValue.slice(0,-1);else if(r==="ok")this.checkAnswer();else if(/^[0-9]$/.test(r)){this.inputValue+=r;const e=this.mode==="sequence"?this.config.numberLength:this.config.numberLength;this.inputValue.length>=e&&this.checkAnswer()}}else(this.stage==="result"||this.stage==="idle")&&r==="ok"&&this.startGame()}_handleVirtualKeyboardInput(r){if(this.stage!=="input")return;const e=r.detail.key;this.handleKey(e)}checkAnswer(){const r=this.sequence.join("");this.result=this.inputValue.trim()===r?$`<div class="success">Correct! 🎉</div`:$`<div class="fail">${r}</div>`,this.stage="result"}_setMode(r){this.mode=r,localStorage.setItem("mode",JSON.stringify(r))}render(){let r=this.mode==="sequence";return $`
      <div class="container">
        <h1><span style="color: var(--blue)">Doitoo</span> Numbers</h1>
        <div style="height: 100px;">
          <div class="number center">${this.displayValue}</div>
          <div class="number center">${this.inputValue}</div>
          ${this.stage==="result"?$`
            <div class="result center"><strong>${this.result}</strong></div>`:null}
        </div>


        <number-keyboard @input-key=${this._handleVirtualKeyboardInput} ?inert=${this.stage!=="input"} ?disabled=${this.stage!=="input"}></number-keyboard>
        <div style="grid-column: 1/3; text-align: center; margin-top: 0.5rem;">
          <button selected ?disabled=${this.stage==="showing"} @click=${this.startGame.bind(this)}>Start Game</button>
        </div>


        <div class="config">
          <label class="center flexColumn">
            Mode
            <div style="display: flex; flex-direction: row; gap: 1rem; justify-content: center;">
              <button ?selected=${r} @click=${()=>this._setMode("sequence")}>Sequence</button>
              <button ?selected=${!r} @click=${()=>this._setMode("complete")}>Complete</button>
            </div>
          </label>
          <label class="center flexColumn">
            Numbers count
            <input type="number" .value=${this.config.numberLength}
                   @input=${e=>this.updateConfig("numberLength",+e.target.value)}/>
          </label>
          <label class="center flexColumn">
            ${r?"Interval (ms)":"Duration (ms)"}
            <input type="number" .value=${r?this.config.interval:this.config.duration}
                   @input=${e=>this.updateConfig(r?"interval":"duration",+e.target.value)}/>
          </label>
        </div>
      </div>
    `}};y.styles=le`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      --blue: #2563eb;
    }

    h1 {
      margin: 0;
      text-align: center;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
    }

    .number {
      font-size: 3.5rem;
      font-family: monospace;
    }

    .config {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    button {
      background: #888888;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }

    button[selected] {
      background: var(--blue);
    }

    *[disabled] {
      filter: opacity(.5);
    }

    input[type='number'],
    select {
      width: 100%;
      padding: 0.4rem;
      border: 1px solid #ddd;
      border-radius: 0.4rem;
    }

    .success {
      color: green;
    }

    .fail {
      color: red;
    }

    .center {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flexColumn{
      display: flex;
      flex-direction: column;
    }

    .result {
      font-size: 2rem;
    }
  `;P([H()],y.prototype,"mode",2);P([H()],y.prototype,"stage",2);P([H()],y.prototype,"displayValue",2);P([H()],y.prototype,"inputValue",2);P([H()],y.prototype,"result",2);y=P([pe("memory-number-game")],y);
