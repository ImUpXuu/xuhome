import{a as x,i as g}from"./lifecycle.BfVV8VHJ.js";import{o as w}from"./index-client.CuIyVVcN.js";import{X as L,ac as E,K as f,aK as _,aN as $,aW as a,af as e,aF as n,b7 as y,ad as M}from"./template.D2vfIFjH.js";import{s as k}from"./style.B9k4OCsl.js";var C=M('<div id="custom-cursor" class="fixed pointer-events-none z-[9999] border-2 border-[#0284c7]"></div>');function q(v,p){$(p,!1);let u=n(0),m=n(0),o=n(!1),i=n(!1);w(()=>{if(a(i,"ontouchstart"in window||window.matchMedia("(pointer: coarse)").matches),e(i)){document.body.classList.remove("cursor-none");return}document.body.classList.add("cursor-none");let t=!1;function s(r){t||(requestAnimationFrame(()=>{a(u,r.clientX),a(m,r.clientY),t=!1}),t=!0)}window.addEventListener("mousemove",s);function c(r){r.target.matches("a, button, input, select, textarea")&&a(o,!0)}function l(r){r.target.matches("a, button, input, select, textarea")&&a(o,!1)}return document.addEventListener("mouseover",c),document.addEventListener("mouseout",l),()=>{document.body.classList.remove("cursor-none"),window.removeEventListener("mousemove",s),document.removeEventListener("mouseover",c),document.removeEventListener("mouseout",l)}}),x();var d=L(),b=E(d);{var h=t=>{var s=C();y(()=>k(s,`
    left: ${e(u)??""}px;
    top: ${e(m)??""}px;
    width: ${e(o)?"40px":"15px"};
    height: ${e(o)?"40px":"15px"};
    transform: translate(-50%, -50%);
    border-radius: ${e(o)?"4px":"50%"};
    background-color: ${e(o)?"rgba(2, 132, 199, 0.2)":"transparent"};
  `)),f(t,s)};g(b,t=>{e(i)||t(h)})}f(v,d),_()}export{q as default};
