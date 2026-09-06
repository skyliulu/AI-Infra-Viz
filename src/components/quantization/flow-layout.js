// Presentation geometry only. Dependency enablement/status lives in the engine model.
export function routeFlowEdges(rects, width) {
  const {checkpoint:a,prepare:b,weights:w,input:x,activation:q,linear:l,attention:t,cache:k}=rects;
  if (![a,b,w,x,q,l,t,k].every(Boolean)) return {};
  const cx=r=>r.x+r.width/2, cy=r=>r.y+r.height/2;
  const right=r=>r.x+r.width, bottom=r=>r.y+r.height;
  const down=(s,d,sx=cx(s),dx=cx(d))=>{
    const middle=(bottom(s)+d.y)/2;
    return `M${sx} ${bottom(s)} V${middle} H${dx} V${d.y}`;
  };
  const across=(s,d)=>`M${right(s)} ${cy(s)} H${d.x}`;
  const narrow=l.y>q.y+1;
  const paths={load:across(a,b),prepare:across(b,w),cast:across(x,q),
    compute:narrow?down(q,l):across(q,l),
    reuse:narrow?`M${cx(w)} ${bottom(w)} V${(bottom(w)+q.y)/2} H${width-2} V${(bottom(q)+l.y)/2} H${cx(l)} V${l.y}`:down(w,l),
    bypass:narrow?down(x,l):`M${cx(x)} ${bottom(x)} V${bottom(l)+10} H${l.x+12} V${bottom(l)}`,
    query:across(l,t),fresh:across(l,t),
    // Cache spans both producers/consumers in wide and narrow layouts.
    // Keep their ports vertically aligned instead of adding arbitrary offsets.
    write:`M${cx(l)} ${bottom(l)} V${k.y}`,
    read:`M${cx(t)} ${k.y} V${bottom(t)}`};
  return paths;
}
