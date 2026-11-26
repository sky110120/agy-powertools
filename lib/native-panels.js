(() => {
  globalThis.__agyPanels = function createPanels(env) {
    const R=React,h=R.createElement,t=env.t,D=globalThis.__agyDashboard;
    const helpers=()=>globalThis.__agyAccounts||null;
    const n=value=>value==null?'-':new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(value);
    const money=value=>value==null?'-':`$${value.toFixed(value!==0&&value<.01?4:2)}`;
    const time=value=>value?new Date(value).toLocaleString(env.options().language,{hour12:false}):'-';
    const toTw=s=>typeof globalThis.__agyToZhTw==='function'?globalThis.__agyToZhTw(s):s;
    const text=(zh,en)=>env.options().language==='en'?en:env.options().language==='zh-TW'?toTw(zh):zh;
    const icon=(name,size=16,extra={})=>h(dq,{name:({token:'stacks',payments:'receipt_long',swap_horiz:'compare_arrows',expand_more:'keyboard_arrow_down'})[name]||name,size,...extra});
    const useData=()=>typeof R.useSyncExternalStore==='function'&&typeof env.subscribe==='function'?R.useSyncExternalStore(env.subscribe,env.revision):0;
    const button=(label,onClick,extra={})=>h(Uy,{variant:'ghost',size:'sm',onClick,...extra},t(label));
    const item=(label,value)=>h(UP,{label:t(label),rightElement:h('span',{className:'tabular-nums'},value)});
    const section=(title,children)=>h(VP,{title:t(title)},children);
    const card=(title,children,right)=>h('section',{className:'pt-card'},h('div',{className:'pt-card-head'},typeof title==='string'?h('h2',null,t(title)):title,right),children);
    const style=document.createElement('style');style.dataset.agyPanelStyle='';style.textContent=`
      .pt-page{--pt-success-text:color-mix(in srgb,var(--success) 78%,var(--foreground));--pt-error-text:color-mix(in srgb,var(--error) 78%,var(--foreground));height:100%;overflow:auto;scrollbar-gutter:stable;background:var(--background);color:var(--foreground)}
      .pt-content{width:100%;max-width:1200px;margin:0 auto;padding:26px 24px;display:flex;flex-direction:column;gap:20px}
      .pt-header,.pt-alert,.pt-body{width:100%;max-width:760px;margin-inline:auto}.pt-body[data-wide=true],.pt-body[data-wide=errors]{max-width:1200px}.pt-body[data-wide=requests]{max-width:980px}
      .pt-header,.pt-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.pt-header h1{margin:0;font-size:20px;font-weight:600;letter-spacing:-.015em}
      .pt-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}.pt-stack{display:flex;flex-direction:column;gap:16px}
      .pt-page h3,.pt-section-title{margin:0;font-size:15px;font-weight:600!important;color:var(--foreground);letter-spacing:-.01em}
      .pt-tabs{display:inline-flex;align-items:center;height:32px;border:1px solid var(--border);border-radius:8px;padding:2px;gap:2px;user-select:none;max-width:100%;overflow:auto;background:color-mix(in oklab,var(--secondary) 20%,transparent)}
      .pt-tab{height:100%;padding:0 8px;white-space:nowrap;border-radius:6px;border:0;background:transparent;color:var(--secondary-foreground);cursor:pointer;font:inherit;outline:none}
      .pt-tab[aria-current=page]{background:var(--secondary);color:var(--foreground)}.pt-tab:focus-visible{outline:1px solid var(--primary)}
      .pt-field{height:32px;border:0;border-radius:9999px;background:var(--secondary);color:var(--foreground);padding:0 12px;display:inline-flex;align-items:center;justify-content:space-between;gap:10px;font:inherit;cursor:pointer;min-width:0;outline:none}.pt-field>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pt-field:focus-visible,.pt-search:focus-within{outline:2px solid var(--primary)}.pt-search{height:32px;display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:9999px;background:var(--secondary);min-width:160px;flex:1}.pt-search input{min-width:0;width:100%;background:transparent;border:0;outline:none;color:var(--foreground);font:inherit}
      .pt-card{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden;min-width:0}.pt-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 10px;flex-wrap:wrap}.pt-card-head h2{font-size:14px;font-weight:500;margin:0}
      @keyframes pt-skel-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .pt-skel{display:block;border-radius:6px;background:linear-gradient(90deg,color-mix(in srgb,var(--secondary) 78%,transparent) 25%,color-mix(in srgb,var(--foreground) 7%,var(--secondary)) 50%,color-mix(in srgb,var(--secondary) 78%,transparent) 75%);background-size:200% 100%;animation:pt-skel-shimmer 1.6s ease-in-out infinite}
      .pt-skel-pill{border-radius:9999px}
      .pt-skel-ring{width:176px;height:176px;border-radius:50%;position:relative;flex:none;background:radial-gradient(closest-side,var(--card) 69%,transparent 70%),linear-gradient(90deg,color-mix(in srgb,var(--secondary) 80%,transparent) 25%,color-mix(in srgb,var(--foreground) 7%,var(--secondary)) 50%,color-mix(in srgb,var(--secondary) 80%,transparent) 75%);background-size:100% 100%,200% 100%;animation:pt-skel-shimmer 1.6s ease-in-out infinite}
      .pt-skel-table{display:flex;flex-direction:column}
      .pt-skel-tr{display:grid;grid-template-columns:132px minmax(0,1.4fr) 72px 84px 72px;align-items:center;gap:14px;padding:13px 16px;border-bottom:1px solid var(--border)}
      .pt-skel-tr:last-child{border-bottom:0}
      @media(prefers-reduced-motion:reduce){.pt-skel,.pt-skel-ring{animation:none!important}}
      .pt-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pt-metric .pt-spark{margin-top:auto}.pt-metric{padding:15px 16px;display:flex;flex-direction:column;gap:8px}.pt-muted{color:var(--muted-foreground);font-size:12px}.pt-value{font-size:26px;line-height:1.2;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.02em}.pt-spark{width:100%;height:34px;display:block;color:var(--primary)}
      .pt-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.pt-table-wrap{overflow:auto;max-width:100%}.pt-table{width:100%;border-collapse:collapse;text-align:left;font-size:13px;font-variant-numeric:tabular-nums}.pt-table th{font-size:12px;color:var(--muted-foreground);font-weight:400;white-space:nowrap}.pt-table th,.pt-table td{padding:9px 11px;border-bottom:1px solid var(--border);vertical-align:middle}.pt-table tr:last-child td{border-bottom:0}.pt-status{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.pt-status[data-state=success]{color:var(--pt-success-text)}.pt-status[data-state=error]{color:var(--pt-error-text)}.pt-status-dot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--muted-foreground)}.pt-status[data-state=success] .pt-status-dot{background:var(--success)}.pt-status[data-state=error] .pt-status-dot{background:var(--error)}.pt-requests{table-layout:fixed;min-width:840px}.pt-requests .pt-date{white-space:nowrap;font-size:12px}.pt-table .numeric{text-align:right;white-space:nowrap}
      .pt-errors{table-layout:fixed;min-width:600px}.pt-table thead tr{height:36px}.pt-requests tbody tr,.pt-errors tbody tr{height:46px}.pt-requests tbody tr:hover{background:color-mix(in srgb,var(--secondary) 45%,transparent)}.pt-cache-drop-row{background:color-mix(in srgb,var(--error) 8%,transparent);box-shadow:inset 3px 0 0 var(--error)}.pt-cache-drop-row:hover{background:color-mix(in srgb,var(--error) 13%,transparent)!important}.pt-cache-hit[data-tone=high]{color:var(--pt-success-text);font-weight:500}.pt-cache-hit[data-tone=low]{color:var(--warning)}.pt-cache-hit[data-tone=drop]{color:var(--pt-error-text);font-weight:600}.pt-cache-drop-tag{display:inline-flex;align-items:center;padding:0 5px;height:15px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;background:color-mix(in srgb,var(--error) 16%,transparent);color:var(--pt-error-text);margin-top:2px}.pt-cost-val[data-high=true]{color:var(--warning);font-weight:600}.pt-error-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;line-height:18px;max-height:36px}.pt-price-model{font-weight:500;white-space:nowrap}.pt-efforts{display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;align-items:center}.pt-effort{font-size:11px;line-height:16px;padding:0 5px;border:1px solid var(--border);border-radius:4px;color:var(--muted-foreground)}
      .pt-price-controls{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap}
      .pt-price-mode{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;border:1px solid var(--border);background:color-mix(in srgb,var(--secondary) 45%,var(--card))}
      .pt-price-mode-btn{height:24px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--muted-foreground);font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 120ms ease,color 120ms ease}
      .pt-price-mode-btn:hover{color:var(--foreground)}
      .pt-price-mode-btn[aria-pressed=true]{background:var(--card);color:var(--foreground);box-shadow:0 1px 2px rgba(0,0,0,.14)}
      .pt-price-mode-btn:focus-visible{outline:2px solid var(--primary);outline-offset:-1px}
      .pt-price-promo-tag{display:inline-flex;align-items:center;font-size:10.5px;line-height:16px;padding:0 6px;border-radius:4px;font-weight:500;white-space:nowrap;border:1px solid var(--border);background:color-mix(in srgb,var(--secondary) 70%,transparent);color:var(--muted-foreground)}
      .pt-price-promo-tag[data-active=true]{background:color-mix(in srgb,var(--warning) 14%,transparent);border-color:color-mix(in srgb,var(--warning) 34%,transparent);color:var(--warning)}
      .pt-cost-th{text-decoration:underline dotted color-mix(in srgb,var(--muted-foreground) 55%,transparent);text-underline-offset:3px;cursor:help}
      .pt-heat{padding:0 18px 16px;display:flex;flex-direction:column;gap:6px;overflow:auto}.pt-heat-grid{display:grid;gap:4px;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;grid-auto-columns:minmax(7px,1fr);min-width:430px;aspect-ratio:53/7;width:100%}.pt-heat-cell{border-radius:3px;min-width:0;min-height:7px;background:var(--secondary)}.pt-heat-axis{display:flex;align-items:center;justify-content:space-between;min-width:430px;font-size:10px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
      .pt-health{padding:0 18px 18px;display:flex;flex-direction:column;gap:10px}.pt-health-row{display:grid;grid-template-columns:135px minmax(0,1fr) 44px;align-items:center;gap:10px;font-size:11px}.pt-health-rail{display:grid;grid-template-columns:repeat(32,1fr);gap:3px}.pt-health-cell{height:16px;border-radius:3px;background:var(--secondary)}.pt-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pt-distribution{padding:0 18px 20px;display:flex;flex-direction:column;gap:16px;min-width:0}.pt-distribution-charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;max-width:640px;width:100%;margin-inline:auto}.pt-distribution-chart{margin:0;display:flex;justify-content:center;min-width:0}.pt-donut{position:relative;width:184px;max-width:100%;aspect-ratio:1}.pt-donut svg{width:100%;height:100%;display:block}.pt-donut-total{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;pointer-events:none}.pt-donut-total strong{font-size:24px;line-height:1.2;font-weight:500;font-variant-numeric:tabular-nums;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pt-donut-segment{transition:opacity 120ms ease-out}.pt-donut-segment:hover{opacity:.75}.pt-distribution-legend{display:flex;flex-direction:column;gap:12px;max-width:640px;width:100%;margin-inline:auto;min-width:0}.pt-distribution-legend-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(64px,max-content) minmax(72px,max-content);align-items:center;column-gap:20px;font-size:12px}.pt-distribution-legend-row>span:not(:first-child){text-align:right;white-space:nowrap}.pt-distribution-model{display:flex;align-items:center;gap:8px;min-width:0}.pt-donut-dot{width:7px;height:7px;border-radius:50%;background:var(--pt-chart);flex:none}.pt-distribution-empty{text-align:center;line-height:1.5;min-width:0;width:100%;padding-block:4px;overflow-wrap:normal;word-break:normal}.pt-chart-0{--pt-chart:var(--chart-1)}.pt-chart-1{--pt-chart:var(--chart-2)}.pt-chart-2{--pt-chart:var(--chart-3)}.pt-chart-3{--pt-chart:var(--chart-4)}.pt-chart-4{--pt-chart:var(--chart-5)}.pt-chart-5{--pt-chart:var(--muted-foreground)}
      .pt-about-head{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
      .pt-about-ver{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:9999px;font-size:11.5px;line-height:1;font-weight:500;font-variant-numeric:tabular-nums;background:color-mix(in srgb,var(--secondary) 85%,transparent);color:var(--muted-foreground);border:1px solid color-mix(in srgb,var(--border) 85%,transparent)}
      .pt-about-sub{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;line-height:1.4;color:var(--muted-foreground)}
      .pt-about-sub[data-tone=ok]{color:var(--pt-success-text)}
      .pt-about-sub[data-tone=error]{color:var(--pt-error-text)}
      .pt-about-sub-link{display:inline-flex;align-items:center;gap:2px;color:var(--primary);text-decoration:none;font-size:12px}
      .pt-about-sub-link:hover{text-decoration:underline;text-underline-offset:2px}
      .pt-about-actions{display:inline-flex;align-items:center;gap:6px;flex:none}
      .pt-about-btn{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
      .pt-about-btn-ok{color:var(--pt-success-text)}
      .pt-release-notes{margin:0;padding:4px 14px 14px;overflow-wrap:anywhere;max-height:260px;overflow:auto;font-size:12px;line-height:1.55;color:var(--secondary-foreground);display:flex;flex-direction:column;gap:6px}.pt-release-notes h4,.pt-release-notes h5{margin:4px 0 0;font-size:12.5px;font-weight:600;color:var(--foreground);line-height:1.4}.pt-release-notes h4:first-child,.pt-release-notes h5:first-child{margin-top:0}.pt-release-notes p{margin:0}.pt-release-notes ul,.pt-release-notes ol{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:3px}.pt-release-notes ul{list-style:disc}.pt-release-notes ol{list-style:decimal}.pt-release-notes ul ul{list-style:circle;margin-top:3px}.pt-release-notes strong{font-weight:600;color:var(--foreground)}.pt-release-notes code{font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;padding:1px 4px;border-radius:4px;background:var(--secondary);color:var(--foreground)}.pt-release-notes a{color:var(--primary);text-decoration:underline;text-underline-offset:2px}.pt-release-notes hr{border:0;border-top:1px solid var(--border);margin:4px 0}
      .pt-plan-badge{position:relative;isolation:isolate;display:inline-flex;align-items:center;gap:9px;padding:9px 15px;border-radius:9999px;font-size:14px;font-weight:600;border:1px solid var(--border);background:var(--secondary);white-space:nowrap}.pt-plan-symbol{display:flex;align-items:center;justify-content:center}.pt-plan-badge[data-plan=pro]{background:linear-gradient(115deg,#e0edff,#e0faf4);color:#155b69;border-color:#bbd9f3;box-shadow:0 1px 8px #397cbd15}.pt-plan-badge[data-plan=plus]{background:linear-gradient(110deg,#fff0d7,#fff8ed);color:#815013;border-color:#ecd3a7}.pt-plan-badge[data-plan=team]{background:linear-gradient(110deg,#efe3ff,#fae9f4);color:#643785;border-color:#dec7ee}
      .pt-plan-badge[data-plan^=ultra]{color:#f8f9fa;background:#202124;border-color:#5f6368;box-shadow:inset 0 1px 0 #ffffff14}.pt-plan-badge[data-plan^=ultra] .pt-plan-symbol{color:#f3d28f}.pt-plan-badge[data-plan=ultra5]{background:#202124;border-color:#ad905b;box-shadow:inset 0 1px 0 #eedbb844}.pt-plan-badge[data-plan=ultra20]{background:linear-gradient(110deg,#171819,#303033 60%,#24211a);border-color:#e7c37b;box-shadow:0 0 0 1px #d7b66e24,0 2px 12px #b9984c29,inset 0 1px 0 #fff0c955}.pt-plan-badge[data-plan=ultra20] .pt-plan-symbol{color:#f9df9b}
      .dark .pt-plan-badge[data-plan=pro]{background:linear-gradient(110deg,#1c3b54,#204539);color:#d6f1ff;border-color:#426b79}.dark .pt-plan-badge[data-plan=plus]{background:linear-gradient(110deg,#4a3521,#453d27);color:#ffedcf;border-color:#79633f}.dark .pt-plan-badge[data-plan=team]{background:linear-gradient(110deg,#3c2854,#4d2c47);color:#f3e1ff;border-color:#795689}
      .pt-bar{display:block;width:100%;height:6px;flex-shrink:0;background:var(--secondary);border-radius:9999px;overflow:hidden}.pt-fill{display:block;height:100%;background:var(--primary);border-radius:inherit}@keyframes pt-indeterminate{from{transform:translateX(-100%)}to{transform:translateX(400%)}}.pt-fill[data-indeterminate=true]{animation:pt-indeterminate 1.4s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.pt-fill[data-indeterminate=true]{animation:none}}.pt-quota{padding:18px;display:flex;flex-direction:column;gap:12px}.pt-estimate{display:inline-flex;align-items:center;gap:10px;font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
      .pt-ov-sec{padding:4px;border-top:1px solid var(--border);display:flex;flex-direction:column}
      .pt-ov-toggle{display:flex;align-items:center;gap:6px;width:100%;padding:4px 6px 4px 8px;border:0;border-radius:8px;background:transparent;color:var(--foreground);font:inherit;text-align:left;cursor:pointer;outline:none}
      .pt-ov-toggle:focus-visible{box-shadow:0 0 0 1px var(--ring,var(--primary))}
      .pt-ov-title{font-size:12px;line-height:16px;font-weight:500;opacity:.5;user-select:none;transition:opacity 150ms ease}
      .pt-ov-badge{font-size:10px;line-height:1;font-weight:500;padding:2px 6px;border-radius:9999px;background:var(--border);color:var(--foreground);opacity:.5;font-variant-numeric:tabular-nums;white-space:nowrap;transition:opacity 150ms ease}
      .pt-ov-badge[data-tone=active]{background:color-mix(in srgb,var(--primary) 16%,transparent);color:var(--primary);opacity:.9}
      .pt-ov-badge[data-tone=warning]{background:color-mix(in srgb,var(--warning) 18%,transparent);color:var(--warning);opacity:.95}
      .pt-ov-badge[data-tone=critical]{background:color-mix(in srgb,var(--error) 16%,transparent);color:var(--pt-error-text,var(--error));opacity:.95}
      .pt-ov-chev{color:var(--muted-foreground);opacity:0;transform:rotate(0deg);transition:color 150ms ease,opacity 150ms ease,transform 150ms ease;flex-shrink:0}
      .pt-ov-toggle[aria-expanded=true] .pt-ov-chev{transform:rotate(90deg)}
      .pt-ov-toggle:hover .pt-ov-title,.pt-ov-toggle:focus-visible .pt-ov-title,.pt-ov-toggle:hover .pt-ov-badge,.pt-ov-toggle:focus-visible .pt-ov-badge{opacity:1}
      .pt-ov-toggle:hover .pt-ov-chev,.pt-ov-toggle:focus-visible .pt-ov-chev{opacity:1;color:var(--secondary-foreground)}
      @media(hover:none){.pt-ov-chev{opacity:.65}}
      .pt-ov-body{padding:4px 8px 6px;display:flex;flex-direction:column;gap:8px}
      .pt-progress-header{display:flex;align-items:center;gap:12px}
      .pt-progress-orb{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;user-select:none}
      .pt-progress-orb canvas{display:block;width:100%;height:100%}
      .pt-progress-orb-arc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .pt-progress-heading{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px}
      .pt-progress-title{font-size:13px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:var(--foreground)}
      .pt-progress-title[data-phase=retrying],.pt-progress-title[data-phase=waiting]{color:var(--warning)}
      .pt-progress-sub{font-size:11.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted-foreground)}
      .pt-task-list{display:flex;flex-direction:column;gap:2px;max-height:160px;overflow:auto}
      .pt-task{display:flex;align-items:center;gap:7px;padding:4px 6px;border-radius:6px;font-size:12px;color:var(--secondary-foreground);min-width:0}
      .pt-task[data-status=running]{background:var(--secondary);color:var(--foreground);font-weight:500}
      .pt-task[data-status=complete]{color:var(--muted-foreground)}
      .pt-task-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pt-trail{position:relative;display:flex;flex-direction:column;gap:2px}
      .pt-trail::before{content:'';position:absolute;left:9.5px;top:11px;bottom:11px;width:1px;background:color-mix(in srgb,var(--border) 100%,var(--foreground) 8%);pointer-events:none}
      .pt-trail-node{position:relative;display:flex;align-items:center;gap:8px;min-height:24px;padding:2px 6px 2px 4px;border-radius:7px;font-size:12px;min-width:0;transition:background 120ms ease}
      .pt-trail-node:hover{background:color-mix(in srgb,var(--secondary) 68%,transparent)}
      .pt-trail-dot-wrap{position:relative;z-index:1;width:12px;height:12px;flex:none;display:inline-flex;align-items:center;justify-content:center}
      .pt-trail-dot{width:6px;height:6px;border-radius:50%;background:var(--muted-foreground);box-shadow:0 0 0 2.5px var(--background)}
      .pt-trail-node[data-status=complete] .pt-trail-dot{background:var(--success)}
      .pt-trail-node[data-status=running] .pt-trail-dot{background:var(--primary);box-shadow:0 0 0 2.5px var(--background),0 0 0 5px color-mix(in srgb,var(--primary) 22%,transparent);animation:pt-beacon 1.6s ease-out infinite}
      .pt-trail-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--secondary-foreground)}
      .pt-trail-node[data-status=running] .pt-trail-label{color:var(--foreground);font-weight:500}
      .pt-trail-dur{flex:none;font-size:11px;font-variant-numeric:tabular-nums;color:var(--muted-foreground)}
      .pt-trail-node[data-status=running] .pt-trail-dur{color:var(--primary)}
      .pt-ov-quota-body{padding:2px 0 4px;display:flex;flex-direction:column;gap:2px}
      .pt-ov-quota-row{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:5px 8px;border:0;border-radius:8px;background:transparent;color:var(--foreground);font:inherit;font-size:12px;cursor:pointer;text-align:left;transition:background 120ms ease}
      .pt-ov-quota-row:hover{background:color-mix(in srgb,var(--secondary) 80%,transparent)}
      .pt-ov-quota-pills{display:grid;grid-auto-flow:column;grid-auto-columns:72px;gap:6px;flex:none;font-variant-numeric:tabular-nums}
      .pt-ov-qpill{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:space-between;gap:4px;width:72px;height:21px;padding:0 6px;border-radius:6px;font-size:11px;white-space:nowrap;box-sizing:border-box;background:color-mix(in srgb,var(--secondary) 85%,transparent);color:var(--foreground)}
      .pt-ov-qpill-bar{position:absolute;left:0;bottom:0;height:2px;background:var(--primary)}
      .pt-ov-qpill[data-tone=warning] .pt-ov-qpill-bar{background:var(--warning)}.pt-ov-qpill[data-tone=warning]{color:var(--warning)}
      .pt-ov-qpill[data-tone=critical] .pt-ov-qpill-bar{background:var(--error)}.pt-ov-qpill[data-tone=critical]{color:var(--pt-error-text,var(--error))}
      @keyframes pt-beacon{0%{box-shadow:0 0 0 2.5px var(--background),0 0 0 2.5px color-mix(in srgb,var(--primary) 45%,transparent)}75%{box-shadow:0 0 0 2.5px var(--background),0 0 0 7px transparent}100%{box-shadow:0 0 0 2.5px var(--background),0 0 0 7px transparent}}
      @media(prefers-reduced-motion:reduce){.pt-trail-dot{animation:none!important}}
      .pt-outline{position:absolute;left:0;top:50%;transform:translateY(-50%);z-index:20;display:flex;flex-direction:column;align-items:center;gap:5px;width:28px;max-height:55%;overflow:auto;scrollbar-width:none}.pt-outline button{width:22px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:0;border-radius:4px;background:transparent;color:var(--muted-foreground)}.pt-outline button:hover,.pt-outline button:focus-visible{color:var(--primary);background:var(--secondary);outline:1px solid var(--primary)}
      .pt-calendar{padding:12px;color:var(--foreground);font-size:13px;--pt-cell:34px}.pt-calendar-months,.pt-calendar-month{position:relative;width:calc(var(--pt-cell)*7)}.pt-calendar-caption{height:36px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;padding-inline:28px}.pt-calendar-dropdowns{display:flex;align-items:center;justify-content:center;gap:4px}.pt-calendar-dropdowns .pt-field{height:28px;padding-inline:8px;border-radius:6px;font-size:12px;gap:4px}.pt-calendar-caption-label{display:none}.pt-calendar-nav{position:absolute;inset-inline:0;top:0;pointer-events:none;z-index:1}.pt-calendar-nav-button{width:28px;height:34px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:6px;color:var(--foreground);cursor:pointer;pointer-events:auto}.pt-calendar-prev{position:absolute;top:0;inset-inline-start:0}.pt-calendar-next{position:absolute;top:0;inset-inline-end:0}.pt-calendar-nav-button:hover,.pt-calendar-day-button:hover{background:var(--secondary)}.pt-calendar-grid{width:100%;border-collapse:collapse;table-layout:fixed}.pt-calendar-weekday{height:28px;font-size:11px;font-weight:400;color:var(--muted-foreground);text-align:center}.pt-calendar-day{width:var(--pt-cell);height:var(--pt-cell);padding:0;text-align:center;position:relative}.pt-calendar-day-button{width:100%;height:var(--pt-cell);border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer}.pt-calendar-nav-button:focus-visible,.pt-calendar-day-button:focus-visible{outline:2px solid var(--primary);outline-offset:-2px}.pt-calendar-today:not(.pt-calendar-selected) .pt-calendar-day-button{box-shadow:inset 0 0 0 1px var(--border)}.pt-calendar-range-middle{background:var(--secondary)}.pt-calendar-range-start .pt-calendar-day-button,.pt-calendar-range-end .pt-calendar-day-button{background:var(--primary);color:var(--primary-foreground,#fff)}.pt-calendar-range-start{border-start-start-radius:6px;border-end-start-radius:6px}.pt-calendar-range-end{border-start-end-radius:6px;border-end-end-radius:6px}.pt-calendar-outside{color:var(--muted-foreground);opacity:.55}.pt-calendar-disabled{opacity:.35}.pt-calendar-hidden{visibility:hidden}
      .pt-acct-trigger{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--foreground);cursor:pointer;text-align:left;transition:background 120ms ease,border-color 120ms ease;font:inherit}.pt-acct-trigger:hover{background:var(--sidebar-muted,var(--secondary))}.pt-acct-trigger:focus-visible{outline:2px solid var(--primary);outline-offset:-1px}
      .pt-acct-avatar{width:28px;height:28px;border-radius:9999px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex:none;border:1px solid var(--border);background:var(--secondary);color:var(--foreground);overflow:hidden}.pt-acct-avatar[data-size=lg]{width:36px;height:36px;font-size:14px}.pt-acct-avatar[data-photo=true]{background:var(--secondary)}
      .pt-acct-avatar-img{width:100%;height:100%;object-fit:cover;display:block}
      .pt-acct-avatar[data-plan=pro]{background:linear-gradient(135deg,#dbeafe,#d1fae5);color:#155b69;border-color:#93c5fd}.pt-acct-avatar[data-plan=plus]{background:linear-gradient(135deg,#fef3c7,#ffedd5);color:#815013;border-color:#fcd34d}.pt-acct-avatar[data-plan=team]{background:linear-gradient(135deg,#f3e8ff,#fce7f3);color:#643785;border-color:#d8b4fe}.pt-acct-avatar[data-plan^=ultra]{background:#202124;color:#f3d28f;border-color:#ad905b}
      .dark .pt-acct-avatar[data-plan=pro]{background:linear-gradient(135deg,#1e3a5f,#1a4731);color:#bae6fd;border-color:#3b82f6}.dark .pt-acct-avatar[data-plan=plus]{background:linear-gradient(135deg,#4a3521,#453d27);color:#ffedcf;border-color:#92400e}.dark .pt-acct-avatar[data-plan=team]{background:linear-gradient(135deg,#3c2854,#4d2c47);color:#f3e1ff;border-color:#7e22ce}
      .pt-acct-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;line-height:16px;padding:1px 7px;border-radius:9999px;font-variant-numeric:tabular-nums;white-space:nowrap;background:var(--secondary);color:var(--secondary-foreground);border:1px solid transparent}
      .pt-acct-pill[data-tone=warning]{background:color-mix(in srgb,var(--warning) 16%,transparent);color:var(--warning);border-color:color-mix(in srgb,var(--warning) 32%,transparent)}
      .pt-acct-pill[data-tone=critical]{background:color-mix(in srgb,var(--error) 16%,transparent);color:var(--pt-error-text,var(--error));border-color:color-mix(in srgb,var(--error) 32%,transparent)}
      .pt-acct-pill[data-tone=active]{background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);border-color:color-mix(in srgb,var(--primary) 30%,transparent)}
      .pt-acct-alias-tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;line-height:16px;padding:1px 6px;border-radius:5px;font-weight:500;white-space:nowrap;background:color-mix(in srgb,var(--foreground) 6%,transparent);color:var(--secondary-foreground);border:1px solid color-mix(in srgb,var(--border) 90%,transparent);max-width:132px}
      .pt-acct-alias-tag>svg{opacity:.62;flex-shrink:0}
      .pt-acct-alias-tag>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pt-acct-win-tag{display:inline-flex;align-items:center;font-size:10px;line-height:14px;padding:0 4px;border-radius:4px;font-weight:500;background:color-mix(in srgb,var(--foreground) 7%,transparent);color:var(--muted-foreground);flex-shrink:0}
      .pt-acct-plan-mini{display:inline-flex;align-items:center;gap:3px;font-size:10px;line-height:16px;padding:0 6px;border-radius:9999px;font-weight:600;white-space:nowrap;border:1px solid var(--border);background:var(--secondary);color:var(--secondary-foreground)}
      .pt-acct-plan-mini[data-plan=pro]{background:linear-gradient(115deg,#e0edff,#e0faf4);color:#155b69;border-color:#bbd9f3}.pt-acct-plan-mini[data-plan=plus]{background:linear-gradient(110deg,#fff0d7,#fff8ed);color:#815013;border-color:#ecd3a7}.pt-acct-plan-mini[data-plan=team]{background:linear-gradient(110deg,#efe3ff,#fae9f4);color:#643785;border-color:#dec7ee}.pt-acct-plan-mini[data-plan^=ultra]{color:#f3d28f;background:#202124;border-color:#ad905b}
      .dark .pt-acct-plan-mini[data-plan=pro]{background:linear-gradient(110deg,#1c3b54,#204539);color:#d6f1ff;border-color:#426b79}.dark .pt-acct-plan-mini[data-plan=plus]{background:linear-gradient(110deg,#4a3521,#453d27);color:#ffedcf;border-color:#79633f}.dark .pt-acct-plan-mini[data-plan=team]{background:linear-gradient(110deg,#3c2854,#4d2c47);color:#f3e1ff;border-color:#795689}
      .pt-acct-popover{display:flex;flex-direction:column;gap:6px;padding:4px}.pt-acct-pop-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 4px}
      .pt-acct-pop-refresh{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--muted-foreground);cursor:pointer;transition:background 120ms ease,border-color 120ms ease,color 120ms ease}.pt-acct-pop-refresh:hover{background:var(--secondary);border-color:var(--border);color:var(--foreground)}.pt-acct-pop-refresh:focus-visible{outline:2px solid var(--primary);outline-offset:-1px}.pt-acct-pop-refresh:disabled{opacity:.55;cursor:default}
      .pt-acct-pop-list{display:flex;flex-direction:column;gap:4px;max-height:316px;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}
      .pt-acct-pop-item{display:flex;flex-direction:column;gap:6px;width:100%;padding:8px 10px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--foreground);text-align:left;cursor:pointer;font:inherit;transition:background 120ms ease,border-color 120ms ease}
      .pt-acct-pop-item:hover{background:var(--secondary)}.pt-acct-pop-item[data-active=true]{background:color-mix(in srgb,var(--primary) 8%,var(--secondary));border-color:color-mix(in srgb,var(--primary) 32%,var(--border))}.pt-acct-pop-item[data-disabled=true]{opacity:.62}.pt-acct-pop-item:disabled{cursor:not-allowed}.pt-acct-pop-item:disabled:hover{background:transparent}.pt-acct-pop-item:focus-visible{outline:2px solid var(--primary);outline-offset:-1px}
      .pt-acct-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pt-acct-mini-group{display:flex;flex-direction:column;gap:4px;min-width:0}
      .pt-acct-mini-head{display:flex;align-items:center;justify-content:space-between;gap:4px;font-size:11px;min-width:0}.pt-acct-mini-name{display:inline-flex;align-items:center;gap:4px;min-width:0;color:var(--muted-foreground)}.pt-acct-mini-name>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pt-acct-mini-bar{display:block;width:100%;height:4px;border-radius:9999px;background:color-mix(in srgb,var(--muted-foreground) 20%,transparent);overflow:hidden}.pt-acct-mini-fill{display:block;height:100%;border-radius:inherit}
      .pt-acct-pop-foot{display:flex;flex-direction:column;gap:2px;padding-top:6px;border-top:1px solid var(--border)}
      .pt-acct-pop-action{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border-radius:6px;border:0;background:transparent;color:var(--foreground);font:inherit;font-size:12px;cursor:pointer;text-align:left}.pt-acct-pop-action:hover{background:var(--secondary)}
      .pt-acct-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;min-height:34px}
      .pt-acct-cards{display:flex;flex-direction:column;gap:12px}.pt-acct-card{transition:border-color 140ms ease,box-shadow 140ms ease}.pt-acct-card[data-active=true]{border-color:color-mix(in srgb,var(--primary) 45%,var(--border));box-shadow:0 0 0 1px color-mix(in srgb,var(--primary) 16%,transparent)}.pt-acct-card[data-disabled=true]{opacity:.72}.pt-acct-card[data-drag-over=true]{box-shadow:inset 0 2px 0 var(--primary)}
      .pt-acct-card-body{padding:14px 18px;display:flex;flex-direction:column;gap:12px}
      .pt-acct-card-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;flex-wrap:nowrap}
      .pt-acct-card-quotas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .pt-acct-bucket-box{padding:10px 12px;border-radius:8px;background:color-mix(in srgb,var(--secondary) 55%,transparent);display:flex;flex-direction:column;gap:8px;min-width:0}
      .pt-acct-edit-form{display:flex;align-items:center;gap:6px;flex:1;min-width:0;width:100%}
      .pt-acct-input{display:block;width:100%;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--border);background:var(--background);color:var(--foreground);font:inherit;font-size:13px;line-height:1.4;box-sizing:border-box;outline:none!important;transition:border-color 120ms ease,box-shadow 120ms ease}
      .pt-acct-input[data-inline=true]{flex:1;min-width:0;width:auto;height:30px;padding:0 10px}
      .pt-acct-input:focus,.pt-acct-input:focus-visible{outline:none!important;border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 20%,transparent)}
      .pt-acct-edit-btn{flex-shrink:0;white-space:nowrap}
      .pt-acct-table{table-layout:fixed;width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}.pt-acct-table th{font-size:11px;color:var(--muted-foreground);font-weight:500;padding:9px 8px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap}.pt-acct-table td{padding:9px 8px;border-bottom:1px solid var(--border);vertical-align:middle}.pt-acct-table tbody tr{height:68px;transition:background 120ms ease}.pt-acct-table tr:last-child td{border-bottom:0}.pt-acct-table tr[data-active=true]{background:color-mix(in srgb,var(--primary) 6%,transparent)}.pt-acct-table tr[data-disabled=true]{opacity:.68}.pt-acct-table tr[data-drag-over=true]{box-shadow:inset 0 2px 0 var(--primary)}
      .pt-acct-grip{display:inline-flex;align-items:center;justify-content:center;width:20px;height:28px;color:var(--muted-foreground);cursor:grab;opacity:.5;flex-shrink:0;border-radius:4px}.pt-acct-grip:hover{opacity:1;color:var(--foreground);background:var(--secondary)}
      .pt-acct-th-quota{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .pt-acct-win-mini{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:6px;padding:1px;gap:1px;background:color-mix(in oklab,var(--secondary) 25%,transparent)}
      .pt-acct-win-mini button{height:20px;padding:0 6px;border:0;border-radius:4px;background:transparent;color:var(--muted-foreground);font:inherit;font-size:11px;cursor:pointer;line-height:1}.pt-acct-win-mini button[aria-pressed=true]{background:var(--secondary);color:var(--foreground);font-weight:500}
      .pt-acct-cell-primary{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:nowrap}.pt-acct-cell-name{font-weight:600;font-size:13px;flex-shrink:0;max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pt-acct-cell-email{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pt-acct-cell-badges{display:flex;align-items:center;gap:5px;margin-top:4px;min-width:0;flex-wrap:nowrap;overflow:hidden}
      .pt-acct-quota-chips{display:flex;flex-direction:column;gap:4px;width:100%}
      .pt-acct-quota-chip{position:relative;display:flex;align-items:center;justify-content:space-between;gap:6px;height:22px;padding:0 8px;border-radius:6px;background:var(--secondary);overflow:hidden;font-size:11px;line-height:22px}
      .pt-acct-chip-fill{position:absolute;inset:0 auto 0 0;background:color-mix(in srgb,var(--primary) 16%,transparent);pointer-events:none;border-radius:inherit}
      .pt-acct-quota-chip[data-tone=warning] .pt-acct-chip-fill{background:color-mix(in srgb,var(--warning) 22%,transparent)}
      .pt-acct-quota-chip[data-tone=critical] .pt-acct-chip-fill{background:color-mix(in srgb,var(--error) 22%,transparent)}
      .pt-acct-chip-label,.pt-acct-chip-meta{position:relative;z-index:1;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
      .pt-acct-icon-seg{display:inline-flex;align-items:center;height:32px;border:1px solid var(--border);border-radius:8px;padding:2px;gap:2px;background:color-mix(in oklab,var(--secondary) 20%,transparent);flex-shrink:0}
      .pt-acct-icon-btn{width:28px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--muted-foreground);cursor:pointer}.pt-acct-icon-btn[aria-pressed=true]{background:var(--secondary);color:var(--foreground)}
      .pt-acct-autoswitch{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 10px;border:1px solid var(--border);border-radius:8px;background:var(--card);font-size:12px;white-space:nowrap}
      .pt-acct-modal-backdrop{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:16px}
      .pt-acct-modal-card{width:100%;max-width:440px;padding:20px;border-radius:12px;border:1px solid var(--border);background:var(--background);color:var(--foreground);box-shadow:0 12px 32px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:14px}
      .pt-acct-warn-box{padding:10px 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--warning) 45%,var(--border));background:color-mix(in srgb,var(--warning) 12%,transparent);font-size:12px;line-height:1.55;display:flex;align-items:flex-start;gap:8px}
      .pt-acct-risk-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:12px;line-height:1.55;color:var(--muted-foreground)}
      .pt-proxy-banner{padding:10px 14px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px;background:color-mix(in srgb,var(--secondary) 40%,transparent)}
      .pt-proxy-banner[data-state=mismatch]{background:color-mix(in srgb,var(--warning) 10%,transparent)}
      .pt-proxy-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--muted-foreground)}.pt-proxy-dot[data-state=active]{background:var(--success)}.pt-proxy-dot[data-state=mismatch]{background:var(--warning)}
      .pt-proxy-fields{padding:12px 14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:12px}
      .pt-proxy-field{display:flex;flex-direction:column;gap:6px}
      .pt-proxy-field-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .pt-proxy-grid{display:grid;grid-template-columns:112px minmax(0,1fr) 96px;gap:8px;align-items:center}
      .pt-proxy-grid .pt-field{height:36px;width:100%;border-radius:8px;border:1px solid var(--border);background:var(--background);padding:0 10px}
      .pt-proxy-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-top:2px}
      .pt-proxy-feedback{font-size:12px;line-height:1.5;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:color-mix(in srgb,var(--secondary) 45%,transparent);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .pt-proxy-feedback[data-tone=ok]{border-color:color-mix(in srgb,var(--success) 40%,var(--border));background:color-mix(in srgb,var(--success) 10%,transparent);color:var(--pt-success-text)}
      .pt-proxy-feedback[data-tone=error]{border-color:color-mix(in srgb,var(--error) 40%,var(--border));background:color-mix(in srgb,var(--error) 10%,transparent);color:var(--pt-error-text)}
      .pt-proxy-feedback[data-tone=warning]{border-color:color-mix(in srgb,var(--warning) 45%,var(--border));background:color-mix(in srgb,var(--warning) 10%,transparent);color:var(--foreground)}
      .pt-bubble-panel{padding:12px 16px 14px;display:flex;flex-direction:column;gap:12px}
      .pt-bubble-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .pt-bubble-meta{display:flex;flex-direction:column;gap:2px;min-width:0}
      .pt-bubble-title{font-size:13.5px;font-weight:500;color:var(--foreground);line-height:1.35}
      .pt-bubble-controls{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0}
      .pt-bubble-divider{width:1px;height:16px;background:var(--border);flex:none}
      .pt-bubble-pill{position:relative;height:26px;padding:0 10px;border-radius:9999px;border:1px solid var(--border);background:var(--background);color:var(--secondary-foreground);font:inherit;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;box-sizing:border-box;transition:border-color 120ms ease,background 120ms ease,color 120ms ease}
      .pt-bubble-pill:hover{background:var(--secondary);color:var(--foreground)}
      .pt-bubble-pill[aria-pressed=true]{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 10%,var(--background));color:var(--foreground)}
      .pt-bubble-pill:focus-visible{outline:2px solid var(--primary);outline-offset:1px}
      .pt-bubble-pill input[type=color]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:0;padding:0}
      .pt-bubble-dot{width:10px;height:10px;border-radius:9999px;flex:none;background:var(--pt-dot,var(--primary));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--foreground) 18%,transparent)}
      .pt-beam-dot{width:12px;height:12px;border-radius:9999px;flex:none;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--foreground) 16%,transparent)}
      .pt-beam-preview-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:10px;border-top:1px solid color-mix(in srgb,var(--border) 70%,transparent)}
      .pt-bubble-swatches{display:inline-flex;align-items:center;gap:7px;height:26px}
      .pt-bubble-swatch{position:relative;width:20px;height:20px;padding:0;margin:0;border-radius:9999px;border:1px solid color-mix(in srgb,var(--foreground) 18%,transparent);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;line-height:0;background:var(--pt-swatch,var(--primary));transition:box-shadow 120ms ease,border-color 120ms ease}
      .pt-bubble-swatch[aria-pressed=true]{box-shadow:0 0 0 2px var(--card,var(--background)),0 0 0 3.5px var(--primary)}
      .pt-bubble-swatch:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
      .pt-bubble-swatch svg{width:11px;height:11px;display:block;pointer-events:none;opacity:0;transition:opacity 120ms ease}
      .pt-bubble-swatch[aria-pressed=true] svg{opacity:1}
      .pt-bubble-strength-row{display:flex;align-items:center;gap:12px;padding-top:2px}
      .pt-bubble-strength-label{font-size:12px;color:var(--muted-foreground);white-space:nowrap;flex:none}
      .pt-bubble-range{flex:1;min-width:120px;height:6px;appearance:none;-webkit-appearance:none;border-radius:9999px;outline:none;cursor:pointer;background:var(--secondary)}
      .pt-bubble-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:15px;height:15px;border-radius:9999px;background:var(--background);border:2px solid var(--primary);box-shadow:0 1px 3px rgba(0,0,0,.22);cursor:pointer;transition:transform 120ms ease}
      .pt-bubble-range::-webkit-slider-thumb:hover{transform:scale(1.12)}
      .pt-bubble-range:focus-visible{outline:2px solid var(--primary);outline-offset:3px}
      .pt-bubble-strength-val{font-size:12px;font-variant-numeric:tabular-nums;color:var(--foreground);white-space:nowrap;flex:none;min-width:64px;text-align:right}
      .pt-bubble-stage{display:flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:color-mix(in srgb,var(--secondary) 32%,var(--background))}
      .pt-bubble-preview{display:inline-flex;align-items:center;justify-content:center;padding:7px 14px;border-radius:18px;font-size:13px;line-height:1.4;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;color:var(--pt-preview-fg,var(--foreground));border:1px solid color-mix(in srgb,var(--pt-preview-tint,var(--primary)) var(--pt-preview-border,36%),var(--border));background:color-mix(in srgb,var(--pt-preview-tint,var(--primary)) var(--pt-preview-bg,20%),var(--card));transition:background 140ms ease,border-color 140ms ease,color 140ms ease}
      .pt-qp-trigger{position:relative}
      @keyframes pt-qp-dot-in{0%{opacity:0;transform:scale(.2)}65%{opacity:1;transform:scale(1.16)}100%{opacity:1;transform:scale(1)}}
      @keyframes pt-qp-dot-pulse-warn{0%{box-shadow:0 0 0 1.5px var(--background),0 0 0 1.5px color-mix(in srgb,var(--warning) 52%,transparent)}70%{box-shadow:0 0 0 1.5px var(--background),0 0 0 6px transparent}100%{box-shadow:0 0 0 1.5px var(--background),0 0 0 6px transparent}}
      @keyframes pt-qp-dot-pulse-crit{0%{box-shadow:0 0 0 1.5px var(--background),0 0 0 1.5px color-mix(in srgb,var(--error) 56%,transparent)}70%{box-shadow:0 0 0 1.5px var(--background),0 0 0 6.5px transparent}100%{box-shadow:0 0 0 1.5px var(--background),0 0 0 6.5px transparent}}
      @keyframes pt-qp-alert-in{0%{opacity:0;transform:perspective(700px) translateY(-10px) scale(.28,.12) rotateX(-16deg)}42%{opacity:1;transform:perspective(700px) translateY(-2px) scale(.76,.92) rotateX(-4deg)}100%{opacity:1;transform:perspective(700px) translateY(0) scale(1,1) rotateX(0deg)}}
      @keyframes pt-qp-alert-out{0%{opacity:1;transform:perspective(700px) translateY(0) scale(1,1) rotateX(0deg)}48%{opacity:.9;transform:perspective(700px) translateY(-4px) scale(.62,.86) rotateX(-6deg)}100%{opacity:0;transform:perspective(700px) translateY(-11px) scale(.22,.1) rotateX(-18deg)}}
      @keyframes pt-qp-row-in{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
      .pt-qp-trigger-dot{position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;pointer-events:none;box-shadow:0 0 0 1.5px var(--background);will-change:transform,opacity}
      .pt-qp-trigger-dot[data-tone=info]{background:var(--primary);animation:pt-qp-dot-in 180ms cubic-bezier(.22,1,.36,1) both}
      .pt-qp-trigger-dot[data-tone=warning]{background:var(--warning);animation:pt-qp-dot-in 180ms cubic-bezier(.22,1,.36,1) both,pt-qp-dot-pulse-warn 2.6s ease-out .3s infinite}
      .pt-qp-trigger-dot[data-tone=critical]{background:var(--error);animation:pt-qp-dot-in 180ms cubic-bezier(.22,1,.36,1) both,pt-qp-dot-pulse-crit 2s ease-out .25s infinite}
      .pt-qp-trigger-dot[data-state=exiting]{animation:none;opacity:0;transform:scale(.15);transition:opacity 145ms ease,transform 145ms cubic-bezier(.5,0,.85,.25)}
      .pt-sidebar-update-pill{margin-left:auto;flex:none;display:inline-flex;align-items:center;height:16px;padding:0 6px;border-radius:9999px;font-size:10px;line-height:1;font-weight:600;white-space:nowrap;cursor:pointer;background:color-mix(in srgb,var(--primary) 15%,transparent);color:var(--primary);border:1px solid color-mix(in srgb,var(--primary) 28%,transparent);transition:background 120ms ease,border-color 120ms ease}
      .pt-sidebar-update-pill:hover{background:color-mix(in srgb,var(--primary) 24%,transparent);border-color:color-mix(in srgb,var(--primary) 42%,transparent)}
      .pt-qp-tip{display:flex;flex-direction:column;gap:3px;text-align:left;line-height:1.35}
      .pt-qp-tip-title{font-weight:600}
      .pt-qp-tip-row{display:flex;align-items:center;gap:6px;white-space:nowrap}
      .pt-qp-tip-dot{width:6px;height:6px;border-radius:50%;flex:none}
      .pt-qp-tip-dot[data-tone=info]{background:var(--primary)}
      .pt-qp-tip-dot[data-tone=warning]{background:var(--warning)}
      .pt-qp-tip-dot[data-tone=critical]{background:var(--error)}
      .pt-qp-alert-callout{position:fixed;z-index:60;width:276px;max-width:calc(100vw - 24px);padding:11px 13px;border-radius:12px;border:1px solid color-mix(in srgb,var(--warning) 42%,var(--border));background:var(--card);color:var(--foreground);box-shadow:0 12px 30px rgba(0,0,0,.24),0 2px 8px rgba(0,0,0,.12),inset 0 1px 0 color-mix(in srgb,var(--foreground) 6%,transparent);display:flex;flex-direction:column;gap:8px;font-size:12.5px;line-height:1.45;transform-origin:calc(100% - var(--pt-caret-r,24px)) -8px;will-change:transform,opacity;animation:pt-qp-alert-in 215ms cubic-bezier(.16,1,.3,1) both}
      .pt-qp-alert-callout[data-tone=critical]{border-color:color-mix(in srgb,var(--error) 46%,var(--border));box-shadow:0 12px 30px rgba(0,0,0,.26),0 0 0 1px color-mix(in srgb,var(--error) 10%,transparent),inset 0 1px 0 color-mix(in srgb,var(--foreground) 6%,transparent)}
      .pt-qp-alert-callout[data-ready=true]{transition:right 200ms cubic-bezier(.2,1,.3,1),top 160ms cubic-bezier(.2,1,.3,1),border-color 180ms ease,box-shadow 180ms ease}
      .pt-qp-alert-callout:hover{border-color:color-mix(in srgb,var(--warning) 58%,var(--border))}
      .pt-qp-alert-callout[data-tone=critical]:hover{border-color:color-mix(in srgb,var(--error) 62%,var(--border))}
      .pt-qp-alert-callout[data-state=exiting]{pointer-events:none;animation:pt-qp-alert-out 150ms cubic-bezier(.5,0,.82,.25) forwards}
      .pt-qp-alert-caret{position:absolute;top:-5px;width:9px;height:9px;transform:translateX(50%) rotate(45deg);background:var(--card);border-top:1px solid color-mix(in srgb,var(--warning) 42%,var(--border));border-left:1px solid color-mix(in srgb,var(--warning) 42%,var(--border));pointer-events:none}
      .pt-qp-alert-callout[data-ready=true] .pt-qp-alert-caret{transition:right 200ms cubic-bezier(.2,1,.3,1),border-color 180ms ease}
      .pt-qp-alert-callout:hover .pt-qp-alert-caret{border-top-color:color-mix(in srgb,var(--warning) 58%,var(--border));border-left-color:color-mix(in srgb,var(--warning) 58%,var(--border))}
      .pt-qp-alert-callout[data-tone=critical] .pt-qp-alert-caret{border-top-color:color-mix(in srgb,var(--error) 46%,var(--border));border-left-color:color-mix(in srgb,var(--error) 46%,var(--border))}
      .pt-qp-alert-callout[data-tone=critical]:hover .pt-qp-alert-caret{border-top-color:color-mix(in srgb,var(--error) 62%,var(--border));border-left-color:color-mix(in srgb,var(--error) 62%,var(--border))}
      .pt-qp-alert-head{display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px;color:var(--foreground)}
      .pt-qp-alert-head .pt-qp-tip-dot[data-tone=warning]{animation:pt-qp-dot-pulse-warn 2.6s ease-out .15s infinite}
      .pt-qp-alert-head .pt-qp-tip-dot[data-tone=critical]{animation:pt-qp-dot-pulse-crit 2s ease-out .15s infinite}
      .pt-qp-alert-list{display:flex;flex-direction:column;gap:4px;color:var(--secondary-foreground);font-size:12px}
      .pt-qp-alert-list .pt-qp-tip-row{animation:pt-qp-row-in 170ms cubic-bezier(.16,1,.3,1) both;animation-delay:calc(35ms + var(--pt-i,0) * 30ms)}
      .pt-qp-alert-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding-top:2px}
      @media(prefers-reduced-motion:reduce){.pt-qp-trigger-dot,.pt-qp-alert-callout,.pt-qp-alert-caret,.pt-qp-alert-head .pt-qp-tip-dot,.pt-qp-alert-list .pt-qp-tip-row{animation:none!important;transition:none!important}}
      .pt-qp-pop{display:flex!important;flex-direction:column!important;width:clamp(500px,64vw,940px)!important;max-width:calc(100vw - 24px)!important;height:clamp(420px,76vh,760px)!important;max-height:calc(100vh - 84px)!important;padding:0!important;overflow:hidden!important}
      .pt-qp-pop>*{display:flex;flex-direction:column;flex:1;min-height:0;width:100%;height:100%}
      .pt-qp{--pt-success-text:color-mix(in srgb,var(--success) 78%,var(--foreground));--pt-error-text:color-mix(in srgb,var(--error) 78%,var(--foreground));container-type:inline-size;container-name:agy-qp;display:flex;flex-direction:column;flex:1;min-height:0;width:100%;height:100%;max-height:100%;color:var(--foreground);font-size:13px;box-sizing:border-box;min-width:0}
      .pt-qp h3{margin:0;font-size:14.5px;font-weight:600!important;color:var(--foreground);letter-spacing:-.01em}
      .pt-qp .pt-stack{gap:14px}
      .pt-qp .pt-quota{padding:14px 16px;gap:10px}
      .pt-qp .pt-acct-table{min-width:660px}
      .pt-qp-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 10px;padding:10px 14px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--secondary) 24%,var(--card));flex:none;min-width:0}
      .pt-qp-brand{display:inline-flex;align-items:center;gap:6px;flex:none}
      .pt-qp-title{font-size:14px;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
      .pt-qp-tabs{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:9999px;border:1px solid var(--border);background:color-mix(in srgb,var(--secondary) 48%,var(--card));max-width:100%;overflow-x:auto;scrollbar-width:none}
      .pt-qp-tabs::-webkit-scrollbar{display:none}
      .pt-qp-tab{border:0;background:transparent;color:var(--muted-foreground);font:inherit;font-size:12px;font-weight:500;line-height:1;padding:6px 10px;border-radius:9999px;cursor:pointer;white-space:nowrap;transition:background 120ms ease,color 120ms ease}
      .pt-qp-tab:hover{color:var(--foreground)}
      .pt-qp-tab[aria-current=page]{background:var(--card);color:var(--foreground);box-shadow:0 1px 2px rgba(0,0,0,.14)}
      .pt-qp-tab:focus-visible{outline:2px solid var(--primary);outline-offset:-1px}
      .pt-qp-actions{display:inline-flex;align-items:center;gap:3px;flex:none}
      .pt-qp-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 16px;display:flex;flex-direction:column;gap:14px;scrollbar-gutter:stable}
      @container agy-qp (max-width:620px){
        .pt-qp .pt-grid2,.pt-qp .pt-metrics,.pt-qp .pt-acct-card-quotas{grid-template-columns:1fr}
        .pt-qp .pt-health-row{grid-template-columns:108px minmax(0,1fr) 38px}
        .pt-qp .pt-distribution-charts{gap:12px}
        .pt-qp .pt-proxy-grid{grid-template-columns:96px minmax(0,1fr) 76px}
      }
      @media(max-width:900px){.pt-content{padding:24px}.pt-grid2{grid-template-columns:1fr}}@media(max-width:600px){.pt-distribution-charts{gap:12px}.pt-distribution-legend-row{column-gap:12px}.pt-content{padding:16px}.pt-metrics{grid-template-columns:1fr}.pt-health-row{grid-template-columns:100px minmax(0,1fr) 36px}.pt-acct-card-quotas{grid-template-columns:1fr}}
    `;document.head.append(style);
    function Tabs({value,onChange,items,testId}){return h('nav',{className:'agy-pill pt-tabs','aria-label':'Powertools','data-testid':testId},...items.map(([key,label])=>h('button',{key,type:'button',className:'agy-pill pt-tab','aria-current':value===key?'page':undefined,'data-testid':testId==='agy-page-tabs'?`agy-tab-${key}`:undefined,onClick:()=>onChange(key),onKeyDown:event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=items.findIndex(([id])=>id===value),next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowRight'?1:-1)+items.length)%items.length;onChange(items[next][0]);event.currentTarget.parentElement.children[next].focus();}},t(label))));}
    function Select({value,onChange,label,items,testId}){const selected=items.find(([key])=>String(key)===String(value));const display=name=>['简体中文','繁體中文','English'].includes(name)?name:t(name);return h(kT,null,h(lT,{asChild:true},h('button',{type:'button','aria-label':t(label),'data-testid':testId,className:'agy-field pt-field'},h('span',null,display(selected?.[1]||label)),icon('expand_more'))),h(mT,{align:'end',className:'min-w-44 max-h-80 overflow-y-auto'},...items.map(([key,name])=>h(nT,{key,selected:String(key)===String(value),onClick:()=>onChange(key),'data-testid':testId?`${testId}-${key}`:undefined},display(name)))));}
    function CalendarDropdown({value,onChange,options:choices,...props}){const year=String(props['aria-label']||'').toLowerCase().includes('year')||Number(value)>31;return h(Select,{value,onChange:next=>onChange?.({target:{value:String(next)}}),label:year?text('选择年份','Choose year'):text('选择月份','Choose month'),items:choices.filter(option=>!option.disabled).map(option=>[option.value,option.label]),testId:year?'agy-calendar-year':'agy-calendar-month'});}
    function DateRangePicker({start,end,onChange}){const [open,setOpen]=R.useState(false),Calendar=globalThis.__agyLoadCalendar?.().DateRangeCalendar,from=start?new Date(start+'T00:00:00'):undefined,to=end?new Date(end+'T00:00:00'):undefined,label=from&&to?`${from.toLocaleDateString(env.options().language)} - ${to.toLocaleDateString(env.options().language)}`:text('选择日期范围','Select date range'),key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;return h(HC,{open,onOpenChange:setOpen,placement:'bottom-start'},h(IC,{asChild:true},h('button',{type:'button',className:'agy-field pt-field','data-testid':'agy-date-range','aria-label':text('选择日期范围','Select date range')},icon('schedule'),h('span',null,label))),h(JC,{className:'!w-auto p-0 max-w-[calc(100vw-32px)]','data-testid':'agy-date-range-popup','aria-label':text('日期范围','Date range'),role:'dialog'},Calendar&&h(Calendar,{value:from&&to?{from,to}:undefined,language:env.options().language,Dropdown:CalendarDropdown,Chevron:({orientation})=>icon(orientation==='left'?'chevron_left':'chevron_right'),onComplete:range=>{onChange(key(range.from),key(range.to));setOpen(false);}})));}
    function Tip({label,children}){const id=R.useId();return h(R.Fragment,null,h('span',{'data-tooltip-id':id,tabIndex:0},children),h(Sy,{id},label));}
    function Refresh({onClick,busy,label='刷新数据',testId}){return h(Uy,{variant:'ghost',size:'icon-lg',onClick,disabled:busy,tooltip:t(label),'aria-label':t(label),'data-testid':testId,className:'rounded-full border border-border'},icon('refresh',18,{className:busy?'animate-spin':''}));}
    function Spark({values}){const max=Math.max(1,...values),line=values.map((value,i)=>`${i/(values.length-1)*300},${34-value/max*30}`).join(' ');return h('svg',{viewBox:'0 0 300 36',className:'pt-spark',preserveAspectRatio:'none','aria-hidden':true},h('polyline',{points:`0,36 ${line} 300,36`,fill:'currentColor',opacity:.08}),h('polyline',{points:line,fill:'none',stroke:'currentColor',strokeWidth:1.5,vectorEffect:'non-scaling-stroke'}));}
    function formatStepDur(ms){if(!Number.isFinite(ms)||ms<0)return '';if(ms<1000)return `${(Math.max(100,Math.round(ms/100)*100)/1000).toFixed(1)}s`;if(ms<60000)return `${(ms/1000).toFixed(1)}s`;return `${Math.floor(ms/60000)}m ${Math.floor(ms%60000/1000)}s`;}
    function formatClock(ms){if(!Number.isFinite(ms)||ms<0)return '';return `${Math.floor(ms/60000)}:${String(Math.floor(ms%60000/1000)).padStart(2,'0')}`;}
    const ORB_SEARCH_RE=/search|read|view|grep|find|list|glob|browse|inspect|resource|fetch|web|doc|wiki|drive|outline|symbol|lookup|query/i;
    const ORB_CONNECT_RE=/subagent|swarm|agent|message|mcp|connect|sync|remote|ssh|quota|account|auth|login/i;
    function resolveProgressOrbMode({status='idle',phase='',phaseDetail='',recentActivity=[]}={}){
      if(status==='error')return 'error';
      if(status==='complete')return 'complete';
      if(status==='stopped')return 'stopped';
      if(status==='canceling')return 'working';
      if(status!=='running')return 'idle';
      if(phase==='waiting')return 'breathing';
      if(phase==='subagent'||phase==='background'||phase==='retrying')return 'connecting';
      if(phase==='streaming')return 'composing';
      if(phase==='tool'){
        const activeCall=Array.isArray(recentActivity)?recentActivity.find(c=>c&&c.status==='running'):null;
        const hint=`${phaseDetail||''} ${activeCall?.label||''} ${activeCall?.groupKey||''}`;
        if(ORB_CONNECT_RE.test(hint))return 'connecting';
        if(ORB_SEARCH_RE.test(hint)||activeCall?.groupKey==='reads'||activeCall?.groupKey==='searches')return 'searching';
        return 'working';
      }
      if(phaseDetail==='waiting-model')return 'connecting';
      return 'solving';
    }
    const ORB_N=128;
    const ORB_SEEDS=(()=>{
      const out=[],ga=Math.PI*(3-Math.sqrt(5)),rings=8,perRing=16;
      for(let i=0;i<ORB_N;i++){
        // 1. Fibonacci uniform sphere (searching / wave base)
        const fy=1-((i+0.5)/ORB_N)*2,fr=Math.sqrt(Math.max(0,1-fy*fy)),fth=ga*i;
        // 2. Latitude-longitude spherical grid (solving)
        const row=Math.floor(i/perRing),col=i%perRing;
        const latPhi=((row+0.8)/(rings+0.6))*Math.PI;
        const latTh=(col/perRing)*Math.PI*2;
        // 3. Harmonic constellation & swarm parameters (working / connecting)
        const hash1=((i*37+13)%97)/97,hash2=((i*53+29)%89)/89,hash3=((i*71+7)%83)/83;
        out.push({
          fx:Math.cos(fth)*fr,fy,fz:Math.sin(fth)*fr,fth,
          row,col,latPhi,latTh,
          h1:hash1,h2:hash2,h3:hash3,
          orbAx:(hash1-0.5)*2.4,orbAy:hash2*Math.PI*2,orbSpd:(hash3>0.5?1:-1)*(0.75+hash1*1.1),
          nodePhi:Math.acos(1-2*((i%26)+0.5)/26),nodeTh:Math.PI*(1+Math.sqrt(5))*(i%26)
        });
      }
      return out;
    })();
    const rot3=(x,y,z,ax,ay)=>{
      const ca=Math.cos(ay),sa=Math.sin(ay),x1=x*ca+z*sa,z1=-x*sa+z*ca;
      const cb=Math.cos(ax),sb=Math.sin(ax),y2=y*cb-z1*sb,z2=y*sb+z1*cb;
      return[x1,y2,z2];
    };
    const orbParticleTarget=(mode,i,t)=>{
      const s=ORB_SEEDS[i];
      if(mode==='complete'||mode==='stopped'||mode==='error'){
        const ang=(i/ORB_N)*Math.PI*2-Math.PI/2;
        const jitter=mode==='error'?(((i*3)%5)-2)*0.045:0;
        const visible=i%3===0;
        const rad=1.02+jitter;
        const [x,y,z]=rot3(Math.cos(ang)*rad,Math.sin(ang)*rad,0,0.12,-0.08);
        return{x,y,z,a:visible?(mode==='stopped'?0.52:0.78):0,r:visible?0.78:0.4};
      }
      if(mode==='idle'){
        const ang=(i/ORB_N)*Math.PI*2;
        const visible=i%4===0;
        return{x:Math.cos(ang)*0.94,y:Math.sin(ang)*0.94,z:0,a:visible?0.42:0,r:0.72};
      }
      if(mode==='breathing'){
        const b=Math.sin(t*1.9);
        const outer=i<84;
        const idx=outer?i:(i-84),cnt=outer?84:44;
        const ang=(idx/cnt)*Math.PI*2+(outer?t*0.22:-t*0.3);
        const rad=outer?(0.98+b*0.07):(0.66-b*0.05);
        const visible=idx%2===0;
        const [x,y,z]=rot3(Math.cos(ang)*rad,Math.sin(ang)*rad,Math.sin(ang*2)*0.06,0.12,Math.sin(t*0.5)*0.12);
        return{x,y,z,a:visible?(outer?0.82:0.42):0,r:outer?0.74:0.6};
      }
      if(mode==='solving'){
        // Dense lat-long spherical dot-matrix globe with alternating row spin & periodic lock
        const lock=Math.sin(t*0.85);
        const rowDir=s.row%2===0?1:-1;
        const twist=Math.max(0,lock)*0.55*rowDir;
        const th=s.latTh+t*0.42*rowDir+twist;
        const sp=Math.sin(s.latPhi),cp=Math.cos(s.latPhi);
        const [x,y,z]=rot3(sp*Math.cos(th),cp,sp*Math.sin(th),0.32,t*0.38);
        return{x,y,z,a:0.84,r:0.72};
      }
      if(mode==='searching'){
        // Dense Fibonacci dot sphere with luminous meridian radar scan sweep
        const [x,y,z]=rot3(s.fx,s.fy,s.fz,0.26,t*0.52);
        const scan=(t*2.1)%(Math.PI*2);
        const ang=(Math.atan2(x,z)+Math.PI*2)%(Math.PI*2);
        let diff=Math.abs(ang-scan);if(diff>Math.PI)diff=Math.PI*2-diff;
        const beam=Math.max(0,1-diff/0.52);
        return{x,y,z,a:0.36+beam*0.64,r:0.62+beam*0.44};
      }
      if(mode==='composing'){
        // Sculpted round silk-wave sphere (polar-tapered harmonic ripple across a perfect sphere)
        const col=i%16,row=Math.floor(i/16);
        const u=(col/16)*Math.PI*2+t*0.42;
        const v=((row+0.6)/8.2)*Math.PI;
        const sp=Math.sin(v),cp=Math.cos(v);
        const ripple=Math.sin(u*2-t*2.8+row*0.65)*0.11*sp;
        const rad=0.98+ripple;
        const [x,y,z]=rot3(sp*Math.cos(u)*rad,cp*rad,sp*Math.sin(u)*rad,0.26,t*0.32);
        const crest=0.5+0.5*Math.sin(u*2-t*2.8+row*0.65);
        return{x,y,z,a:0.32+crest*0.66,r:0.62+crest*0.3};
      }
      if(mode==='working'){
        // Energetic spherical vortex swarm maintaining a crisp round 3D silhouette
        const phi0=Math.acos(Math.max(-1,Math.min(1,s.fy)));
        const flow=t*(0.9+0.55*Math.sin(phi0*2-t*1.2));
        const th=s.fth+flow;
        const phi=Math.max(0.14,Math.min(Math.PI-0.14,phi0+Math.sin(t*1.7+s.h1*6.283)*0.16));
        const sp=Math.sin(phi),cp=Math.cos(phi);
        const rad=0.96+0.06*Math.sin(t*2.4+s.h2*6.283);
        const [x,y,z]=rot3(sp*Math.cos(th)*rad,cp*rad,sp*Math.sin(th)*rad,0.24,t*0.45);
        const pulse=0.5+0.5*Math.sin(t*3.2+s.h3*6.283);
        return{x,y,z,a:0.34+pulse*0.62,r:0.6+pulse*0.34};
      }
      // connecting: 26 bright constellation nodes on sphere shell + faint atmospheric sphere dust
      if(i<26){
        const phi=s.nodePhi+Math.sin(t*(0.24+s.h1*0.3)+s.h2*6.283)*0.22;
        const th=s.nodeTh+t*(0.28+s.h3*0.26);
        const [x,y,z]=rot3(Math.sin(phi)*Math.cos(th),Math.cos(phi),Math.sin(phi)*Math.sin(th),0.22,t*0.22);
        return{x,y,z,a:0.94,r:0.86};
      }
      const [x,y,z]=rot3(s.fx*0.96,s.fy*0.96,s.fz*0.96,0.22,t*0.26);
      return{x,y,z,a:0.2,r:0.52};
    };
    const isOrbDark=el=>Boolean(el?.closest?.('.dark')||(typeof document!=='undefined'&&document?.documentElement?.classList?.contains?.('dark')));
    const drawMorphOrb=(ctx,size,particles,channels,t,isDark,tiltX=0,tiltY=0)=>{
      const cx=size/2,cy=size/2,R=size*0.37,fov=3.4,unit=size/44;
      const mono=isDark?[244,244,246]:[24,24,27];
      const rgba=a=>`rgba(${mono[0]},${mono[1]},${mono[2]},${Math.max(0,Math.min(1,a)).toFixed(3)})`;
      ctx.clearRect(0,0,size,size);
      const proj=(x,y,z)=>{
        const [rx,ry,rz]=tiltX||tiltY?rot3(x,y,z,tiltX,tiltY):[x,y,z];
        const s=fov/(fov-rz);
        return{sx:cx+rx*R*s,sy:cy+ry*R*s,z:rz,s,d:(rz+1)*0.5};
      };
      const projected=new Array(particles.length);
      for(let i=0;i<particles.length;i++){
        const p=particles[i];
        projected[i]={...proj(p.x,p.y,p.z),a:p.a,r:p.r,i};
      }
      // Subtle constellation edges when connecting channel is active
      if(channels.edge>0.01){
        ctx.lineWidth=Math.max(0.55,unit*0.6);
        const nodeCount=Math.min(26,particles.length);
        const activeEdges=[];
        for(let i=0;i<nodeCount;i++){
          const a0=particles[i],pa=projected[i];
          for(let j=i+1;j<nodeCount;j++){
            const b0=particles[j];
            const dist=Math.hypot(a0.x-b0.x,a0.y-b0.y,a0.z-b0.z);
            if(dist<0.95){
              const pb=projected[j];
              const fade=(1-dist/0.95)*(0.2+0.8*((pa.d+pb.d)*0.5))*channels.edge;
              ctx.strokeStyle=rgba(fade*(isDark?0.46:0.36));
              ctx.beginPath();ctx.moveTo(pa.sx,pa.sy);ctx.lineTo(pb.sx,pb.sy);ctx.stroke();
              if(activeEdges.length<4&&fade>0.22)activeEdges.push([pa,pb]);
            }
          }
        }
        for(let k=0;k<activeEdges.length;k++){
          const [pa,pb]=activeEdges[k],u=(t*0.85+k*0.33)%1;
          ctx.fillStyle=rgba(0.9*channels.edge);
          ctx.beginPath();ctx.arc(pa.sx+(pb.sx-pa.sx)*u,pa.sy+(pb.sy-pa.sy)*u,Math.max(0.75,unit*0.95),0,Math.PI*2);ctx.fill();
        }
      }
      // Sort back-to-front for crisp 3D depth shading
      projected.sort((a,b)=>a.z-b.z);
      for(const p of projected){
        if(p.a<0.015)continue;
        const depthAlpha=p.a*(0.16+0.84*Math.pow(p.d,1.15));
        ctx.fillStyle=rgba(depthAlpha*(isDark?0.96:0.88));
        ctx.beginPath();
        ctx.arc(p.sx,p.sy,Math.max(0.45,p.r*unit*p.s),0,Math.PI*2);
        ctx.fill();
      }
      // Smoothly cross-faded terminal center marks (complete / stopped / error)
      if(channels.check>0.02||channels.stop>0.02||channels.err>0.02){
        ctx.save();
        ctx.lineCap='round';ctx.lineJoin='round';
        ctx.lineWidth=Math.max(1.65,size*0.042);
        if(channels.check>0.02){
          ctx.strokeStyle=rgba(0.88*channels.check);
          ctx.beginPath();
          ctx.moveTo(cx-size*0.12,cy+size*0.01);
          ctx.lineTo(cx-size*0.03,cy+size*0.1);
          ctx.lineTo(cx+size*0.13,cy-size*0.09);
          ctx.stroke();
        }
        if(channels.stop>0.02){
          ctx.fillStyle=rgba(0.68*channels.stop);
          const sq=size*0.15;
          ctx.beginPath();
          if(ctx.roundRect)ctx.roundRect(cx-sq/2,cy-sq/2,sq,sq,size*0.032);
          else ctx.rect(cx-sq/2,cy-sq/2,sq,sq);
          ctx.fill();
        }
        if(channels.err>0.02){
          ctx.strokeStyle=rgba(0.88*channels.err);
          ctx.fillStyle=rgba(0.88*channels.err);
          ctx.beginPath();ctx.moveTo(cx,cy-size*0.12);ctx.lineTo(cx,cy+size*0.03);ctx.stroke();
          ctx.beginPath();ctx.arc(cx,cy+size*0.11,Math.max(1.1,size*0.026),0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
    };
    const makeInitialOrbState=mode=>{
      const t=1.2;
      const particles=Array.from({length:ORB_N},(_,i)=>orbParticleTarget(mode,i,t));
      const channels={edge:mode==='connecting'?1:0,check:mode==='complete'?1:0,stop:mode==='stopped'?1:0,err:mode==='error'?1:0};
      return{mode,particles,channels,t,tiltX:0,tiltY:0,targetX:0,targetY:0,wake:null};
    };
    function ProgressOrb({percent=null,status='idle',phase='',phaseDetail='',recentActivity=[],warning=false,size=44,forceAnimate=false}){
      const mode=resolveProgressOrbMode({status,phase,phaseDetail,recentActivity});
      const wrapRef=R.useRef?R.useRef(null):{current:null};
      const canvasRef=R.useRef?R.useRef(null):{current:null};
      const stateRef=R.useRef?R.useRef(null):{current:null};
      if(!stateRef.current)stateRef.current=makeInitialOrbState(mode);
      const prevMode=stateRef.current.mode;
      stateRef.current.mode=mode;
      const isAnimated=forceAnimate||mode==='solving'||mode==='searching'||mode==='working'||mode==='composing'||mode==='connecting'||mode==='breathing';
      stateRef.current.isAnimated=isAnimated;
      const modeTip=mode==='solving'?text('思考推演','Solving')
        :mode==='searching'?text('检索查阅','Searching')
        :mode==='working'?text('工具执行','Working')
        :mode==='composing'?text('生成回复','Composing')
        :mode==='connecting'?text('协作连接','Connecting')
        :mode==='breathing'?text('等待确认','Waiting')
        :mode==='complete'?text('已完成','Complete')
        :mode==='stopped'?text('已停止','Stopped')
        :mode==='error'?text('执行异常','Error')
        :text('空闲待命','Idle');
      const tipText=percent==null?modeTip:`${modeTip} ${percent}%`;
      if(R.useEffect){
        R.useEffect(()=>{
          const canvas=canvasRef.current,wrap=wrapRef.current;
          if(!canvas||!wrap||typeof canvas.getContext!=='function')return;
          const ctx=canvas.getContext('2d');
          if(!ctx)return;
          const dpr=Math.min(3,Math.max(2,Number(globalThis.devicePixelRatio)||2));
          const px=Math.round(size*dpr);
          if(canvas.width!==px||canvas.height!==px){canvas.width=px;canvas.height=px;}
          const reduced=Boolean(typeof globalThis.matchMedia==='function'&&globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
          let rafId=0,lastMs=0,stopped=false;
          const drawNow=()=>{
            const st=stateRef.current;
            ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
            drawMorphOrb(ctx,size,st.particles,st.channels,st.t,isOrbDark(wrap),st.tiltX,st.tiltY);
            ctx.restore();
          };
          const snapToTarget=()=>{
            const st=stateRef.current;
            for(let i=0;i<ORB_N;i++)st.particles[i]=orbParticleTarget(st.mode,i,st.t);
            st.channels.edge=st.mode==='connecting'?1:0;
            st.channels.check=st.mode==='complete'?1:0;
            st.channels.stop=st.mode==='stopped'?1:0;
            st.channels.err=st.mode==='error'?1:0;
            drawNow();
          };
          const step=now=>{
            if(stopped)return;
            if(typeof document==='object'&&document.hidden){rafId=0;return;}
            const dt=lastMs?Math.min(0.05,Math.max(0.001,(now-lastMs)/1000)):0.016;
            lastMs=now;
            const st=stateRef.current;
            if(st.isAnimated)st.t+=dt;
            const k=1-Math.exp(-dt*6.2);
            st.tiltX+=(st.targetX-st.tiltX)*Math.min(1,dt*10);
            st.tiltY+=(st.targetY-st.tiltY)*Math.min(1,dt*10);
            let maxDelta=0;
            for(let i=0;i<ORB_N;i++){
              const p=st.particles[i],tg=orbParticleTarget(st.mode,i,st.t);
              const dx=tg.x-p.x,dy=tg.y-p.y,dz=tg.z-p.z,da=tg.a-p.a,dr=tg.r-p.r;
              p.x+=dx*k;p.y+=dy*k;p.z+=dz*k;p.a+=da*k;p.r+=dr*k;
              const d=Math.abs(dx)+Math.abs(dy)+Math.abs(dz)+Math.abs(da);
              if(d>maxDelta)maxDelta=d;
            }
            const chTargets={edge:st.mode==='connecting'?1:0,check:st.mode==='complete'?1:0,stop:st.mode==='stopped'?1:0,err:st.mode==='error'?1:0};
            for(const key of ['edge','check','stop','err']){
              const diff=chTargets[key]-st.channels[key];
              st.channels[key]+=diff*k;
              if(Math.abs(diff)>maxDelta)maxDelta=Math.abs(diff);
            }
            drawNow();
            if(!st.isAnimated&&maxDelta<0.004&&Math.abs(st.tiltX)<0.002&&Math.abs(st.tiltY)<0.002){
              snapToTarget();
              rafId=0;lastMs=0;return;
            }
            rafId=globalThis.requestAnimationFrame(step);
          };
          const wake=()=>{
            if(stopped)return;
            if(reduced||typeof globalThis.requestAnimationFrame!=='function'){snapToTarget();return;}
            if(!rafId){lastMs=0;rafId=globalThis.requestAnimationFrame(step);}
          };
          stateRef.current.wake=wake;
          if(stateRef.current.isAnimated&&!reduced&&typeof globalThis.requestAnimationFrame==='function'){
            wake();
          }else{
            snapToTarget();
          }
          const onVis=()=>{
            if(stopped)return;
            if(document.hidden){if(rafId){globalThis.cancelAnimationFrame?.(rafId);rafId=0;}lastMs=0;}
            else if(stateRef.current.isAnimated){wake();}
          };
          if(typeof document?.addEventListener==='function')document.addEventListener('visibilitychange',onVis);
          return()=>{
            stopped=true;
            stateRef.current.wake=null;
            if(rafId)globalThis.cancelAnimationFrame?.(rafId);
            if(typeof document?.removeEventListener==='function')document.removeEventListener('visibilitychange',onVis);
          };
        },[size]);
        R.useEffect(()=>{
          if(prevMode!==mode||isAnimated)stateRef.current.wake?.();
        },[mode,isAnimated]);
      }
      const onPointerMove=e=>{
        const rect=wrapRef.current?.getBoundingClientRect?.();
        if(!rect||!rect.width||!rect.height)return;
        const nx=((e.clientX-rect.left)/rect.width)*2-1;
        const ny=((e.clientY-rect.top)/rect.height)*2-1;
        stateRef.current.targetY=nx*0.28;
        stateRef.current.targetX=-ny*0.28;
      };
      const onPointerLeave=()=>{stateRef.current.targetX=0;stateRef.current.targetY=0;};
      const rArc=size/2-1.2,circ=2*Math.PI*rArc;
      return h('div',{
        ref:wrapRef,
        className:'pt-progress-orb',
        'data-testid':'agy-progress-orb',
        'data-orb-mode':mode,
        'data-pt-tip':tipText,
        'data-pt-tip-place':'left',
        role:percent==null?'img':'progressbar',
        'aria-label':`${t('任务进度')} ${tipText}`,
        'aria-valuenow':percent??undefined,
        'aria-valuemin':percent==null?undefined:0,
        'aria-valuemax':percent==null?undefined:100,
        onPointerMove:isAnimated?onPointerMove:undefined,
        onPointerLeave:isAnimated?onPointerLeave:undefined,
        style:{width:size,height:size,color:'var(--foreground)'}
      },
        h('canvas',{ref:canvasRef,'aria-hidden':true}),
        percent!=null&&h('svg',{className:'pt-progress-orb-arc',viewBox:`0 0 ${size} ${size}`,'aria-hidden':true},
          h('circle',{cx:size/2,cy:size/2,r:rArc,fill:'none',stroke:'color-mix(in srgb,var(--foreground) 12%,transparent)',strokeWidth:1.4}),
          h('circle',{cx:size/2,cy:size/2,r:rArc,fill:'none',stroke:'color-mix(in srgb,var(--foreground) 68%,transparent)',strokeWidth:1.4,strokeLinecap:'round',strokeDasharray:circ.toFixed(2),strokeDashoffset:(circ*(1-Math.max(0,Math.min(100,percent))/100)).toFixed(2),transform:`rotate(-90 ${size/2} ${size/2})`})));
    }
    const readOvOpen=(id,fallback=true)=>{try{const v=globalThis.localStorage?.getItem?.(`agy-powertools:ov-open:${id}`);return v==null?fallback:v!=='0';}catch{return fallback;}};
    const writeOvOpen=(id,open)=>{try{globalThis.localStorage?.setItem?.(`agy-powertools:ov-open:${id}`,open?'1':'0');}catch{}};
    const QUICK_BADGE_MUTE_KEY='agy-powertools:qp-badge-muted';
    const QUICK_BADGE_ACK_KEY='agy-powertools:qp-badge-ack';
    const readQuickBadgeStore=(k,fallback='')=>{try{const v=globalThis.localStorage?.getItem?.(k);return v==null?fallback:v;}catch{return fallback;}};
    const writeQuickBadgeStore=(k,v)=>{try{if(v)globalThis.localStorage?.setItem?.(k,v);else globalThis.localStorage?.removeItem?.(k);}catch{}};
    let quickBadgeRev=0,quickBadgeMuted=readQuickBadgeStore(QUICK_BADGE_MUTE_KEY)==='1',quickBadgeAck=readQuickBadgeStore(QUICK_BADGE_ACK_KEY,'');
    const quickBadgeSubs=new Set();
    const emitQuickBadge=()=>{quickBadgeRev++;for(const fn of quickBadgeSubs)fn();};
    const useQuickBadgePrefs=()=>R.useSyncExternalStore(fn=>{quickBadgeSubs.add(fn);return()=>quickBadgeSubs.delete(fn);},()=>quickBadgeRev);
    const setQuickBadgeMuted=muted=>{quickBadgeMuted=Boolean(muted);writeQuickBadgeStore(QUICK_BADGE_MUTE_KEY,quickBadgeMuted?'1':'');emitQuickBadge();};
    const setQuickBadgeAck=key=>{quickBadgeAck=String(key||'');writeQuickBadgeStore(QUICK_BADGE_ACK_KEY,quickBadgeAck);emitQuickBadge();};
    const renderOverviewSection=({testId,toggleTestId,title,badge,badgeTone,open,onToggle,extraProps={},bodyClass='pt-ov-body',children})=>h('section',{'data-testid':testId,className:'pt-ov-sec',...extraProps},
      h('button',{type:'button',className:'pt-ov-toggle','aria-expanded':open,'data-testid':toggleTestId,onClick:onToggle},
        h('span',{className:'pt-ov-title'},title),
        badge!=null&&badge!==''&&h('span',{className:'pt-ov-badge','data-tone':badgeTone||undefined},badge),
        icon('chevron_right',16,{className:'pt-ov-chev','aria-hidden':true})),
      open&&h('div',{className:bodyClass},...children));
    function Progress(){
      useData();
      const data=env.currentState?env.currentState():env.state();
      const opts=env.options?.()||{};
      const [nowMs,setNowMs]=R.useState?R.useState(()=>Date.now()):[Date.now(),()=>{}];
      const [open,setOpen]=R.useState?R.useState(()=>readOvOpen('progress',true)):[true,()=>{}];
      const p=data?.progress||{};
      const tasks=p.stale?[]:p.tasks||[];
      const done=tasks.filter(task=>task.status==='complete').length;
      const status=p.status||(tasks.length&&done===tasks.length?'complete':'idle');
      const isLive=status==='running'||status==='canceling';
      if(R.useEffect){
        R.useEffect(()=>{if(!isLive)return;const timer=setInterval(()=>setNowMs(Date.now()),1000);return()=>clearInterval(timer);},[isLive]);
      }
      if(!data||!opts.progress)return null;
      const en=opts.language==='en';
      const percent=tasks.length?Math.round(done/tasks.length*100):null;
      const liveElapsedMs=isLive&&Number.isFinite(p.startedAtMs)?Math.max(p.elapsedMs||0,nowMs-p.startedAtMs):p.elapsedMs;
      const elapsedText=formatClock(liveElapsedMs);
      const waitSec=Number.isFinite(p.phaseElapsedMs)?Math.floor(p.phaseElapsedMs/1000):0;
      const retryReason=p.retrySummary?(en?p.retrySummary.en:p.retrySummary.zh):'';
      const stateLabel=status==='stopped'?text('已停止','Stopped'):status==='canceling'?text('正在停止','Stopping'):t(status==='running'?'进行中':status==='error'?'错误':status==='complete'?'已完成':'等待任务');
      const phaseText=status==='running'&&p.phase?(
        p.phase==='subagent'?(p.activeSubagentCount>1?text(`子智能体运行中（${p.activeSubagentCount} 个）`,`Subagents running (${p.activeSubagentCount})`):text(`子智能体运行中${p.phaseDetail?`：${p.phaseDetail}`:''}`,`Subagent running${p.phaseDetail?`: ${p.phaseDetail}`:''}`))
          :p.phase==='background'?text('等待后台任务完成','Waiting for background tasks')
          :p.phase==='waiting'?text(`等待操作确认${p.phaseDetail?`：${p.phaseDetail}`:''}`,`Waiting for approval${p.phaseDetail?`: ${p.phaseDetail}`:''}`)
          :p.phase==='retrying'?text(`正在重试${p.retryCount>0?`（第 ${p.retryCount} 次）`:''}`,`Retrying${p.retryCount>0?` (#${p.retryCount})`:''}`)
          :p.phase==='tool'?text(`正在执行：${p.phaseDetail||'工具'}`,`Running: ${p.phaseDetail||'tool'}`)
          :p.phase==='streaming'?text('正在生成回复','Generating response')
          :p.phaseDetail==='thinking'?text(`正在思考${waitSec>=3?` (${waitSec}s)`:''}`,`Thinking${waitSec>=3?` (${waitSec}s)`:''}`)
          :p.phaseDetail==='waiting-model'?text(`等待模型响应${waitSec>=3?` (${waitSec}s)`:''}`,`Waiting for model${waitSec>=3?` (${waitSec}s)`:''}`)
          :text(`思考与响应中${waitSec>=3?` (${waitSec}s)`:''}`,`Thinking${waitSec>=3?` (${waitSec}s)`:''}`)
      ):'';
      const isWarning=status==='running'&&(p.phase==='waiting'||p.phase==='retrying');
      const current=(!p.stale&&(p.current||p.title))||tasks.find(task=>task.status==='running')?.title||tasks.find(task=>task.status!=='complete')?.title;
      const headline=phaseText||current||stateLabel;
      const subText=status==='running'&&p.phase==='retrying'&&retryReason?retryReason:'';
      const shortLive=p.phase==='waiting'?text('等待确认','Approval'):p.phase==='retrying'?text('重试中','Retrying'):p.phase==='subagent'?text('子智能体','Subagent'):p.phase==='background'?text('后台任务','Background'):stateLabel;
      const badgeTone=isWarning?'warning':isLive?'active':status==='error'?'critical':undefined;
      const badge=open
        ?(tasks.length>0?`${done}/${tasks.length}`:p.toolCount>0?String(p.toolCount):'')
        :(tasks.length>0?`${done}/${tasks.length}`:(elapsedText?`${shortLive} ${elapsedText}`:shortLive));
      return renderOverviewSection({
        testId:'agy-progress-panel',
        toggleTestId:'agy-progress-toggle',
        title:t('任务进度'),
        badge,
        badgeTone,
        open,
        onToggle:()=>{setOpen(prev=>{const next=!prev;writeOvOpen('progress',next);return next;});},
        extraProps:{'data-conversation-id':data.conversationId},
        children:[
          h('div',{className:'pt-progress-header'},
            h(ProgressOrb,{percent,status,phase:p.phase,phaseDetail:p.phaseDetail,recentActivity:p.recentActivity,warning:isWarning}),
            h('div',{className:'pt-progress-heading'},
              h('div',{className:'pt-progress-title','data-phase':phaseText?p.phase:undefined,'data-testid':phaseText?'agy-progress-phase':undefined,'data-pt-tip':p.retryError||headline,'data-pt-tip-place':'left'},headline),
              subText&&h('div',{className:'pt-progress-sub','data-pt-tip':p.retryError||subText,'data-pt-tip-place':'left'},subText))),
          tasks.length>0&&h('div',{className:'pt-task-list'},...tasks.map((task,index)=>h('div',{key:index,className:'pt-task','data-status':task.status},icon(task.status==='complete'?'check_circle':task.status==='running'?'progress_activity':'schedule',14,{className:task.status==='running'?'animate-spin':''}),h('span',{className:'pt-task-label','data-pt-tip':task.title,'data-pt-tip-place':'left'},task.title)))),
          p.recentActivity?.length>0&&h('div',{'data-testid':'agy-progress-activity',className:'pt-trail'},...p.recentActivity.map(call=>{
            const dur=call.status==='running'?text('执行中','Running'):(formatStepDur(call.durationMs)||'');
            return h('div',{key:call.id,className:'pt-trail-node','data-status':call.status,'data-pt-tip':call.detail||call.label,'data-pt-tip-mono':call.detail?'true':undefined,'data-pt-tip-place':'left'},
              h('span',{className:'pt-trail-dot-wrap','aria-hidden':true},h('span',{className:'pt-trail-dot'})),
              h('span',{className:'pt-trail-label'},call.label),
              dur&&h('span',{className:'pt-trail-dur'},dur));
          })),
          (p.toolCount>0||elapsedText)&&h('div',{className:'pt-row pt-muted'},
            p.toolCount>0&&h('span',null,`${t('工具调用')} ${p.toolCount}`),
            elapsedText&&h('span',{'data-testid':'agy-progress-elapsed',className:'tabular-nums',style:{marginLeft:'auto'}},text('用时 ','Elapsed ')+elapsedText))
        ]
      });
    }
    const readBucketFraction=b=>{const raw=b?.remaining?.case==='remainingFraction'?b.remaining.value:b?.remainingFraction;return typeof raw==='number'&&Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):null;};
    const readBucketResetMs=(b,frac=readBucketFraction(b))=>{if(frac!=null&&frac>=1&&b?.description==='')return null;return D?.timestampToMs?D.timestampToMs(b?.resetTime??b?.resetTimeMs):(Number.isFinite(b?.resetTimeMs)?b.resetTimeMs:(b?.resetTime?.seconds!=null?Number(b.resetTime.seconds)*1000+Math.floor((Number(b.resetTime.nanos)||0)/1e6):null));};
    const normalizeLiveGroups=rawGroups=>(Array.isArray(rawGroups)?rawGroups:[]).filter(g=>g&&typeof g==='object').map(g=>({
      displayName:typeof g.displayName==='string'?g.displayName:'',
      buckets:(Array.isArray(g.buckets)?g.buckets:[]).filter(b=>b&&b.disabled!==true).map(b=>{
        const remainingFraction=readBucketFraction(b);
        return{bucketId:String(b.bucketId||''),window:b.window==='weekly'||/weekly/i.test(b.bucketId||'')?'weekly':'5h',remainingFraction,resetTimeMs:readBucketResetMs(b,remainingFraction)};
      })
    }));
    const fuseActiveAccount=(acct,isActive,liveGroups,capEmail)=>{
      if(!acct||!isActive||!Array.isArray(liveGroups)||!liveGroups.length)return acct;
      const acctEmail=String(acct.email||'').trim().toLowerCase(),liveEmail=String(capEmail||'').trim().toLowerCase();
      if(liveEmail&&acctEmail&&liveEmail!==acctEmail)return acct;
      return{...acct,groups:liveGroups};
    };
    const groupQuotaHint=(group,bucket,winMode)=>{
      const weeklyBucket=winMode==='5h'&&bucket?.window==='5h'?group.buckets.find(item=>item.window==='weekly'):null;
      const weeklyTight=Boolean(weeklyBucket&&!weeklyBucket.isReset&&(weeklyBucket.tone==='critical'||weeklyBucket.tone==='warning')&&(bucket.effectiveFraction==null||(weeklyBucket.effectiveFraction!=null&&weeklyBucket.effectiveFraction<bucket.effectiveFraction)));
      const displayTone=weeklyTight?weeklyBucket.tone:(bucket?.tone||'ok');
      const weeklyPct=weeklyTight&&weeklyBucket?.effectiveFraction!=null?Math.round(weeklyBucket.effectiveFraction*100):null;
      const parts=[];
      if(bucket?.isReset)parts.push(text('按上次记录的重置窗口本地推算（非实时）','Estimated locally from last recorded reset window'));
      if(weeklyPct!=null)parts.push(text(`周限额仅剩 ${weeklyPct}%`,`Weekly quota at ${weeklyPct}%`));
      return{displayTone,weeklyTight,weeklyPct,tip:parts.length?parts.join(env.options?.()?.language==='en'?'; ':'；'):undefined};
    };
    function OverviewQuota(){
      useData();
      const opts=env.options?.()||{};
      const groups=env.account?.()?.groups||[];
      const [open,setOpen]=R.useState?R.useState(()=>readOvOpen('quota',true)):[true,()=>{}];
      if(!opts.overviewQuota||!groups.length)return null;
      const lang=opts.language||'zh-CN',now=Date.now(),H=helpers();
      const shortLabel=g=>{const m=H?.quotaGroupMeta?.(g);if(m?.compactName)return m.compactName;const name=g?.displayName||'';return /argon/i.test(name)?'Argon':/claude|gpt/i.test(name)?'Claude/GPT':/gemini/i.test(name)?'Gemini':name||'-';};
      const fmtReset=ms=>ms?(H?.formatResetCountdown?H.formatResetCountdown(ms,now,lang):new Date(ms).toLocaleString(lang,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})):'';
      let minBucket=null;
      const rows=groups.map((group,idx)=>{
        const buckets=(Array.isArray(group?.buckets)?group.buckets:[]).filter(b=>b&&b.disabled!==true).map(b=>{
          const frac=readBucketFraction(b),resetMs=readBucketResetMs(b,frac),win=b?.window==='weekly'||/weekly/i.test(b?.bucketId||'')?'weekly':'5h';
          const pct=frac==null?null:Math.round(frac*100);
          const tone=pct==null?'ok':pct<10?'critical':pct<25?'warning':'ok';
          const item={win,pct,tone,resetMs,id:b?.bucketId||`${idx}-${win}`};
          if(pct!=null&&(!minBucket||pct<minBucket.pct))minBucket=item;
          return item;
        }).filter(b=>b.pct!=null);
        const ordered=[...buckets.filter(b=>b.win==='5h'),...buckets.filter(b=>b.win==='weekly')];
        return ordered.length?{group,idx,ordered}:null;
      }).filter(Boolean);
      if(!rows.length)return null;
      const badge=open?String(rows.length):(minBucket?`${minBucket.pct}%`:String(rows.length));
      const badgeTone=!open&&minBucket&&minBucket.tone!=='ok'?minBucket.tone:undefined;
      return renderOverviewSection({
        testId:'agy-overview-quota',
        toggleTestId:'agy-overview-quota-toggle',
        title:text('当前额度','Quota'),
        badge,
        badgeTone,
        open,
        onToggle:()=>{setOpen(prev=>{const next=!prev;writeOvOpen('quota',next);return next;});},
        bodyClass:'pt-ov-quota-body',
        children:rows.map(({group,idx,ordered})=>h('button',{
          key:group.displayName||idx,type:'button',className:'pt-ov-quota-row',
          'data-testid':`agy-overview-quota-row-${idx}`,
          onClick:()=>{env.openManagementTab?.('quota');}
        },
          h('span',{className:'pt-label',style:{fontWeight:500}},shortLabel(group)),
          h('span',{className:'pt-ov-quota-pills'},...ordered.map(b=>{
            const winLbl=b.win==='weekly'?text('周','7d'):'5h';
            const resetTip=fmtReset(b.resetMs);
            return h('span',{key:b.id,className:'pt-ov-qpill','data-tone':b.tone,'data-pt-tip':resetTip?`${winLbl} ${b.pct}% (${resetTip})`:`${winLbl} ${b.pct}%`,'data-pt-tip-place':'left'},
              h('span',{className:'pt-muted',style:{fontSize:10.5}},winLbl),
              h('span',null,`${b.pct}%`),
              h('span',{className:'pt-ov-qpill-bar',style:{width:`${b.pct}%`}}));
          }))))
      });
    }
    function Outline(){useData();const data=env.currentState?env.currentState():env.state();if(!data||!env.options().keepTurnOutline)return null;return h('nav',{'aria-label':text('会话目录','Conversation outline'),'data-testid':'agy-turn-outline',className:'pt-outline'},...data.turns.map(turn=>h('button',{key:turn.turnNumber,type:'button','data-pt-tip':`${turn.turnNumber}. ${turn.promptTitle}`,'data-pt-tip-place':'right','aria-label':`${turn.turnNumber}. ${turn.promptTitle}`,onClick:()=>env.navigateTurn(turn)},h('span',{style:{width:6,height:6,borderRadius:'50%',background:'currentColor'}}))));}
    function Metric({label,value,detail,values,iconName,tip}){return h('div',{className:'pt-card pt-metric','data-pt-tip':tip},h('div',{className:'pt-row pt-muted'},h('span',null,t(label)),icon(iconName,18)),h('div',{className:'pt-value'},value),detail&&h('div',{className:'pt-muted'},detail),h(Spark,{values}));}
    function Heatmap({requests,range}){
      const [metric,setMetric]=R.useState('tokens');
      const totalCells=371;
      const fmtVal=v=>metric==='cost'?money(v):n(v);
      const cellStyle=(v,max)=>v?{background:'var(--primary)',opacity:.2+.8*Math.ceil(v/max*4)/4}:undefined;
      const metricOf=r=>metric==='tokens'?(r.inputTokens||0)+(r.cacheReadTokens||0)+(r.outputTokens||0):metric==='cost'?(r.costUsd||0):1;
      const rangeEnd=Number.isFinite(range?.end)?range.end:Date.now();
      const rangeStart=Number.isFinite(range?.start)&&range.start<rangeEnd?range.start:rangeEnd-864e5;
      const spanMs=Math.max(60000,rangeEnd-rangeStart);
      const spanDays=spanMs/864e5;
      const pad2=v=>String(v).padStart(2,'0');
      const fmtDate=d=>`${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
      const fmtTime=d=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      const dayKey=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

      let cells=[],ticks=[];
      if(spanDays>=365){
        const days=new Map();
        for(const r of requests){
          if(!Number.isFinite(r.timestampMs))continue;
          const k=dayKey(new Date(r.timestampMs));
          days.set(k,(days.get(k)||0)+metricOf(r));
        }
        const start=new Date(rangeEnd);start.setHours(12,0,0,0);start.setDate(start.getDate()-364-start.getDay());
        const max=Math.max(1e-9,...days.values());
        for(let i=0;i<totalCells;i++){
          const d=new Date(start);d.setDate(start.getDate()+i);
          const key=dayKey(d),v=days.get(key)||0,tip=`${key}: ${fmtVal(v)}`;
          cells.push(h('span',{key,className:'pt-heat-cell','data-pt-tip':tip,'aria-label':tip,role:'img',style:cellStyle(v,max)}));
        }
        ticks=[0,91,182,273,370].map(i=>{const d=new Date(start);d.setDate(start.getDate()+i);return fmtDate(d);});
      }else{
        const stepMs=spanMs/totalCells;
        const values=Array(totalCells).fill(0);
        for(const r of requests){
          if(!Number.isFinite(r.timestampMs))continue;
          const idx=Math.min(totalCells-1,Math.max(0,Math.floor((r.timestampMs-rangeStart)/stepMs)));
          values[idx]+=metricOf(r);
        }
        const max=Math.max(1e-9,...values);
        const showTime=spanDays<=2;
        for(let i=0;i<totalCells;i++){
          const s=new Date(rangeStart+i*stepMs),e=new Date(rangeStart+(i+1)*stepMs);
          const label=stepMs>=864e5?dayKey(s):showTime?`${fmtDate(s)} ${fmtTime(s)} - ${fmtTime(e)}`:`${fmtDate(s)} ${fmtTime(s)} - ${fmtDate(e)} ${fmtTime(e)}`;
          const tip=`${label}: ${fmtVal(values[i])}`;
          cells.push(h('span',{key:i,className:'pt-heat-cell','data-pt-tip':tip,'aria-label':tip,role:'img',style:cellStyle(values[i],max)}));
        }
        ticks=[0,92,185,278,370].map(i=>{
          const d=new Date(rangeStart+i*stepMs);
          return showTime?fmtTime(d):fmtDate(d);
        });
      }
      return card('用量热力图',h('div',{className:'pt-heat'},
        h('div',{className:'pt-heat-grid','data-testid':'agy-usage-heatmap'},...cells),
        h('div',{className:'pt-heat-axis'},...ticks.map((lbl,i)=>h('span',{key:i},lbl)))),
        h(Tabs,{value:metric,onChange:setMetric,items:[['tokens','Token'],['requests',text('请求','Requests')],['cost','费用']]}));
    }
    function Health({summary,range}){const entries=summary.models.filter(m=>m.requests).slice(0,8);return card(text('模型健康时间线','Model health timeline'),h('div',{className:'pt-health'},...entries.map(model=>{const buckets=Array.from({length:32},()=>({good:0,errors:0,total:0}));for(const r of summary.requests){if(D.modelIdentity(r.model).id!==model.id)continue;const index=Math.min(31,Math.max(0,Math.floor((r.timestampMs-range.start)/Math.max(1,range.end-range.start)*32)));buckets[index].total++;if(r.status==='success')buckets[index].good++;if(r.status==='error')buckets[index].errors++;}return h('div',{key:model.id,className:'pt-health-row'},h('span',{className:'pt-label','data-pt-tip':model.id},model.id),h('div',{className:'pt-health-rail'},...buckets.map((bucket,index)=>h('span',{key:index,className:'pt-health-cell','data-pt-tip':bucket.total?`${bucket.good}/${bucket.total} ${t('成功')}`:text('无请求','No requests'),style:bucket.total?{background:bucket.errors?'var(--error)':bucket.good?'var(--success)':'var(--secondary)',opacity:bucket.errors?1:.75}:undefined}))),h('span',null,model.success+model.errors?`${Math.round(model.success/(model.success+model.errors)*100)}%`:'-'));}),!entries.length&&h('div',{className:'pt-distribution-empty pt-muted'},text('此时间范围内暂无请求','No requests in this time range'))),h('span',{className:'pt-muted'},summary.success+summary.errors?`${Math.round(summary.success/(summary.success+summary.errors)*100)}% ${t('成功')}`:'-'));}
    function DistributionRing({metric,total,entries}){
      const cost=metric==='cost',label=cost?text('费用 (USD)','Cost (USD)'):'Token',circumference=2*Math.PI*76;let offset=0;
      return h('figure',{className:'pt-distribution-chart'},h('div',{className:'pt-donut'},
        h('svg',{viewBox:'0 0 200 200',role:'img','aria-label':cost?text('各模型已记录费用占比','Recorded cost share by model'):text('各模型 Token 占比','Token share by model'),'data-testid':cost?'agy-cost-donut':'agy-usage-donut'},
          h('circle',{cx:100,cy:100,r:76,fill:'none',stroke:'var(--secondary)',strokeWidth:22}),
          ...entries.map((model,index)=>{const value=cost?model.cost:model.tokens;if(!(value>0&&total>0))return null;const share=value/total,length=share*circumference,name=model.id==='__other__'?text('其他','Other'):model.id,segTip=`${name}: ${cost?money(value):n(value)} (${(share*100).toFixed(1)}%)`;
            const part=h('circle',{key:model.id,className:`pt-donut-segment pt-chart-${index}`,cx:100,cy:100,r:76,fill:'none',stroke:'var(--pt-chart)',strokeWidth:22,strokeDasharray:`${length} ${Math.max(0,circumference-length)}`,strokeDashoffset:-offset,transform:'rotate(-90 100 100)','data-model':model.id,'data-share':share,'data-pt-tip':segTip,'aria-label':segTip});offset+=length;return part;})),
        h('div',{className:'pt-donut-total'},h('strong',{'data-testid':`agy-distribution-${metric}-total`,'data-pt-tip':total==null?undefined:String(total)},cost?money(total):n(total)),h('span',{className:'pt-muted'},label))));
    }
    function Distribution({summary}) {
      const entries=D.distributionModels(summary.models),empty=!summary.requests.length,unpriced=!empty&&summary.cost==null;
      return card(text('用量分布','Usage distribution'),h('div',{className:'pt-distribution','data-testid':'agy-usage-distribution'},
        h('div',{className:'pt-distribution-charts'},h(DistributionRing,{metric:'tokens',total:summary.tokens,entries}),h(DistributionRing,{metric:'cost',total:summary.cost,entries})),
        empty?h('div',{className:'pt-distribution-empty pt-muted','data-testid':'agy-distribution-empty'},text('此时间范围内暂无请求','No requests in this time range')):
          h(R.Fragment,null,unpriced&&h('div',{className:'pt-distribution-empty pt-muted'},text('暂无价格数据','No pricing data')),
            h('div',{className:'pt-distribution-legend','data-testid':'agy-distribution-legend'},
              h('div',{className:'pt-distribution-legend-row pt-muted'},h('span',null,t('模型')),h('span',null,'Token'),h('span',null,t('费用'))),
              ...entries.map((model,index)=>h('div',{key:model.id,className:`pt-distribution-legend-row pt-chart-${index}`},
                h('span',{className:'pt-distribution-model'},h('span',{className:'pt-donut-dot','aria-hidden':true}),h('span',{className:'pt-label','data-pt-tip':model.id==='__other__'?text('其他','Other'):model.id},model.id==='__other__'?text('其他','Other'):model.id)),
                h('span',{className:'tabular-nums','data-pt-tip':String(model.tokens)},n(model.tokens)),h('span',{className:'tabular-nums'},money(model.cost))))))));
    }
    function Status({value}){return h('span',{className:'pt-status','data-state':value},h('span',{className:'pt-status-dot','aria-hidden':true}),t(value==='success'?'成功':value==='error'?'错误':'已记录'));}
    const cacheTone=(pct,anomaly)=>anomaly?'drop':pct==null?'neutral':pct>=75?'high':pct>0&&pct<40?'low':'neutral';
    const overviewRangeItems=(includeCustom=true)=>[['weeklyQuota',text('本轮周限额内用量','Current weekly quota')],['today',text('今天','Today')],['24h',text('最近 24 小时','Last 24 hours')],['yesterday',text('昨天','Yesterday')],['week',text('本周','This week')],['month',text('本月','This month')],['30d',text('最近 30 天','Last 30 days')],['all',text('全部时间','All time')],...(includeCustom?[['custom',text('自定义','Custom')]]:[])];
    const accountMetaMap=()=>{const map=new Map();for(const acct of env.accounts?.()?.accounts||[]){const key=String(acct?.email||'').trim().toLowerCase();if(key)map.set(key,acct);}return map;};
    const formatAccountLabel=(email,metaMap,compact=false)=>{const key=String(email||'').trim().toLowerCase();if(!key)return text('未归属','Unattributed');const acct=metaMap?.get(key);if(acct?.alias)return compact?acct.alias:`${acct.alias} (${acct.email||key})`;if(compact)return key.split('@')[0]||key;return acct?.email||key;};
    const collectAccountEmails=(dashboard,rows,activeEmail)=>{const seen=new Set(),list=[];const add=value=>{const key=String(value||'').trim().toLowerCase();if(key&&!seen.has(key)){seen.add(key);list.push(key);}};add(activeEmail);for(const e of dashboard?.accountEmails||[])add(e);for(const r of rows||[])add(r?.accountEmail);for(const acct of env.accounts?.()?.accounts||[])add(acct?.email);return list;};
    function OverviewSkeleton(){
      const bar=(w,hPx=12,cls='')=>h('span',{className:`pt-skel ${cls}`.trim(),style:{width:typeof w==='number'?`${w}px`:w,height:`${hPx}px`},'aria-hidden':true});
      return h('div',{className:'pt-stack','data-testid':'agy-overview-skeleton','aria-busy':'true','aria-label':text('正在加载概览数据','Loading overview data')},
        h('div',{className:'pt-toolbar'},
          bar(156,32,'pt-skel-pill'),
          bar(210,14)),
        h('div',{className:'pt-metrics'},
          ...[0,1,2].map(i=>h('div',{key:i,className:'pt-card pt-metric'},
            h('div',{className:'pt-row'},bar(68,12),bar(16,16,'pt-skel-pill')),
            bar(i===1?112:88,28),
            bar(i===0?124:142,12),
            bar('100%',32)))),
        h('section',{className:'pt-card'},
          h('div',{className:'pt-card-head'},bar(88,14),bar(124,26,'pt-skel-pill')),
          h('div',{className:'pt-heat'},bar('100%',118),h('div',{className:'pt-row'},bar(42,10),bar(42,10),bar(42,10)))),
        h('section',{className:'pt-card'},
          h('div',{className:'pt-card-head'},bar(96,14),bar(64,12)),
          h('div',{className:'pt-health'},
            ...[0,1,2].map(i=>h('div',{key:i,className:'pt-health-row'},bar(104,12),bar('100%',16),bar(32,12))))),
        h('section',{className:'pt-card'},
          h('div',{className:'pt-card-head'},bar(88,14),bar(104,12)),
          h('div',{className:'pt-distribution'},
            h('div',{className:'pt-distribution-charts'},
              h('div',{className:'pt-distribution-chart'},h('div',{className:'pt-skel-ring','aria-hidden':true})),
              h('div',{className:'pt-distribution-chart'},h('div',{className:'pt-skel-ring','aria-hidden':true}))),
            h('div',{className:'pt-distribution-legend'},
              ...[0,1,2].map(i=>h('div',{key:i,className:'pt-distribution-legend-row'},bar(136,12),bar(54,12),bar(48,12)))))));
    }
    function EventTableSkeleton({errors=false}){
      const bar=(w,hPx=12,cls='')=>h('span',{className:`pt-skel ${cls}`.trim(),style:{width:typeof w==='number'?`${w}px`:w,height:`${hPx}px`},'aria-hidden':true});
      return h('div',{className:'pt-stack','data-testid':'agy-events-skeleton','aria-busy':'true','aria-label':text('正在加载事件记录','Loading event log')},
        h('div',{className:'pt-toolbar'},
          h('span',{className:'pt-skel pt-skel-pill',style:{flex:1,minWidth:'160px',height:'32px'},'aria-hidden':true}),
          bar(112,32,'pt-skel-pill'),
          !errors&&bar(96,32,'pt-skel-pill')),
        h('div',{className:'pt-card pt-skel-table'},
          ...[0,1,2,3,4,5].map(i=>h('div',{key:i,className:'pt-skel-tr'},
            bar(112,12),
            bar(i%2===0?'78%':'64%',12),
            bar(52,12,'pt-skel-pill'),
            bar(66,12),
            bar(56,12)))));
    }
    const activePricingMode=dashboard=>{const raw=env.options?.().pricingMode||dashboard?.pricing?.mode||'standard';return raw==='promo'?'promo':'standard';};
    const activePlanContext=()=>{
      const cap=env.capabilities?.()||{};
      const store=env.accounts?.();
      const activeAcct=store?.accounts?.find?.(a=>a.id===store?.activeId)||null;
      const tier=activeAcct?.tier||(cap.subscription?{id:cap.subscription.id,name:cap.subscription.label}:{id:cap.planId,name:cap.plan});
      const plan=planInfoOf(tier);
      const isSubscription=['ultra','pro','plus','free'].includes(plan.family);
      return{...plan,isSubscription};
    };
    const pricingBasisTooltip=(mode,plan)=>{
      const planText=plan?.isSubscription&&plan?.label&&plan.label!=='-'?plan.label:text('Google One AI','Google One AI');
      if(mode==='promo'){
        return plan?.isSubscription
          ?text(`按含 API 限时首发优惠的公开 API 单价估算（优惠仅适用于 API / Cloud 付费账单，不适用于 ${planText} 订阅配额）。可在「价格」或「设置」中切换为正式标准价。`,`Estimated with public API rates including introductory promos (paid API/Cloud billing only, not ${planText} subscription quotas). Switch to Standard in Pricing or Settings.`)
          :text('按含 API 限时首发优惠的公开 API 单价估算（优惠仅适用于 API / Cloud 付费账单），不代表订阅实付账单。可在「价格」或「设置」中切换为正式标准价。','Estimated with public API rates including introductory promos (paid API/Cloud billing only), not subscription billing. Switch to Standard in Pricing or Settings.');
      }
      return plan?.isSubscription
        ?text(`按公开 API 正式标准单价估算等效参考费用（不含仅限 API / Cloud 付费账单的限时首发优惠）；当前 ${planText} 订阅按周期配额计费，不按 Token 实付。可在「价格」或「设置」中切换口径。`,`Estimated API-equivalent cost using official standard list rates (excluding API/Cloud-only introductory promos). Your ${planText} subscription is quota-based, not billed per token. Switch basis in Pricing or Settings.`)
        :text('按公开 API 正式标准单价估算等效参考费用（不含限时首发优惠），不代表订阅实付账单。可在「价格」或「设置」中切换口径。','Estimated API-equivalent cost using official standard list rates (excluding introductory promos), not subscription billing. Switch basis in Pricing or Settings.');
    };
    const promoThroughDate=until=>{
      const ms=Date.parse(`${until}T00:00:00Z`);
      return Number.isFinite(ms)?new Date(ms-86400000).toISOString().slice(0,10):String(until||'');
    };
    function Overview({dashboard}){
      const opts=env.options?.()||{},lang=opts.language||'zh-CN',defaultPreset=opts.overviewRange||'weeklyQuota';
      const pricingMode=activePricingMode(dashboard),planCtx=activePlanContext(),costTip=pricingBasisTooltip(pricingMode,planCtx);
      const costBasisLabel=pricingMode==='promo'?text('含 API 首发优惠口径','API promo basis'):text('API 正式标准价估值','Standard API list basis');
      const activeEmail=String(dashboard?.activeAccountEmail||env.capabilities?.()?.email||'').trim().toLowerCase();
      const allRequests=dashboard?.requests||[];
      const isRemoteSsh=Boolean(dashboard?.isRemoteSsh);
      const accountEmails=collectAccountEmails(dashboard,allRequests,activeEmail);
      const hasUnattributed=allRequests.some(r=>!String(r?.accountEmail||'').trim());
      const showAccountFilter=!isRemoteSsh&&(accountEmails.length>1||(Boolean(opts.multiAccount)&&accountEmails.length>=1&&hasUnattributed));
      const hasActiveRows=Boolean(activeEmail&&allRequests.some(r=>String(r?.accountEmail||'').trim().toLowerCase()===activeEmail));
      const [preset,setPreset]=R.useState(()=>defaultPreset),[start,setStart]=R.useState(()=>{const d=new Date(Date.now()-864e5);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}),[end,setEnd]=R.useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
      const [accountFilter,setAccountFilter]=R.useState(()=>showAccountFilter&&hasActiveRows&&activeEmail?activeEmail:'all');
      const [userPickedAccount,setUserPickedAccount]=R.useState(false);
      R.useEffect(()=>{setPreset(defaultPreset);},[defaultPreset]);
      R.useEffect(()=>{
        if(userPickedAccount)return;
        if(showAccountFilter&&activeEmail&&hasActiveRows)setAccountFilter(activeEmail);
        else if(!showAccountFilter||!hasActiveRows)setAccountFilter('all');
      },[showAccountFilter,activeEmail,hasActiveRows,preset,userPickedAccount]);
      if(!dashboard)return h(OverviewSkeleton);
      const effectiveAccountFilter=showAccountFilter?accountFilter:'all';
      const metaMap=showAccountFilter?accountMetaMap():null;
      const accountItems=[['all',text('全部账号','All accounts')],...accountEmails.map(email=>[email,formatAccountLabel(email,metaMap,false)]),...(hasUnattributed?[['__unattributed__',text('历史未归属','Unattributed history')]]:[])];
      const scopedRequests=effectiveAccountFilter==='all'
        ?allRequests
        :effectiveAccountFilter==='__unattributed__'
          ?allRequests.filter(r=>!String(r?.accountEmail||'').trim())
          :allRequests.filter(r=>String(r?.accountEmail||'').trim().toLowerCase()===effectiveAccountFilter);
      const now=Date.now();
      const rangeEmail=effectiveAccountFilter==='all'?(preset==='weeklyQuota'?activeEmail:''):(effectiveAccountFilter==='__unattributed__'?'':effectiveAccountFilter);
      const range=D.dateRange(preset,now,{start,end,oldestTimestamp:Math.min(now,...scopedRequests.map(r=>r.timestampMs).filter(Number.isFinite)),account:env.account?.(),estimates:env.estimates?.(),accounts:env.accounts?.(),quotaSamples:dashboard?.quotaSamples,email:rangeEmail,activeEmail,fetchedAtMs:env.accountFetchedAt?.()});
      const summary=D.summarizeRequests(scopedRequests,range,env.capabilities?.()?.models||[]),activeModels=summary.models.filter(m=>m.requests>0),distEntries=D.distributionModels(summary.models);
      const totalIn=(summary.inputTokens||0)+(summary.cacheReadTokens||0),avgCost=summary.priced>0&&summary.cost!=null?summary.cost/summary.priced:null;
      const fmtCycleFull=ms=>new Date(ms).toLocaleString(lang,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
      const fmtCycleShort=ms=>new Date(ms).toLocaleString(lang,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
      const activePools=range.activePools||[];
      const singleReset=activePools.length<=1||activePools.every(p=>Math.abs(p.resetTimeMs-activePools[0].resetTimeMs)<60000);
      const weeklyLabel=range.status==='active'
        ?(singleReset
          ?text(`${fmtCycleFull(range.start)} - 现在（${fmtCycleShort(range.resetTimeMs)} 重置）`,`${fmtCycleFull(range.start)} - Now (resets ${fmtCycleShort(range.resetTimeMs)})`)
          :text(`${fmtCycleFull(range.start)} - 现在（${activePools.map(p=>`${p.label} ${fmtCycleShort(p.resetTimeMs)}`).join(' / ')} 重置）`,`${fmtCycleFull(range.start)} - Now (resets ${activePools.map(p=>`${p.label} ${fmtCycleShort(p.resetTimeMs)}`).join(' / ')})`))
        :range.status==='unstarted'
          ?text('本轮周限额尚未开始消耗（剩余 100%）','Current weekly quota untouched (100% remaining)')
          :!env.account?.()
            ?text('最近 7 天（正在同步周限额重置时间…）','Last 7 days (syncing weekly reset time…)')
            :text('最近 7 天（暂未读取到周限额周期）','Last 7 days (weekly quota window unavailable)');
      const weeklyTitle=range.status==='active'&&activePools.length>0?activePools.map(p=>`${p.label}: ${fmtCycleFull(p.startMs)} - ${fmtCycleFull(p.resetTimeMs)}`).join('\n'):undefined;
      return h('div',{className:'pt-stack'},
        h('div',{className:'pt-toolbar'},
          h(Select,{value:preset,onChange:setPreset,label:text('时间范围','Time range'),testId:'agy-range',items:overviewRangeItems(true)}),
          showAccountFilter&&h(Select,{value:effectiveAccountFilter,onChange:next=>{setUserPickedAccount(true);setAccountFilter(next);},label:text('账号','Account'),testId:'agy-overview-account-filter',items:accountItems}),
          preset==='custom'&&h(DateRangePicker,{start,end,onChange:(a,b)=>{setStart(a);setEnd(b);}}),
          preset!=='custom'&&h('span',{className:'pt-muted','data-testid':'agy-range-summary','data-pt-tip':preset==='weeklyQuota'?weeklyTitle:undefined},preset==='weeklyQuota'?weeklyLabel:preset==='all'?text('全部时间','All time'):preset==='today'?`${new Date(range.start).toLocaleDateString(lang)} 00:00 - ${text('现在','Now')}`:`${new Date(range.start).toLocaleDateString(lang)} - ${new Date(range.end).toLocaleDateString(lang)}`)),
        h('div',{className:'pt-metrics'},
          h(Metric,{label:'请求次数',value:n(summary.requests.length),detail:h('span',{className:'inline-flex items-center gap-3'},h('span',{className:'pt-status','data-state':'success'},h('span',{className:'pt-status-dot','aria-hidden':true}),`${summary.success} ${t('成功')}`),h('span',{className:'pt-status','data-state':'error'},h('span',{className:'pt-status-dot','aria-hidden':true}),`${summary.errors} ${t('错误')}`)),values:summary.points.map(p=>p.requests),iconName:'swap_horiz'}),
          h(Metric,{label:'累计 Token',value:n(summary.tokens),detail:h('div',{style:{display:'flex',flexDirection:'column',gap:2}},h('span',null,`${n(totalIn)} ${t('输入')} / ${n(summary.outputTokens)} ${t('输出')}`),summary.cacheHitPercent!=null&&h('span',{'data-pt-tip':text(`缓存读取 ${n(summary.cacheReadTokens)} / 总输入 ${n(totalIn)}`,`Cache read ${n(summary.cacheReadTokens)} / Total input ${n(totalIn)}`)},text('缓存命中 ','Cache hit '),h('span',{className:'pt-cache-hit','data-tone':cacheTone(summary.cacheHitPercent,false),'data-testid':'agy-overview-cache-hit'},`${summary.cacheHitPercent.toFixed(1)}%`),` (${n(summary.cacheReadTokens)})`)),values:summary.points.map(p=>p.tokens),iconName:'token'}),
          h(Metric,{label:'费用',value:money(summary.cost),tip:costTip,detail:h('div',{style:{display:'flex',flexDirection:'column',gap:2}},avgCost!=null&&h('span',null,text(`单次均价 ${money(avgCost)}`,`Avg ${money(avgCost)} / req`)),h('span',{'data-testid':'agy-overview-cost-basis'},costBasisLabel)),values:summary.points.map(p=>p.cost),iconName:'payments'})),
        h(Heatmap,{requests:summary.requests,range}),
        h(Health,{summary,range}),
        h(Distribution,{summary}),
        card(text('模型数据','Model statistics'),activeModels.length?h('div',{className:'pt-table-wrap'},h('table',{className:'pt-table','data-testid':'agy-model-statistics'},h('thead',null,h('tr',null,...['模型','请求次数','Token','缓存命中','费用','平均速度','峰值速度'].map(label=>h('th',{key:label,className:label==='模型'?'':label==='费用'?'numeric pt-cost-th':'numeric','data-pt-tip':label==='费用'?costTip:undefined},t(label))))),h('tbody',null,...activeModels.map(model=>{const colorIdx=distEntries.findIndex(e=>e.id===model.id),chartClass=`pt-chart-${colorIdx>=0?colorIdx:5}`,mTotalIn=(model.inputTokens||0)+(model.cacheReadTokens||0);return h('tr',{key:model.id},h('td',null,h('span',{className:`pt-distribution-model ${chartClass}`},h('span',{className:'pt-donut-dot','aria-hidden':true}),h('span',{className:'pt-label','data-pt-tip':model.id},model.id))),h('td',{className:'numeric'},n(model.requests)),h('td',{className:'numeric'},n(model.tokens)),h('td',{className:'numeric','data-testid':'agy-model-cache-hit','data-pt-tip':mTotalIn>0?text(`缓存读取 ${n(model.cacheReadTokens)} / 总输入 ${n(mTotalIn)}`,`Cache read ${n(model.cacheReadTokens)} / Total input ${n(mTotalIn)}`):undefined},h('span',{className:'pt-cache-hit','data-tone':cacheTone(model.cacheHitPercent,false)},model.cacheHitPercent==null?'-':`${model.cacheHitPercent.toFixed(1)}%`)),h('td',{className:'numeric'},money(model.cost)),h('td',{className:'numeric'},model.avgTps==null?'-':`${model.avgTps.toFixed(1)} tok/s`),h('td',{className:'numeric'},model.peakTps==null?'-':`${model.peakTps.toFixed(1)} tok/s`));})))):h('div',{className:'p-6 text-center pt-muted'},text('此时间范围内暂无请求','No requests in this time range'))));
    }
    function EventTable({dashboard,errors=false}) {
      const [query,setQuery]=R.useState(''),[model,setModel]=R.useState('all'),[scope,setScope]=R.useState('all'),[status,setStatus]=R.useState('all'),[limit,setLimit]=R.useState(50),[copied,setCopied]=R.useState(''),[copyError,setCopyError]=R.useState(''),data=env.state();
      const raw=errors?[...(dashboard?.errors||[]).filter(e=>e?.error&&String(e.error).trim()),...(data?.errors||[]).filter(e=>e?.message&&String(e.message).trim()).map(e=>({...e,error:e.message,status:'error',model:data.modelName,conversationId:data.conversationId,accountEmail:dashboard?.activeAccountEmail||env.capabilities?.()?.email||''}))].sort((a,b)=>(b.timestampMs||0)-(a.timestampMs||0)):dashboard?.requests||[],models=[...new Set(raw.map(r=>r.model).filter(Boolean))];
      const activeEmail=String(dashboard?.activeAccountEmail||env.capabilities?.()?.email||'').trim().toLowerCase();
      const isRemoteSsh=Boolean(dashboard?.isRemoteSsh);
      const accountEmails=collectAccountEmails(dashboard,raw,activeEmail);
      const hasUnattributed=raw.some(r=>!String(r?.accountEmail||'').trim());
      const showAccountFilter=!isRemoteSsh&&(accountEmails.length>1||(Boolean(env.options?.().multiAccount)&&accountEmails.length>=1&&hasUnattributed));
      const hasActiveRows=Boolean(activeEmail&&raw.some(r=>String(r?.accountEmail||'').trim().toLowerCase()===activeEmail));
      const [accountFilter,setAccountFilter]=R.useState(()=>showAccountFilter&&hasActiveRows&&activeEmail?activeEmail:'all');
      const [userPickedAccount,setUserPickedAccount]=R.useState(false);
      R.useEffect(()=>{
        if(userPickedAccount)return;
        if(showAccountFilter&&hasActiveRows&&activeEmail)setAccountFilter(activeEmail);
        else if(!showAccountFilter||!hasActiveRows)setAccountFilter('all');
      },[showAccountFilter,hasActiveRows,activeEmail,userPickedAccount]);
      if(!dashboard)return h(EventTableSkeleton,{errors});
      const effectiveAccountFilter=showAccountFilter?accountFilter:'all';
      const metaMap=showAccountFilter?accountMetaMap():null;
      const accountItems=[['all',text('全部账号','All accounts')],...accountEmails.map(email=>[email,formatAccountLabel(email,metaMap,false)]),...(hasUnattributed?[['__unattributed__',text('历史未归属','Unattributed history')]]:[])];
      const anomalies=!errors&&typeof D.annotateCacheAnomalies==='function'?D.annotateCacheAnomalies(raw):new Map();
      const rows=raw.filter(r=>{
        const reqEmail=String(r?.accountEmail||'').trim().toLowerCase();
        const accountOk=effectiveAccountFilter==='all'||(effectiveAccountFilter==='__unattributed__'?!reqEmail:reqEmail===effectiveAccountFilter);
        return accountOk&&(model==='all'||r.model===model)&&(scope==='all'||r.conversationId===data?.conversationId)&&(errors||status==='all'||(status==='cache-drop'?anomalies.has(r.id):r.status===status))&&`${r.model} ${r.id} ${r.error||''} ${reqEmail}`.toLowerCase().includes(query.toLowerCase());
      });
      const columns=errors?['时间','模型','错误','']:['时间','模型','结果','速度 / 延迟','输入','缓存读取',text('缓存命中率','Cache hit rate'),'输出','费用'];
      const costTip=!errors?pricingBasisTooltip(activePricingMode(dashboard),activePlanContext()):undefined;
      const copy=async r=>{try{await navigator.clipboard.writeText(r.error);setCopied(r.id);setCopyError('');}catch{setCopyError(text('复制失败，请重试','Copy failed. Try again.'));}};
      const speedTip=r=>{
        const parts=[];
        if(r.tps!=null)parts.push(r.tpsMode==='whole'?text(`端到端吞吐（短尾缓冲）：${r.tps} tok/s`,`Whole-request throughput (buffered): ${r.tps} tok/s`):text(`流式生成速度：${r.tps} tok/s`,`Streaming decode speed: ${r.tps} tok/s`));
        if(r.wholeTps!=null&&r.tpsMode==='stream')parts.push(text(`含首字端到端吞吐：${r.wholeTps} tok/s`,`End-to-end (incl. TTFT): ${r.wholeTps} tok/s`));
        if(r.ttftMs!=null)parts.push(text(`首字延迟 (TTFT)：${(r.ttftMs/1000).toFixed(1)}s`,`TTFT: ${(r.ttftMs/1000).toFixed(1)}s`));
        if(r.streamingMs!=null)parts.push(text(`流式输出耗时：${(r.streamingMs/1000).toFixed(1)}s`,`Streaming duration: ${(r.streamingMs/1000).toFixed(1)}s`));
        return parts.length?parts.join('\n'):undefined;
      };
      const anomalyTip=a=>{
        if(!a)return undefined;
        const sec=Math.round(a.gapMs/1000);
        if(a.kind==='missed')return text(`短间隔连续未命中：距上次同模型请求（输入 ${n(a.prevTotalIn)}）仅 ${sec} 秒，缓存读取仍为 0`,`Repeated cache miss ${sec}s after previous same-model request (${n(a.prevTotalIn)} input): 0 cache read`);
        return text(`短间隔${a.kind==='cleared'?'缓存清空':'缓存骤降'}：距上次同模型请求 ${sec} 秒，缓存命中率由 ${a.prevHit.toFixed(1)}% (${n(a.prevCache)}) 降至 ${a.curHit.toFixed(1)}% (${n(a.curCache)})`,`Cache ${a.kind==='cleared'?'wiped':'dropped'} ${sec}s after previous same-model request: ${a.prevHit.toFixed(1)}% (${n(a.prevCache)}) -> ${a.curHit.toFixed(1)}% (${n(a.curCache)})`);
      };
      return h('div',{className:'pt-stack'},
        h('div',{className:'pt-toolbar'},
          h('div',{className:'pt-search'},icon('search'),h('input',{type:'search',value:query,'aria-label':t('搜索事件'),placeholder:t('搜索事件'),onChange:e=>setQuery(e.target.value)})),
          showAccountFilter&&h(Select,{value:effectiveAccountFilter,onChange:next=>{setUserPickedAccount(true);setAccountFilter(next);},label:text('账号','Account'),testId:'agy-account-filter',items:accountItems}),
          h(Select,{value:model,onChange:setModel,label:'模型',testId:'agy-model-filter',items:[['all','全部模型'],...models.map(m=>[m,m])]}),
          h(Select,{value:scope,onChange:setScope,label:text('会话','Conversation'),testId:'agy-scope-filter',items:[['all','全部会话'],['current','当前会话']]}),
          !errors&&h(Select,{value:status,onChange:setStatus,label:'结果',testId:'agy-result-filter',items:[['all','全部结果'],['success','成功'],['error','错误'],['recorded','已记录'],['cache-drop',text('缓存异常','Cache anomaly')]]})),
        copyError&&h('div',{role:'alert'},copyError),
        h('div',{className:'pt-card pt-table-wrap'},
          h('table',{key:errors?'errors':'requests',className:`pt-table ${errors?'pt-errors':'pt-requests'}`,'data-testid':errors?'agy-errors-table':'agy-requests-table'},
            h('colgroup',null,...(errors?[164,190,null,48]:[148,null,74,98,78,86,88,76,78]).map((width,index)=>h('col',{key:index,style:width?{width}:undefined}))),
            h('thead',null,h('tr',null,...columns.map((label,index)=>h('th',{key:index,className:!errors&&index>=3?(label==='费用'?'numeric pt-cost-th':'numeric'):'','data-pt-tip':!errors&&label==='费用'?costTip:undefined},t(label))))),
            h('tbody',null,...rows.slice(0,limit).map((r,index)=>{
              const anomaly=!errors?anomalies.get(r.id):null;
              const hitTone=cacheTone(r.cacheHitPercent,Boolean(anomaly));
              const reqEmail=String(r?.accountEmail||'').trim().toLowerCase();
              return h('tr',{key:`${errors?'err':'req'}:${r.id}:${index}`,className:anomaly?'pt-cache-drop-row':undefined,'data-cache-anomaly':anomaly?anomaly.kind:undefined},
                h('td',{className:'pt-muted pt-date'},time(r.timestampMs),showAccountFilter&&effectiveAccountFilter==='all'&&h('div',{className:'pt-label','data-testid':'agy-request-account',style:{fontSize:11,opacity:.85},'data-pt-tip':reqEmail||text('升级前或未记录账号时间线的历史请求','Historical request recorded before account timeline tracking')},formatAccountLabel(reqEmail,metaMap,true))),
                h('td',{'data-pt-tip':r.model||undefined},h('span',{className:'pt-error-text'},r.model||t('未知模型'))),
                errors?h(R.Fragment,null,h('td',null,h('span',{className:'pt-error-text','data-pt-tip':r.error||undefined,'data-pt-tip-mono':'true'},r.error)),h('td',null,h(Uy,{variant:'ghost',size:'icon',tooltip:t(copied===r.id?'已复制':'复制'),'aria-label':text('复制错误','Copy error'),'data-testid':'agy-copy-error',onClick:()=>{void copy(r);}},icon(copied===r.id?'check':'content_copy',15)))):
                h(R.Fragment,null,
                  h('td',null,h(Status,{value:r.status})),
                  h('td',{className:'numeric','data-pt-tip':speedTip(r)},r.tps==null?'-':`${r.tps} tok/s`,h('div',{className:'pt-muted'},r.ttftMs==null?'-':`${(r.ttftMs/1000).toFixed(1)}s`)),
                  h('td',{className:'numeric'},n(r.inputTokens)),
                  h('td',{className:'numeric'},n(r.cacheReadTokens)),
                  h('td',{className:'numeric','data-testid':'agy-request-cache-hit','data-pt-tip':anomalyTip(anomaly)},
                    h('span',{className:'pt-cache-hit','data-tone':hitTone},r.cacheHitPercent==null?'-':`${r.cacheHitPercent.toFixed(1)}%`),
                    anomaly&&h('div',null,h('span',{className:'pt-cache-drop-tag','data-testid':'agy-cache-drop-badge'},text(anomaly.kind==='cleared'?'缓存异常':anomaly.kind==='missed'?'未命中':'骤降',anomaly.kind==='cleared'?'Anomaly':anomaly.kind==='missed'?'Missed':'Drop')))),
                  h('td',{className:'numeric'},n(r.outputTokens)),
                  h('td',{className:'numeric'},h('span',{className:'pt-cost-val','data-high':r.costUsd!=null&&r.costUsd>=1?'true':undefined},money(r.costUsd)))));
            }))),
          !rows.length&&h('div',{className:'p-6 text-center pt-muted'},t(errors?'暂无错误记录':'暂无请求记录'))),
        h('div',{className:'pt-row pt-muted'},`${Math.min(limit,rows.length)} / ${rows.length}`,rows.length>limit&&button('显示更多',()=>setLimit(limit+100))));
    }
    function PlanBadge({tier}){const cap=env.capabilities()||{},plan=tier?D.subscriptionIdentity(tier):(cap.subscription||D.subscriptionIdentity({id:cap.planId,name:cap.plan}));return h('span',{className:'pt-plan-badge','data-plan':plan.style,'data-testid':'agy-subscription-badge','data-pt-tip':plan.family==='ultra'&&!plan.multiplier?text('客户端未提供 Ultra 倍率','The client does not report the Ultra multiplier'):undefined},h('span',{className:'pt-plan-symbol'},icon(plan.family==='ultra'?'auto_awesome':'verified',20)),plan.label);}
    function planInfoOf(tier){if(D?.subscriptionIdentity)return D.subscriptionIdentity(tier||{});const name=tier?.name||'';const id=tier?.id||'';const v=`${name} ${id}`;const family=/ultra/i.test(v)?'ultra':/\bpro\b/i.test(v)?'pro':/plus/i.test(v)?'plus':/team/i.test(v)?'team':/free/i.test(v)?'free':'unknown';return{family,multiplier:null,style:family,label:name||'-',id};}
    function shortPlanLabel(plan){if(plan.family==='ultra')return plan.multiplier?`Ultra ${plan.multiplier}x`:'Ultra';if(plan.family==='pro')return 'Pro';if(plan.family==='plus')return 'Plus';if(plan.family==='team')return 'Team';if(plan.family==='free')return 'Free';return plan.label||'-';}
    function PlanMiniBadge({tier}){const plan=planInfoOf(tier);return h('span',{className:'pt-acct-plan-mini','data-plan':plan.style},shortPlanLabel(plan));}
    function ListViewIcon(){return h('svg',{width:15,height:15,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round','aria-hidden':true},h('line',{x1:8,y1:6,x2:21,y2:6}),h('line',{x1:8,y1:12,x2:21,y2:12}),h('line',{x1:8,y1:18,x2:21,y2:18}),h('circle',{cx:4,cy:6,r:1,fill:'currentColor'}),h('circle',{cx:4,cy:12,r:1,fill:'currentColor'}),h('circle',{cx:4,cy:18,r:1,fill:'currentColor'}));}
    function CardViewIcon(){return h('svg',{width:15,height:15,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('rect',{x:3,y:3,width:7,height:7,rx:1.5}),h('rect',{x:14,y:3,width:7,height:7,rx:1.5}),h('rect',{x:3,y:14,width:7,height:7,rx:1.5}),h('rect',{x:14,y:14,width:7,height:7,rx:1.5}));}
    function TagIcon(){return h('svg',{width:11,height:11,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'}),h('circle',{cx:7,cy:7,r:1.5,fill:'currentColor'}));}
    function AccountsManageIcon(){return h('svg',{width:15,height:15,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'}),h('circle',{cx:9,cy:7,r:3.5}),h('path',{d:'M22 21v-2a4 4 0 0 0-3-3.87'}),h('path',{d:'M16 3.5a3.5 3.5 0 0 1 0 7'}));}
    function GripIcon(){return h('svg',{width:13,height:13,viewBox:'0 0 24 24',fill:'currentColor','aria-hidden':true},h('circle',{cx:9,cy:6,r:1.5}),h('circle',{cx:15,cy:6,r:1.5}),h('circle',{cx:9,cy:12,r:1.5}),h('circle',{cx:15,cy:12,r:1.5}),h('circle',{cx:9,cy:18,r:1.5}),h('circle',{cx:15,cy:18,r:1.5}));}
    function AliasTag({alias}){if(!alias)return null;return h('span',{className:'pt-acct-alias-tag','data-pt-tip':alias,'data-testid':'agy-account-alias-tag'},h(TagIcon),h('span',null,alias));}
    function AccountAvatar({account,size='sm'}){
      const H=helpers(),plan=planInfoOf(account?.tier);
      if(account?.avatarUrl){
        return h('span',{className:'pt-acct-avatar','data-size':size,'data-photo':'true','aria-hidden':true},h('img',{src:account.avatarUrl,alt:'',className:'pt-acct-avatar-img'}));
      }
      const initial=H?H.accountInitials(account):String(account?.name||account?.email||account?.alias||'A').trim().slice(0,1).toUpperCase()||'A';
      return h('span',{className:'pt-acct-avatar','data-plan':plan.style,'data-size':size,'aria-hidden':true},initial);
    }
    function bucketToneColor(tone){return tone==='critical'?'var(--error)':tone==='warning'?'var(--warning)':'var(--primary)';}
    function displayAccountName(account){return account?.name||account?.email?.split('@')[0]||'-';}
    function shortGroupName(group){return group?.shortName||helpers()?.quotaGroupMeta?.(group)?.shortName||(group?.key==='gemini'?'Gemini':'Claude / GPT');}
    function compactGroupName(group){return group?.compactName||group?.shortName||helpers()?.quotaGroupMeta?.(group)?.compactName||(group?.key==='gemini'?'Gemini':'Claude/GPT');}
    let activeModalCount=0;
    function ModalFrame({open,title,onClose,testId,children}){
      R.useEffect(()=>{if(!open)return;activeModalCount++;return()=>{activeModalCount=Math.max(0,activeModalCount-1);};},[open]);
      R.useEffect(()=>{if(!open)return;const onKey=e=>{if(e.key==='Escape'){e.preventDefault();onClose?.();}};window.addEventListener('keydown',onKey,true);return()=>window.removeEventListener('keydown',onKey,true);},[open,onClose]);
      if(!open)return null;
      if(typeof Wz==='function'){return h(Wz,{isOpen:true,positioning:'fixed',onClose,title,className:'max-w-md rounded-xl bg-background',innerContentClassName:'px-1 -mx-1',scrollToBottomOnOpen:false},h('div',{'data-testid':testId},children));}
      return h('div',{className:'pt-acct-modal-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)onClose?.();}},
        h('div',{role:'dialog','aria-modal':'true','aria-label':title,'data-testid':testId,className:'pt-acct-modal-card'},
          h('div',{className:'pt-row'},h('strong',{style:{fontSize:15,fontWeight:600}},title),h(Uy,{variant:'ghost',size:'icon',type:'button','aria-label':t('关闭'),onClick:onClose},icon('close',16))),
          children));
    }
    function MultiAccountRiskModal({open,onConfirm,onCancel}){
      return h(ModalFrame,{open,title:text('开启多账号切换前请确认风险','Confirm risks before enabling Multi-Account'),onClose:onCancel,testId:'agy-multi-account-risk-dialog'},
        h('div',{className:'pt-stack',style:{gap:12}},
          h('div',{className:'pt-acct-warn-box'},
            icon('warning',18,{style:{flexShrink:0,marginTop:1,color:'var(--warning)'}}),
            h('span',null,text('Google 与 Antigravity 官方客户端默认按单账号设计。通过多账号轮换来规避额度或频率限制可能违反 Google 服务条款与使用政策，存在触发风控验证、额度受限甚至账号封禁的风险。','Google and Antigravity are designed for single-account use. Rotating accounts to bypass quota or rate limits may violate Google Terms of Service and can trigger verification challenges, quota limits, or account suspension.'))),
          h('ul',{className:'pt-acct-risk-list'},
            h('li',null,text('请仅用于管理你本人合法持有的账号，因使用本功能引发的任何账号风控或封禁风险需由你自行承担。','Use this only to manage accounts you legitimately own. You assume full responsibility for any account restrictions or risk-control actions.')),
            h('li',null,text('本功能通过操作系统原生凭据库（如 Windows 凭据管理器 / macOS 钥匙串）在本地备份与切换登录态，不会上传任何凭据，但可能随官方客户端更新而失效。','Credentials are backed up and swapped locally using the OS keyring and are never uploaded, though official client updates may break compatibility.')),
            h('li',null,text('切换账号后会自动重启 Antigravity 生效，切换前请确保当前没有需要保留的未完成生成任务。','Switching accounts automatically relaunches Antigravity. Make sure no active generation needs to finish first.'))),
          h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4}},
            h(Uy,{variant:'secondary',size:'sm',type:'button','data-testid':'agy-multi-account-risk-cancel',onClick:onCancel},t('取消')),
            h(Uy,{variant:'primary',size:'sm',type:'button','data-testid':'agy-multi-account-risk-confirm',onClick:onConfirm},text('我已了解风险，确认开启','I understand the risks, enable')))));
    }
    function SwitchConfirmModal({target,active,runningTurn,busy,error,onConfirm,onCancel}){
      const display=a=>a?`${displayAccountName(a)} (${a.email})`:'-';
      return h(ModalFrame,{open:!!target,title:text('切换账号','Switch account'),onClose:busy?undefined:onCancel,testId:'agy-account-switch-dialog'},
        h('div',{className:'pt-stack',style:{gap:12}},
          h('div',{style:{fontSize:13,lineHeight:1.6}},text(`即将从 ${display(active)} 切换到 ${display(target)}。`,`Switch from ${display(active)} to ${display(target)}.`)),
          runningTurn&&h('div',{className:'pt-acct-warn-box','data-testid':'agy-switch-running-warning'},icon('warning',16,{style:{flexShrink:0,marginTop:2,color:'var(--warning)'}}),h('span',null,text('当前或后台仍有会话正在执行，切换账号会中断进行中的生成。建议等待完成或先停止后再切换。','An active or background conversation is still running. Switching accounts will interrupt in-progress generation.'))),
          h('div',{className:'pt-muted',style:{lineHeight:1.5}},text('切换账号会写入目标账号的本地系统凭据并自动重启 Antigravity 生效，本地历史聊天记录会自动保留。','Switching updates the local system credential and automatically relaunches Antigravity while preserving local chats.')),
          error&&h('div',{role:'alert',className:'text-error',style:{fontSize:12}},error),
          h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4}},
            h(Uy,{variant:'secondary',size:'sm',type:'button',disabled:busy,'data-testid':'agy-switch-cancel',onClick:onCancel},t('取消')),
            h(Uy,{variant:'primary',size:'sm',type:'button',disabled:busy,'data-testid':'agy-switch-confirm',onClick:onConfirm},busy?text('正在切换并重启…','Switching…'):runningTurn?text('仍要切换','Switch anyway'):text('确认切换','Confirm switch')))));
    }
    function AddAccountModal({open,runningTurn,busy,error,onSubmit,onClose}){
      const [alias,setAlias]=R.useState('');
      const [authUrl,setAuthUrl]=R.useState('');
      const [copiedUrl,setCopiedUrl]=R.useState(false);
      const readSessionUrl=()=>{
        const snap=env.loginSession?.();
        return typeof snap?.authUrl==='string'&&/^https:\/\//i.test(snap.authUrl.trim())?snap.authUrl.trim():'';
      };
      R.useEffect(()=>{if(open){setAlias('');setCopiedUrl(false);}else{setAuthUrl('');setCopiedUrl(false);}},[open]);
      R.useEffect(()=>{
        if(!open||!busy){setAuthUrl('');setCopiedUrl(false);return;}
        const readUrl=()=>{
          const next=readSessionUrl();
          setAuthUrl(prev=>prev===next?prev:next);
        };
        readUrl();
        const sub=env.onLoginSessionChange?.(snap=>{
          const next=typeof snap?.authUrl==='string'&&/^https:\/\//i.test(snap.authUrl.trim())?snap.authUrl.trim():'';
          setAuthUrl(prev=>prev===next?prev:next);
        });
        const timer=setInterval(readUrl,400);
        return()=>{
          clearInterval(timer);
          if(typeof sub==='function')sub();
          else sub?.dispose?.();
        };
      },[open,busy]);
      const activeAuthUrl=open&&busy?(authUrl||readSessionUrl()):'';
      const copyAuthUrl=async()=>{
        if(!activeAuthUrl)return;
        try{
          await navigator.clipboard.writeText(activeAuthUrl);
          setCopiedUrl(true);
          setTimeout(()=>setCopiedUrl(false),1800);
        }catch{}
      };
      const handleCancel=()=>{
        if(busy){
          try{void env.cancelAccountLogin?.();}catch{}
        }
        onClose?.();
      };
      const submit=e=>{e?.preventDefault?.();onSubmit?.(alias.trim());};
      return h(ModalFrame,{open,title:text('添加账号','Add account'),onClose:busy?undefined:onClose,testId:'agy-add-account-dialog'},
        h('form',{className:'pt-stack',style:{gap:14},onSubmit:submit},
          h('div',{className:'pt-muted',style:{lineHeight:1.6}},text('将先在系统凭据管理器中保存当前账号的登录状态，随后拉起 Antigravity 官方 Google 登录流程。登录完成后会自动重启 Antigravity，使新账号彻底生效并避免后台刷新回退到旧账号。','Your current account credential will be backed up in the system keyring first, then Antigravity will open the official Google sign-in flow. Antigravity will automatically relaunch after sign-in so the new account takes effect cleanly without background token refreshes reverting to the previous account.')),
          runningTurn&&h('div',{className:'pt-acct-warn-box','data-testid':'agy-add-running-warning'},icon('warning',16,{style:{flexShrink:0,marginTop:2,color:'var(--warning)'}}),h('span',null,text('当前或后台仍有会话正在执行，添加账号完成后的自动重启会中断进行中的生成。建议等待完成或先停止后再添加。','An active or background conversation is still running. Relaunching after sign-in will interrupt in-progress generation.'))),
          h('label',{className:'pt-stack',style:{gap:6}},
            h('span',{style:{fontSize:12,fontWeight:500,color:'var(--foreground)'}},text('新账号备注（可选）','Alias for new account (optional)')),
            h('input',{className:'pt-acct-input',type:'text',maxLength:40,placeholder:text('例如：公司备用号','e.g. Work backup'),value:alias,onChange:e=>setAlias(e.target.value),'data-testid':'agy-add-account-alias'})),
          activeAuthUrl&&h('div',{
            className:'pt-stack',
            'data-testid':'agy-add-account-oauth-box',
            style:{gap:8,padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'color-mix(in srgb,var(--secondary) 55%,transparent)'}
          },
            h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}},
              h('span',{style:{fontSize:12,fontWeight:500,color:'var(--foreground)'}},text('手动打开登录链接','Manual sign-in link')),
              h(Uy,{
                variant:'secondary',size:'sm',type:'button',
                'data-testid':'agy-add-account-copy-url',
                onClick:()=>{void copyAuthUrl();}
              },icon(copiedUrl?'check':'content_copy',14),h('span',null,copiedUrl?t('已复制'):text('复制登录链接','Copy sign-in link')))),
            h('div',{
              'data-testid':'agy-add-account-oauth-url',
              style:{fontSize:11,fontFamily:'var(--font-mono,ui-monospace,monospace)',color:'var(--muted-foreground)',wordBreak:'break-all',maxHeight:48,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}
            },activeAuthUrl),
            h('div',{className:'pt-muted',style:{fontSize:11,lineHeight:1.45}},text('如需在指定浏览器或独立配置中登录，可复制上方链接后粘贴打开，完成后会自动返回生效。','Need a specific browser or profile? Copy the link above and open it there; sign-in will complete automatically.'))),
          error&&h('div',{role:'alert',className:'text-error',style:{fontSize:12}},error),
          h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:2}},
            h(Uy,{variant:'secondary',size:'sm',type:'button',disabled:busy&&!activeAuthUrl,'data-testid':'agy-add-account-cancel',onClick:handleCancel},t('取消')),
            h(Uy,{variant:'primary',size:'sm',type:'submit',disabled:busy,'data-testid':'agy-add-account-submit'},busy?text('等待浏览器登录…','Waiting for sign-in…'):text('前往 Google 登录','Sign in with Google')))));
    }
    function AccountSwitcher(){
      useData();
      const opts=env.options();
      const H=helpers(),store=env.accounts?.(),cap=env.capabilities?.()||{},lang=opts.language;
      const [open,setOpen]=R.useState(false),[switchTarget,setSwitchTarget]=R.useState(null),[addOpen,setAddOpen]=R.useState(false),[busy,setBusy]=R.useState(false),[refreshing,setRefreshing]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[now,setNow]=R.useState(()=>Date.now());
      R.useEffect(()=>{if(!open)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[open]);
      if(!opts.multiAccount||!H||store?.isRemoteSsh)return null;
      const accounts=store?.accounts||[];
      const liveGroups=normalizeLiveGroups(env.account?.()?.groups);
      const capEmail=String(cap.email||'').trim().toLowerCase();
      const liveFallback=cap.email?{id:'live-current',email:cap.email,name:cap.name||cap.email.split('@')[0],alias:'',avatarUrl:cap.avatarUrl||'',tier:{id:cap.planId||'',name:cap.plan||''},groups:liveGroups}:null;
      const capMatched=capEmail?accounts.find(a=>String(a?.email||'').trim().toLowerCase()===capEmail)||null:null;
      const active=capMatched||accounts.find(a=>a.id===store?.activeId)||accounts[0]||liveFallback;
      const displayList=accounts.length?accounts:(active?[active]:[]),activeTitle=active?displayAccountName(active):text('账号与设置','Accounts & Settings');
      const winMode=opts.accountQuotaWindow==='weekly'?'weekly':'5h';
      const doSwitch=async()=>{if(!switchTarget||busy)return;setBusy(true);setError('');setNotice('');try{const res=await env.switchAccount?.(switchTarget.id);setSwitchTarget(null);if(res?.manualRestartRequired){setNotice(text('账号凭据已切换，请手动重启 Antigravity 生效。','Credentials switched. Please restart Antigravity manually to apply.'));setOpen(true);}}catch(e){setError(e.message);}finally{setBusy(false);}};
      const doAdd=async alias=>{if(busy)return;setBusy(true);setError('');setNotice('');try{const res=await env.startAddAccount?.(alias);setAddOpen(false);if(res?.manualRestartRequired){setNotice(text('新账号凭据已保存，请手动重启 Antigravity 以避免旧账号后台刷新导致自动回退。','New account credential saved. Please restart Antigravity manually to prevent reverting to the previous account.'));setOpen(true);}}catch(e){setError(e.message);}finally{setBusy(false);}};
      const doRefreshActive=async()=>{if(refreshing||busy)return;setRefreshing(true);setError('');try{const res=await env.refreshAccountQuotas?.(active?.id||'');if(res?.credentialMismatch)setError(text('检测到系统凭据与当前显示账号不一致，已跳过同步以保护本地凭据','Credential mismatch detected; skipped sync to protect local credentials'));}catch(e){setError(e.message);}finally{setRefreshing(false);}};
      const listContent=h('div',{className:'pt-acct-popover'},
        displayList.length>0&&h('div',{className:'pt-acct-pop-head'},
          h('div',{className:'pt-acct-win-mini','data-testid':'agy-popover-window-tabs'},
            h('button',{type:'button','aria-pressed':winMode==='5h',onClick:()=>{void env.change?.({accountQuotaWindow:'5h'});}},'5H'),
            h('button',{type:'button','aria-pressed':winMode==='weekly',onClick:()=>{void env.change?.({accountQuotaWindow:'weekly'});}},text('周','W'))),
          h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-6 w-6 rounded-md',disabled:refreshing||busy,tooltip:text('刷新当前账号额度','Refresh current account quota'),'aria-label':text('刷新当前账号额度','Refresh current account quota'),'data-testid':'agy-popover-refresh-quotas',onClick:()=>{void doRefreshActive();}},
            icon('refresh',14,{className:refreshing?'animate-spin':''}))),
        notice&&!switchTarget&&!addOpen&&h('div',{className:'pt-acct-warn-box',role:'status','data-testid':'agy-popover-manual-restart',style:{margin:'4px 6px',fontSize:11,padding:'6px 8px'}},icon('info',14,{style:{flexShrink:0,marginTop:1,color:'var(--primary)'}}),h('span',null,notice)),
        error&&!switchTarget&&!addOpen&&h('div',{role:'alert',className:'text-error','data-testid':'agy-popover-error',style:{fontSize:11,padding:'4px 8px',lineHeight:1.4}},error),
        displayList.length>0&&h('div',{className:'pt-acct-pop-list'},...displayList.map(acct=>{
          const isActive=Boolean(active&&acct.id===active.id);
          const effectiveAcct=fuseActiveAccount(acct,isActive,liveGroups,capEmail);
          const acctSummary=H.summarizeAccountQuota(effectiveAcct,now,{isActive,syncedAtMs:isActive?(env.accountFetchedAt?.()||acct.syncedAtMs):acct.syncedAtMs}),name=displayAccountName(acct),needsRelogin=!isActive&&acct.hasCredential===false,isDisabled=Boolean(acct.disabled);
          return h('button',{key:acct.id,type:'button',disabled:isDisabled,className:'pt-acct-pop-item','data-active':isActive?'true':undefined,'data-disabled':isDisabled?'true':undefined,'data-testid':`agy-account-row-${acct.id}`,onClick:()=>{if(isDisabled)return;if(isActive){setOpen(false);return;}setOpen(false);setError('');if(needsRelogin){setAddOpen(true);return;}setSwitchTarget(acct);}},
            h('div',{className:'pt-row',style:{gap:8,flexWrap:'nowrap'}},
              h('div',{style:{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}},
                h(AccountAvatar,{account:acct,size:'sm'}),
                h('div',{style:{minWidth:0,flex:1}},
                  h('div',{style:{display:'flex',alignItems:'center',gap:5,minWidth:0}},h('span',{className:'pt-label',style:{fontSize:13,fontWeight:500}},name),h(PlanMiniBadge,{tier:acct.tier}),h(AliasTag,{alias:acct.alias})),
                  h('div',{className:'pt-label pt-muted',style:{fontSize:11}},acct.email))),
              h('div',{style:{display:'flex',alignItems:'center',gap:4,flexShrink:0}},
                isActive?icon('check_circle',16,{style:{color:'var(--primary)'}}):needsRelogin?h('span',{className:'pt-acct-pill','data-tone':'warning',style:{fontSize:10}},text('需重新登录','Re-login')):isDisabled?h('span',{className:'pt-acct-pill','data-tone':'critical',style:{fontSize:10}},text('已禁用','Disabled')):null)),
            acctSummary.groups.length>0&&h('div',{className:'pt-acct-mini-grid'},...acctSummary.groups.map(g=>{
              const b=g.buckets.find(item=>item.window===winMode)||g.buckets[0],pct=b?.effectiveFraction==null?null:Math.round(b.effectiveFraction*100);
              const winTag=b?.window==='weekly'?text('周','7d'):'5h';
              const hint=groupQuotaHint(g,b,winMode);
              return h('div',{key:g.key,className:'pt-acct-mini-group','data-pt-tip':hint.tip,'data-estimated':b?.isReset?'true':undefined,'data-weekly-risk':hint.weeklyTight?hint.displayTone:undefined},
                h('div',{className:'pt-acct-mini-head'},
                  h('span',{className:'pt-acct-mini-name'},h('span',null,compactGroupName(g)),h('span',{className:'pt-acct-win-tag'},winTag)),
                  h('span',{className:'tabular-nums',style:{flexShrink:0,color:hint.displayTone==='critical'?'var(--error)':hint.displayTone==='warning'?'var(--warning)':'var(--foreground)'}},pct==null?'-':`${b?.isReset?'≈':''}${pct}%`)),
                h('span',{className:'pt-acct-mini-bar'},h('span',{className:'pt-acct-mini-fill',style:{width:`${pct??0}%`,background:bucketToneColor(hint.displayTone)}})));
            })),
            !isActive&&acct.syncedAtMs&&h('div',{className:'pt-row pt-muted',style:{fontSize:11}},
              h('span',null,`${text('更新于 ','Updated ')}${H.formatRelativeTime(acct.syncedAtMs,now,lang)}`)));
        })),
        h('div',{className:'pt-acct-pop-foot'},
          h('button',{type:'button',className:'pt-acct-pop-action','data-testid':'agy-account-add-quick',onClick:()=>{setOpen(false);setError('');setAddOpen(true);}},icon('add',15),h('span',null,text('添加账号','Add account'))),
          h('button',{type:'button',className:'pt-acct-pop-action','data-testid':'agy-account-open-manager',onClick:()=>{setOpen(false);env.openManagementTab?.('quota');}},h(AccountsManageIcon),h('span',null,text('管理全部账号与额度','Manage all accounts & quota'))),
          h('button',{type:'button',className:'pt-acct-pop-action','data-testid':'agy-account-open-settings',onClick:()=>{setOpen(false);env.openNativeSettings?.();}},icon('settings',15),h('span',null,t('设置')))));
      const triggerButton=h('button',{type:'button',className:'pt-acct-trigger','data-testid':'agy-account-switcher-trigger','aria-label':text('账号与设置','Account & settings'),'aria-expanded':open,onClick:typeof HC==='function'?undefined:()=>setOpen(v=>{if(v)setError('');return !v;})},
        active?h(AccountAvatar,{account:active,size:'sm'}):h('span',{className:'pt-acct-avatar','aria-hidden':true},icon('person',15)),
        h('div',{style:{minWidth:0,flex:1,display:'flex',flexDirection:'column',gap:2}},
          h('div',{style:{display:'flex',alignItems:'center',gap:5,minWidth:0}},
            h('span',{className:'pt-label',style:{fontSize:12,fontWeight:500}},activeTitle),
            active&&h(PlanMiniBadge,{tier:active.tier}),
            active&&h(AliasTag,{alias:active.alias})),
          active&&h('span',{className:'pt-label pt-muted',style:{fontSize:11}},active.email)),
        icon('unfold_more',15,{style:{flexShrink:0,color:'var(--muted-foreground)'}}));
      return h(R.Fragment,null,
        typeof HC==='function'
          ?h(HC,{open,onOpenChange:next=>{setOpen(next);if(!next)setError('');},placement:'top-start',disableMobileSheet:true},h(IC,{asChild:true},triggerButton),h(JC,{className:'!w-80','data-testid':'agy-account-popover','aria-label':text('账号与设置','Account & settings'),role:'dialog'},listContent))
          :h('div',{style:{position:'relative'}},triggerButton,open&&h('div',{'data-testid':'agy-account-popover',role:'dialog',style:{position:'absolute',bottom:'100%',left:0,width:312,marginBottom:6,zIndex:50,border:'1px solid var(--border)',borderRadius:12,background:'var(--card)',padding:6,boxShadow:'0 10px 24px rgba(0,0,0,.18)'}},listContent)),
        h(SwitchConfirmModal,{target:switchTarget,active,runningTurn:!!env.isTurnRunning?.(),busy,error,onConfirm:()=>{void doSwitch();},onCancel:()=>{setSwitchTarget(null);setError('');}}),
        h(AddAccountModal,{open:addOpen,runningTurn:!!env.isTurnRunning?.(),busy,error,onSubmit:alias=>{void doAdd(alias);},onClose:()=>{setAddOpen(false);setError('');}}));
    }
    function Quotas(){
      useData();
      const H=helpers(),store=env.accounts?.(),opts=env.options(),lang=opts.language,now=Date.now();
      const [switchTarget,setSwitchTarget]=R.useState(null),[addOpen,setAddOpen]=R.useState(false),[editingId,setEditingId]=R.useState(''),[editingAlias,setEditingAlias]=R.useState(''),[busy,setBusy]=R.useState(false),[busyAction,setBusyAction]=R.useState(''),[error,setError]=R.useState(''),[notice,setNotice]=R.useState('');
      const [query,setQuery]=R.useState(''),[tierFilter,setTierFilter]=R.useState('all');
      const [dragId,setDragId]=R.useState(''),[dragOverId,setDragOverId]=R.useState('');
      const viewMode=opts.accountViewMode==='card'?'card':'list';
      const winMode=opts.accountQuotaWindow==='weekly'?'weekly':'5h';
      const accounts=store?.accounts||[],activeAcct=accounts.find(a=>a.id===store?.activeId)||accounts[0]||null;
      const cap=env.capabilities?.()||{},capEmail=String(cap.email||'').trim().toLowerCase();
      const capMatchedAcct=capEmail?accounts.find(a=>String(a?.email||'').trim().toLowerCase()===capEmail)||null:null;
      const headerAcct=capMatchedAcct||(capEmail?{id:'live-current',email:cap.email,name:cap.name||cap.email.split('@')[0],alias:'',avatarUrl:cap.avatarUrl||'',tier:{id:cap.planId||'',name:cap.plan||''}}:null)||activeAcct;
      const groups=env.account()?.groups||[];
      const liveGroups=normalizeLiveGroups(groups);
      const canReorder=!query.trim()&&tierFilter==='all'&&accounts.length>1&&!editingId;
      const doSwitch=async()=>{if(!switchTarget||busy)return;setBusy(true);setError('');setNotice('');try{const res=await env.switchAccount?.(switchTarget.id);setSwitchTarget(null);if(res?.manualRestartRequired){setNotice(text('账号凭据已切换，请手动重启 Antigravity 生效。','Credentials switched. Please restart Antigravity manually to apply.'));}}catch(e){setError(e.message);}finally{setBusy(false);}};
      const doAdd=async alias=>{if(busy)return;setBusy(true);setError('');setNotice('');try{const res=await env.startAddAccount?.(alias);setAddOpen(false);if(res?.manualRestartRequired){setNotice(text('新账号凭据已保存，请手动重启 Antigravity 以避免旧账号后台刷新导致自动回退。','New account credential saved. Please restart Antigravity manually to prevent reverting to the previous account.'));}}catch(e){setError(e.message);}finally{setBusy(false);}};
      const doRename=async id=>{if(busy)return;setBusy(true);setError('');try{await env.renameAccount?.(id,editingAlias);setEditingId('');}catch(e){setError(e.message);}finally{setBusy(false);}};
      const doToggleDisabled=async acct=>{if(busy)return;setBusy(true);setError('');try{await env.setAccountDisabled?.(acct.id,!acct.disabled);}catch(e){setError(e.message);}finally{setBusy(false);}};
      const doRemove=async id=>{if(busy)return;setBusy(true);setError('');try{await env.removeAccount?.(id);}catch(e){setError(e.message);}finally{setBusy(false);}};
      const doRefreshQuotas=async(accountId='')=>{if(busy||busyAction)return;setBusyAction(`quota:${accountId||'all'}`);setError('');try{const res=await env.refreshAccountQuotas?.(accountId);if(res?.credentialMismatch)setError(text('检测到系统凭据与当前显示账号不一致，已跳过同步以保护本地凭据','Credential mismatch detected; skipped sync to protect local credentials'));}catch(e){setError(e.message);}finally{setBusyAction('');}};
      const doDrop=async targetId=>{
        setDragOverId('');
        if(!dragId||dragId===targetId||!canReorder)return;
        const ids=accounts.map(a=>a.id),from=ids.indexOf(dragId),to=ids.indexOf(targetId);
        setDragId('');
        if(from<0||to<0)return;
        const [moved]=ids.splice(from,1);ids.splice(to,0,moved);
        try{await env.reorderAccounts?.(ids);}catch(e){setError(e.message);}
      };
      const tierKey=acct=>planInfoOf(acct?.tier).family;
      const tierCounts={
        all:accounts.length,
        ultra:accounts.filter(a=>tierKey(a)==='ultra').length,
        pro:accounts.filter(a=>tierKey(a)==='pro').length,
        plus:accounts.filter(a=>tierKey(a)==='plus').length,
        team:accounts.filter(a=>tierKey(a)==='team').length,
        free:accounts.filter(a=>tierKey(a)==='free').length
      };
      const tierItems=[
        ['all',`${text('全部','All')} ${tierCounts.all}`],
        ['ultra',`Ultra ${tierCounts.ultra}`],
        ['pro',`Pro ${tierCounts.pro}`],
        ['plus',`Plus ${tierCounts.plus}`],
        ...(tierCounts.team>0?[['team',`Team ${tierCounts.team}`]]:[]),
        ['free',`Free ${tierCounts.free}`]
      ];
      const filtered=accounts.filter(a=>{
        if(tierFilter!=='all'&&tierKey(a)!==tierFilter)return false;
        const q=query.trim().toLowerCase();
        if(!q)return true;
        return `${a.name||''} ${a.email||''} ${a.alias||''}`.toLowerCase().includes(q);
      });
      const currentLabel=opts.multiAccount&&headerAcct?h('div',{style:{display:'flex',alignItems:'center',gap:10,minWidth:0}},
        h(AccountAvatar,{account:headerAcct,size:'sm'}),
        h('div',{style:{minWidth:0}},
          h('div',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},h('span',{style:{fontWeight:600}},displayAccountName(headerAcct)),h(AliasTag,{alias:headerAcct.alias})),
          h('div',{className:'pt-muted'},headerAcct.email))):text('订阅方案','Plan');
      const formatLastUsed=ts=>{
        if(!Number.isFinite(ts))return '-';
        const d=new Date(ts),pad=v=>String(v).padStart(2,'0');
        return {date:`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`,clock:`${pad(d.getHours())}:${pad(d.getMinutes())}`};
      };
      const quotaHeader=h('div',{className:'pt-acct-th-quota'},
        h('span',null,text('模型配额','Model quota')),
        h('div',{className:'pt-acct-win-mini','data-testid':'agy-account-window-tabs'},
          h('button',{type:'button','aria-pressed':winMode==='5h',onClick:()=>{void env.change?.({accountQuotaWindow:'5h'});}},'5H'),
          h('button',{type:'button','aria-pressed':winMode==='weekly',onClick:()=>{void env.change?.({accountQuotaWindow:'weekly'});}},text('周','W'))));
      return h('div',{className:'pt-stack'},
        section(opts.multiAccount?text('当前账号额度','Current account quota'):text('订阅','Subscription'),h(TP,null,h(UP,{label:currentLabel,'data-testid':'agy-setting-row-current-plan',rightElement:h(PlanBadge)}))),
        ...groups.map((group,gIdx)=>{const visibleBuckets=(Array.isArray(group?.buckets)?group.buckets:[]).filter(b=>b&&b.disabled!==true);if(!visibleBuckets.length)return null;return card(group.displayName,h('div',{className:'pt-grid2'},...visibleBuckets.map((bucket,bIdx)=>{const fraction=readBucketFraction(bucket),reset=readBucketResetMs(bucket,fraction),isWeekly=bucket.window==='weekly'||/weekly/i.test(bucket.bucketId||''),estimate=env.estimates()?.find(e=>e.bucketId===bucket.bucketId);return h('div',{key:bucket.bucketId||`${gIdx}-${bIdx}`,className:'pt-quota'},h('div',{className:'pt-row'},h('span',null,t(isWeekly?'周限额':'5 小时限额')),h('span',{className:'font-medium tabular-nums'},fraction==null?'-':`${(fraction*100).toFixed(1)}%`)),h('div',{className:'pt-bar'},h('div',{className:'pt-fill',style:{width:`${Math.max(0,Math.min(1,fraction||0))*100}%`,background:fraction!=null&&fraction<.1?'var(--error)':fraction!=null&&fraction<.25?'var(--warning)':undefined}})),h('div',{className:'pt-row'},h('span',{className:'pt-estimate'},h(Tip,{label:estimate?.estimateTokens==null?text('按本周期消耗推算100%的额度（消耗满 1% 后显示）','Estimated 100% quota from current cycle usage (shown after 1% use)'):text(`按本周期消耗推算100%的额度：${n(estimate.estimateTokens)} Token`,`Estimated 100% quota from current cycle usage: ${n(estimate.estimateTokens)} tokens`)},h('span',{className:'inline-flex items-center gap-1'},icon('token',14),n(estimate?.estimateTokens))),h(Tip,{label:estimate?.estimateUsd==null?text('按本周期消耗推算100%的额度（消耗满 1% 后显示）','Estimated 100% quota from current cycle usage (shown after 1% use)'):text(`按本周期消耗推算100%的额度：${money(estimate.estimateUsd)}`,`Estimated 100% quota from current cycle usage: ${money(estimate.estimateUsd)}`)},h('span',{className:'inline-flex items-center gap-1'},icon('payments',14),estimate?.estimateUsd==null?'-':money(estimate.estimateUsd)))),h('span',{className:'pt-muted'},reset?new Date(reset).toLocaleString(env.options().language,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'')));})));}),
        H&&opts.multiAccount&&store?.isRemoteSsh&&h('div',{className:'pt-acct-warn-box',role:'status','data-testid':'agy-accounts-ssh-notice'},icon('info',15,{style:{flexShrink:0,marginTop:2,color:'var(--primary)'}}),h('span',null,text('SSH 远端窗口已自动隔离本地多账号列表与切换功能，上方仅展示当前远端登录账号的实时额度。','Local multi-account switching is disabled in SSH remote windows; only the active remote account quota is shown above.'))),
        H&&opts.multiAccount&&!store?.isRemoteSsh&&h('section',{className:'pt-stack',style:{gap:12},'data-testid':'agy-accounts-overview'},
          h('div',{className:'pt-row',style:{minHeight:34}},
            h('h2',{className:'pt-section-title'},text(`账号管理与切换 (${accounts.length})`,`Accounts (${accounts.length})`)),
            h('div',{className:'pt-toolbar'},
              h('div',{className:'pt-acct-autoswitch','data-pt-tip':text('当前账号 5 小时或周限额用尽时，自动切换到剩余额度最充足的已启用账号并重启','Auto-switch to the best enabled account and relaunch when quota runs out')},
                icon('bolt',14,{style:{color:opts.autoSwitchAccount?'var(--primary)':'var(--muted-foreground)'}}),
                h('span',null,text('耗尽自动切号','Auto switch')),
                h(XP,{checked:!!opts.autoSwitchAccount,onCheckedChange:val=>{void env.change?.({autoSwitchAccount:val});},'aria-label':text('耗尽自动切号','Auto switch on quota limit'),'data-testid':'agy-autoswitch-toggle'})),
              h(Uy,{variant:'secondary',size:'sm',type:'button',disabled:busy,'data-testid':'agy-add-account',onClick:()=>{setError('');setAddOpen(true);}},icon('add',15),h('span',null,text('添加账号','Add account'))))),
          store?.vaultSupported===false&&store?.vaultReason&&h('div',{className:'pt-acct-warn-box',role:'status','data-testid':'agy-vault-unsupported'},icon('warning',15,{style:{flexShrink:0,marginTop:2,color:'var(--warning)'}}),h('span',null,store.vaultReason)),
          notice&&h('div',{className:'pt-acct-warn-box',role:'status','data-testid':'agy-switch-manual-restart'},icon('info',15,{style:{flexShrink:0,marginTop:2,color:'var(--primary)'}}),h('span',null,notice)),
          error&&h('div',{role:'alert',className:'text-error',style:{fontSize:12}},error),
          accounts.length>0&&h('div',{className:'pt-acct-toolbar'},
            h('div',{className:'pt-search',style:{minWidth:140,flex:'1 1 160px'}},icon('search',14),h('input',{type:'search',value:query,'aria-label':text('搜索账号、邮箱或备注…','Search accounts...'),placeholder:text('搜索账号、邮箱或备注…','Search accounts...'),onChange:e=>setQuery(e.target.value),'data-testid':'agy-account-search'})),
            h(Tabs,{value:tierFilter,onChange:setTierFilter,testId:'agy-account-tier-tabs',items:tierItems}),
            h('div',{className:'pt-acct-icon-seg','data-testid':'agy-account-view-toggle'},
              h('button',{type:'button',className:'pt-acct-icon-btn','aria-label':text('列表视图','List view'),'aria-pressed':viewMode==='list','data-testid':'agy-view-list',onClick:()=>{void env.change?.({accountViewMode:'list'});}},h(ListViewIcon)),
              h('button',{type:'button',className:'pt-acct-icon-btn','aria-label':text('卡片视图','Card view'),'aria-pressed':viewMode==='card','data-testid':'agy-view-card',onClick:()=>{void env.change?.({accountViewMode:'card'});}},h(CardViewIcon)))),
          accounts.length===0
            ?h('div',{className:'pt-card p-6 text-center pt-muted'},text('正在同步当前登录账号，你也可以点击右上角「添加账号」登录更多 Google 账号。','Waiting for active account sync, or click "Add account" to sign in another Google account.'))
            :viewMode==='list'
              ?h('div',{className:'pt-card pt-table-wrap'},
                  h('table',{className:'pt-acct-table','data-testid':'agy-accounts-table'},
                    h('colgroup',null,
                      canReorder&&h('col',{style:{width:24}}),
                      h('col',null),
                      h('col',{style:{width:214}}),
                      h('col',{style:{width:76}}),
                      h('col',{style:{width:186}})),
                    h('thead',null,h('tr',null,
                      canReorder&&h('th',{style:{padding:'9px 2px'}}),
                      h('th',null,text('账号','Account')),
                      h('th',null,quotaHeader),
                      h('th',null,text('最后使用','Last used')),
                      h('th',{style:{textAlign:'right'}},text('操作','Actions')))),
                    h('tbody',null,...filtered.map(acct=>{
                      const isActive=acct.id===activeAcct?.id,effectiveAcct=fuseActiveAccount(acct,isActive,liveGroups,capEmail),summary=H.summarizeAccountQuota(effectiveAcct,now,{isActive,syncedAtMs:isActive?(env.accountFetchedAt?.()||acct.syncedAtMs):acct.syncedAtMs}),editing=editingId===acct.id,lu=formatLastUsed(acct.lastUsedAtMs||acct.syncedAtMs),needsRelogin=!isActive&&acct.hasCredential===false;
                      return h('tr',{
                        key:acct.id,
                        draggable:canReorder,
                        onDragStart:()=>{if(canReorder)setDragId(acct.id);},
                        onDragOver:e=>{if(canReorder&&dragId&&dragId!==acct.id){e.preventDefault();setDragOverId(acct.id);}},
                        onDragLeave:()=>{if(dragOverId===acct.id)setDragOverId('');},
                        onDrop:e=>{e.preventDefault();void doDrop(acct.id);},
                        onDragEnd:()=>{setDragId('');setDragOverId('');},
                        'data-active':isActive?'true':undefined,
                        'data-disabled':acct.disabled?'true':undefined,
                        'data-drag-over':dragOverId===acct.id?'true':undefined,
                        'data-testid':`agy-account-row-${acct.id}`
                      },
                        canReorder&&h('td',{style:{padding:'9px 2px',textAlign:'center'}},h('span',{className:'pt-acct-grip','data-pt-tip':text('拖动排序','Drag to reorder')},h(GripIcon))),
                        h('td',null,
                          editing
                            ?h('form',{className:'pt-acct-edit-form',onSubmit:e=>{e.preventDefault();void doRename(acct.id);}},
                                h('input',{className:'pt-acct-input','data-inline':'true',type:'text',maxLength:40,placeholder:text('输入账号备注','Account alias'),value:editingAlias,onChange:e=>setEditingAlias(e.target.value),'data-testid':`agy-alias-input-${acct.id}`}),
                                h(Uy,{variant:'primary',size:'sm',type:'submit',disabled:busy,className:'pt-acct-edit-btn'},t('保存')),
                                h(Uy,{variant:'ghost',size:'sm',type:'button',className:'pt-acct-edit-btn',onClick:()=>setEditingId('')},t('取消')))
                            :h('div',{style:{display:'flex',alignItems:'center',gap:10,minWidth:0}},
                                h(AccountAvatar,{account:acct,size:'sm'}),
                                h('div',{style:{minWidth:0,flex:1}},
                                  h('div',{className:'pt-acct-cell-primary'},
                                    h('span',{className:'pt-acct-cell-name','data-pt-tip':displayAccountName(acct)},displayAccountName(acct)),
                                    h('span',{className:'pt-muted pt-acct-cell-email','data-pt-tip':acct.email},acct.email)),
                                  h('div',{className:'pt-acct-cell-badges'},
                                    h(PlanMiniBadge,{tier:acct.tier}),
                                    h(AliasTag,{alias:acct.alias}),
                                    isActive&&h('span',{className:'pt-acct-pill','data-tone':'active'},text('当前生效','Active')),
                                    needsRelogin&&h('span',{className:'pt-acct-pill','data-tone':'warning'},text('需重新登录','Re-login required')),
                                    acct.disabled&&h('span',{className:'pt-acct-pill','data-tone':'critical'},text('已禁用','Disabled')))))),
                        h('td',null,acct.disabled
                          ?h('div',{className:'pt-acct-quota-chip',style:{justifyContent:'center',color:'var(--muted-foreground)'}},icon('block',13),h('span',null,text('账号已禁用','Account disabled')))
                          :h('div',{className:'pt-acct-quota-chips'},...summary.groups.map(group=>{
                              const b=group.buckets.find(item=>item.window===winMode)||group.buckets[0];
                              const pct=b?.effectiveFraction==null?null:Math.round(b.effectiveFraction*100);
                              const cd=b&&!b.isReset?H.formatCompactCountdown(b.resetTimeMs,now):'';
                              const mismatchWin=b&&b.window!==winMode;
                              const hint=groupQuotaHint(group,b,winMode);
                              return h('div',{key:group.key,className:'pt-acct-quota-chip','data-tone':hint.displayTone,'data-estimated':b?.isReset?'true':undefined,'data-weekly-risk':hint.weeklyTight?hint.displayTone:undefined,'data-pt-tip':hint.tip},
                                h('span',{className:'pt-acct-chip-fill',style:{width:`${pct??0}%`}}),
                                h('span',{className:'pt-acct-chip-label'},shortGroupName(group),mismatchWin&&h('span',{className:'pt-acct-win-tag'},b.window==='weekly'?text('周','7d'):'5h')),
                                h('span',{className:'pt-acct-chip-meta'},hint.weeklyPct!=null?h('span',{className:'pt-muted'},text(`周 ${hint.weeklyPct}%`,`7d ${hint.weeklyPct}%`)):(cd&&h('span',{className:'pt-muted'},cd)),h('strong',{className:'tabular-nums'},pct==null?'-':`${b?.isReset?'≈':''}${pct}%`)));
                            }))),
                        h('td',null,isActive?h('span',{className:'pt-muted'},text('当前使用','Active')):lu==='-'?'-':h('div',null,h('div',null,lu.date),h('div',{className:'pt-muted',style:{fontSize:11}},lu.clock))),
                        h('td',{style:{textAlign:'right'}},h('div',{style:{display:'inline-flex',alignItems:'center',gap:1}},
                          !isActive&&!acct.disabled&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:needsRelogin?text('需先重新登录该账号','Re-login required'):text('切换到此账号','Switch to this account'),'aria-label':text('切换','Switch'),'data-testid':`agy-switch-account-${acct.id}`,onClick:()=>{setError('');if(needsRelogin){setAddOpen(true);return;}setSwitchTarget(acct);}},icon('compare_arrows',15)),
                          isActive&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy||!!busyAction,tooltip:text('刷新当前账号额度','Refresh current account quota'),'aria-label':text('刷新当前账号额度','Refresh current account quota'),'data-testid':`agy-refresh-quota-${acct.id}`,onClick:()=>{void doRefreshQuotas(acct.id);}},icon('refresh',14,{className:busyAction===`quota:${acct.id}`?'animate-spin':''})),
                          h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:text('编辑备注','Edit alias'),'aria-label':text('备注','Alias'),'data-testid':`agy-rename-account-${acct.id}`,onClick:()=>{setEditingId(acct.id);setEditingAlias(acct.alias||'');}},icon('edit',15)),
                          !isActive&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:acct.disabled?text('启用账号','Enable account'):text('禁用账号','Disable account'),'aria-label':acct.disabled?text('启用','Enable'):text('禁用','Disable'),'data-testid':`agy-toggle-account-${acct.id}`,onClick:()=>{void doToggleDisabled(acct);}},icon(acct.disabled?'check_circle':'block',15)),
                          !isActive&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:t('移除'),'aria-label':t('移除'),'data-testid':`agy-remove-account-${acct.id}`,onClick:()=>{void doRemove(acct.id);}},icon('delete',15)))));
                    }))),
                  !filtered.length&&h('div',{className:'p-6 text-center pt-muted'},text('没有匹配的账号','No matching accounts')))
              :h('div',{className:'pt-acct-cards','data-testid':'agy-accounts-cards'},
                  ...filtered.map(acct=>{
                    const isActive=acct.id===activeAcct?.id,effectiveAcct=fuseActiveAccount(acct,isActive,liveGroups,capEmail),summary=H.summarizeAccountQuota(effectiveAcct,now,{isActive,syncedAtMs:isActive?(env.accountFetchedAt?.()||acct.syncedAtMs):acct.syncedAtMs}),editing=editingId===acct.id,needsRelogin=!isActive&&acct.hasCredential===false;
                    return h('article',{
                      key:acct.id,
                      draggable:canReorder,
                      onDragStart:()=>{if(canReorder)setDragId(acct.id);},
                      onDragOver:e=>{if(canReorder&&dragId&&dragId!==acct.id){e.preventDefault();setDragOverId(acct.id);}},
                      onDragLeave:()=>{if(dragOverId===acct.id)setDragOverId('');},
                      onDrop:e=>{e.preventDefault();void doDrop(acct.id);},
                      onDragEnd:()=>{setDragId('');setDragOverId('');},
                      className:'pt-card pt-acct-card',
                      'data-active':isActive?'true':undefined,
                      'data-disabled':acct.disabled?'true':undefined,
                      'data-drag-over':dragOverId===acct.id?'true':undefined,
                      'data-testid':`agy-account-card-${acct.id}`
                    },
                      h('div',{className:'pt-acct-card-body'},
                        h('div',{className:'pt-acct-card-head-row'},
                          h('div',{style:{display:'flex',alignItems:'center',gap:10,minWidth:0,flex:1}},
                            canReorder&&h('span',{className:'pt-acct-grip','data-pt-tip':text('拖动排序','Drag to reorder')},h(GripIcon)),
                            h(AccountAvatar,{account:acct,size:'lg'}),
                            editing
                              ?h('form',{className:'pt-acct-edit-form',onSubmit:e=>{e.preventDefault();void doRename(acct.id);}},
                                  h('input',{className:'pt-acct-input','data-inline':'true',type:'text',maxLength:40,placeholder:text('输入账号备注','Account alias'),value:editingAlias,onChange:e=>setEditingAlias(e.target.value),'data-testid':`agy-alias-input-${acct.id}`}),
                                  h(Uy,{variant:'primary',size:'sm',type:'submit',disabled:busy,className:'pt-acct-edit-btn'},t('保存')),
                                  h(Uy,{variant:'ghost',size:'sm',type:'button',className:'pt-acct-edit-btn',onClick:()=>setEditingId('')},t('取消')))
                              :h('div',{style:{minWidth:0,flex:1}},
                                  h('div',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'nowrap',overflow:'hidden'}},
                                    h('strong',{style:{fontSize:14,fontWeight:600,flexShrink:0}},displayAccountName(acct)),
                                    h(PlanMiniBadge,{tier:acct.tier}),
                                    h(AliasTag,{alias:acct.alias}),
                                    isActive&&h('span',{className:'pt-acct-pill','data-tone':'active'},text('当前使用','Active')),
                                    needsRelogin&&h('span',{className:'pt-acct-pill','data-tone':'warning'},text('需重新登录','Re-login required')),
                                    acct.disabled&&h('span',{className:'pt-acct-pill','data-tone':'critical'},text('已禁用','Disabled'))),
                                  h('div',{className:'pt-muted pt-label',style:{marginTop:2}},acct.email))),
                          !editing&&h('div',{style:{display:'flex',alignItems:'center',gap:2,flexShrink:0}},
                            !isActive&&!acct.disabled&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:needsRelogin?text('需先重新登录该账号','Re-login required'):text('切换到此账号','Switch to this account'),'aria-label':needsRelogin?text('重新登录','Re-login'):text('切换','Switch'),'data-testid':`agy-switch-account-${acct.id}`,onClick:()=>{setError('');if(needsRelogin){setAddOpen(true);return;}setSwitchTarget(acct);}},icon('compare_arrows',15)),
                            isActive&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy||!!busyAction,tooltip:text('刷新当前账号额度','Refresh current account quota'),'aria-label':text('刷新当前账号额度','Refresh current account quota'),'data-testid':`agy-refresh-quota-${acct.id}`,onClick:()=>{void doRefreshQuotas(acct.id);}},icon('refresh',15,{className:busyAction===`quota:${acct.id}`?'animate-spin':''})),
                            h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:text('编辑备注','Edit alias'),'aria-label':text('备注','Alias'),'data-testid':`agy-rename-account-${acct.id}`,onClick:()=>{setEditingId(acct.id);setEditingAlias(acct.alias||'');}},icon('edit',15)),
                            !isActive&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:acct.disabled?text('启用账号','Enable account'):text('禁用账号','Disable account'),'aria-label':acct.disabled?text('启用','Enable'):text('禁用','Disable'),'data-testid':`agy-toggle-account-${acct.id}`,onClick:()=>{void doToggleDisabled(acct);}},icon(acct.disabled?'check_circle':'block',15)),
                            !isActive&&h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7',disabled:busy,tooltip:t('移除'),'aria-label':t('移除'),'data-testid':`agy-remove-account-${acct.id}`,onClick:()=>{void doRemove(acct.id);}},icon('delete',15)))),
                        summary.groups.length>0&&h('div',{className:'pt-acct-card-quotas'},...summary.groups.map(group=>h('div',{key:group.key,className:'pt-acct-bucket-box'},
                          h('div',{style:{fontSize:12,fontWeight:600}},shortGroupName(group)),
                          ...group.buckets.map(b=>{
                            const pct=b.effectiveFraction==null?null:`${b.isReset?'≈':''}${(b.effectiveFraction*100).toFixed(1)}%`;
                            const resetLabel=b.isReset?'':H.formatResetCountdown(b.resetTimeMs,now,lang);
                            const tip=b.isReset?text('按上次记录的重置窗口本地推算（非实时）','Estimated locally from last recorded reset window'):undefined;
                            return h('div',{key:b.bucketId,style:{display:'flex',flexDirection:'column',gap:4},'data-pt-tip':tip,'data-estimated':b.isReset?'true':undefined},
                              h('div',{className:'pt-row',style:{fontSize:12}},
                                h('span',{className:'pt-muted'},t(b.window==='weekly'?'周限额':'5 小时限额')),
                                h('span',{className:'tabular-nums font-medium'},pct??'-')),
                              h('div',{className:'pt-bar',style:{height:5}},h('div',{className:'pt-fill',style:{width:`${Math.max(0,Math.min(1,b.effectiveFraction??0))*100}%`,background:bucketToneColor(b.tone)}})),
                              resetLabel&&h('div',{className:'pt-muted',style:{fontSize:11}},resetLabel));
                          })))),
                        !isActive&&acct.syncedAtMs&&h('div',{className:'pt-row pt-muted',style:{fontSize:11}},
                          h('span',null,`${text('更新于 ','Updated ')}${H.formatRelativeTime(acct.syncedAtMs,now,lang)}`))));
                  }),
                  !filtered.length&&h('div',{className:'pt-card p-6 text-center pt-muted'},text('没有匹配的账号','No matching accounts')))),
        h(SwitchConfirmModal,{target:switchTarget,active:activeAcct,runningTurn:!!env.isTurnRunning?.(),busy,error,onConfirm:()=>{void doSwitch();},onCancel:()=>{setSwitchTarget(null);setError('');}}),
        h(AddAccountModal,{open:addOpen,runningTurn:!!env.isTurnRunning?.(),busy,error,onSubmit:alias=>{void doAdd(alias);},onClose:()=>{setAddOpen(false);setError('');}}));
    }
    function Pricing({dashboard}){
      const [busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
      const catalog=env.capabilities()?.models||[],models=new Map();
      for(const config of catalog){const {id,effort}=D.modelIdentity(config.modelId||config.label);if(!models.has(id))models.set(id,new Set());if(effort)models.get(id).add(effort);}
      const pricingInfo=dashboard?.pricing||{};
      const rates=pricingInfo.rates||[];
      const pricingMode=activePricingMode(dashboard);
      const today=new Date().toISOString().slice(0,10);
      const all=[...new Set([...rates.map(r=>r.model),...models.keys()])];
      const refresh=async()=>{setBusy(true);setError('');try{await env.request('pricing.refresh');await env.loadDashboard(true);}catch(e){setError(e.message);}finally{setBusy(false);}};
      const switchMode=next=>{if(next===pricingMode)return;void env.change?.({pricingMode:next});};
      return h('div',{className:'pt-stack'},
        h('div',{className:'pt-row pt-muted'},
          h('span',null,t('每百万 Token 单价 (USD)')),
          h('div',{className:'pt-price-controls'},
            h('div',{className:'pt-price-mode',role:'group','aria-label':text('费用估算口径','Cost estimation basis'),'data-testid':'agy-pricing-mode'},
              h('button',{type:'button',className:'pt-price-mode-btn','aria-pressed':pricingMode==='standard','data-testid':'agy-pricing-mode-standard',onClick:()=>switchMode('standard')},text('正式标准价','Standard')),
              h('button',{type:'button',className:'pt-price-mode-btn','aria-pressed':pricingMode==='promo','data-testid':'agy-pricing-mode-promo',onClick:()=>switchMode('promo')},text('含 API 优惠','API promo'))),
            h(Uy,{variant:'secondary',size:'sm',onClick:()=>{void refresh();},disabled:busy,'data-testid':'agy-price-refresh'},text(busy?'正在拉取…':'重新拉取价格',busy?'Fetching…':'Fetch prices again')))),
        error&&h('div',{role:'alert'},error),
        h('div',{className:'pt-card pt-table-wrap'},
          h('table',{className:'pt-table','data-testid':'agy-price-table'},
            h('thead',null,h('tr',null,...['模型','输入','输出','缓存读取',text('缓存写入','Cache write'),''].map((label,index)=>h('th',{key:index,className:index?'numeric':''},t(label))))),
            h('tbody',null,...all.map(id=>{
              const rate=rates.find(r=>r.model===id);
              const hasScheduled=Boolean(rate?.until&&rate?.next);
              const promoActive=Boolean(hasScheduled&&today<rate.until);
              const active=hasScheduled?(pricingMode==='standard'?rate.next:(today>=rate.until?rate.next:rate)):rate;
              const through=promoActive?promoThroughDate(rate.until):'';
              const efforts=[...(models.get(id)||[])].sort((a,b)=>['minimal','low','medium','high','xhigh','max'].indexOf(a)-['minimal','low','medium','high','xhigh','max'].indexOf(b));
              const isOrchestrator=!active&&/orchestrator/i.test(id);
              const promoTagText=text(`API 优惠至 ${through}`,`API promo thru ${through}`);
              const showPromoTag=promoActive&&pricingMode==='promo';
              const promoTagTip=showPromoTag?text(`${rate.until} 起恢复正式标准价（输入 $${rate.next.input} / 输出 $${rate.next.output}）`,`Standard list pricing ($${rate.next.input} in / $${rate.next.output} out) starts ${rate.until}`):undefined;
              return h('tr',{key:id,'data-model':id},
                h('td',null,
                  h('div',{className:'pt-price-model'},id),
                  (efforts.length>0||showPromoTag)&&h('div',{className:'pt-efforts'},
                    ...efforts.map(effort=>h('span',{key:effort,className:'pt-effort','data-pt-tip':text('思考深度','Reasoning effort')},({low:'Low',medium:'Medium',high:'High',xhigh:'XHigh',max:'Max',minimal:'Minimal',thinking:'Thinking'})[effort]||effort)),
                    showPromoTag&&h('span',{className:'pt-price-promo-tag','data-active':'true','data-testid':'agy-price-promo-tag','data-pt-tip':promoTagTip},promoTagText))),
                isOrchestrator
                  ?h('td',{colSpan:5,className:'numeric pt-muted'},text('按实际规划 / 执行模型计价','Priced by underlying planner / execution model'))
                  :h(R.Fragment,null,
                    ...[active?.input,active?.output,active?.cache,active?.cacheWrite].map((value,index)=>h('td',{key:index,className:'numeric','data-pt-tip':index===3&&active?.cacheWriteTtl?text('5 分钟缓存写入','5-minute cache write'):undefined},value==null?'-':`$${value}`)),
                    h('td',{className:'numeric'},rate?.source&&h('a',{href:rate.source,target:'_blank',rel:'noopener noreferrer','aria-label':t('官方价格'),className:'text-muted-foreground hover:text-foreground'},icon('open_in_new')))));
            })))));
    }
    function About(){
      useData();
      const opts=env.options?.()||{};
      const notice=env.updateNotice?.()||null;
      const project=env.project||{name:'Agy Powertools'},[busy,setBusy]=R.useState(false),[result,setResult]=R.useState(()=>notice?.status==='available'?notice:null),[installState,setInstallState]=R.useState(()=>env.updateInstallState?.()||{status:'idle'});
      const [notesExpanded]=R.useState(()=>Boolean(env.consumeExpandUpdateNotes?.()));
      const effectiveResult=result||(notice?.status==='available'?notice:null);
      const updating=['preparing','downloading','verifying','installing'].includes(installState.status);
      const poll=async()=>{try{setInstallState(await env.request('update.status'));}catch{}};
      R.useEffect(()=>{void poll();},[]);
      R.useEffect(()=>{
        if(!env.consumeScrollToAbout?.())return;
        const timer=setTimeout(()=>{document.querySelector?.('[data-testid="agy-setting-row-project"]')?.scrollIntoView?.({behavior:'smooth',block:'center'});},60);
        return()=>clearTimeout(timer);
      },[]);
      R.useEffect(()=>{if(!updating)return;const timer=setInterval(()=>{void poll();},1000);return()=>clearInterval(timer);},[updating]);
      const validUrl=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
      const renderInlineMd=(src,prefix)=>{
        const nodes=[];
        const re=/`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
        let last=0,match,i=0;
        while((match=re.exec(src))){
          if(match.index>last)nodes.push(src.slice(last,match.index));
          if(match[1]!=null)nodes.push(h('code',{key:`${prefix}-c${i++}`},match[1]));
          else if(match[2]!=null)nodes.push(h('strong',{key:`${prefix}-b${i++}`},...renderInlineMd(match[2],`${prefix}-b${i}`)));
          else if(match[3]!=null){
            const href=match[4];
            if(validUrl(href))nodes.push(h('a',{key:`${prefix}-a${i++}`,href,target:'_blank',rel:'noopener noreferrer'},match[3]));
            else nodes.push(match[3]);
          }
          last=re.lastIndex;
        }
        if(last<src.length)nodes.push(src.slice(last));
        return nodes.length?nodes:[src];
      };
      const renderReleaseNotes=raw=>{
        const lines=String(raw||'').replace(/\r\n?/g,'\n').split('\n');
        const blocks=[];
        let listType=null,items=[],bIdx=0;
        const flushList=()=>{
          if(!listType||!items.length)return;
          const liEls=items.map((item,idx)=>h('li',{key:`li-${bIdx}-${idx}`},
            ...renderInlineMd(item.text,`li-${bIdx}-${idx}`),
            item.subs.length>0&&h('ul',{key:`sub-${bIdx}-${idx}`},...item.subs.map((sub,si)=>h('li',{key:`s-${bIdx}-${idx}-${si}`},...renderInlineMd(sub,`s-${bIdx}-${idx}-${si}`))))));
          blocks.push(h(listType,{key:`list-${bIdx++}`},...liEls));
          listType=null;items=[];
        };
        for(const line of lines){
          const trimmed=line.trim();
          if(!trimmed){flushList();continue;}
          if(/^---+$/.test(trimmed)){flushList();blocks.push(h('hr',{key:`hr-${bIdx++}`}));continue;}
          const head=trimmed.match(/^(#{1,4})\s+(.+)$/);
          if(head){
            flushList();
            blocks.push(h(head[1].length<=2?'h4':'h5',{key:`h-${bIdx++}`},...renderInlineMd(head[2],`h-${bIdx}`)));
            continue;
          }
          const ul=line.match(/^(\s*)[-*+]\s+(.+)$/);
          if(ul){
            const indent=ul[1].length;
            if(indent>=2&&listType&&items.length){items[items.length-1].subs.push(ul[2]);continue;}
            if(listType&&listType!=='ul')flushList();
            listType='ul';items.push({text:ul[2],subs:[]});
            continue;
          }
          const ol=line.match(/^(\s*)\d+\.\s+(.+)$/);
          if(ol){
            if(listType&&listType!=='ol')flushList();
            listType='ol';items.push({text:ol[2],subs:[]});
            continue;
          }
          flushList();
          blocks.push(h('p',{key:`p-${bIdx++}`},...renderInlineMd(trimmed,`p-${bIdx}`)));
        }
        flushList();
        return h('div',{className:'pt-release-notes','data-testid':'agy-release-notes-body'},...blocks);
      };
      const check=async()=>{if(busy||updating)return;setBusy(true);setResult(null);setInstallState({status:'idle'});try{const next=await env.request('update.check');setResult(next);env.syncUpdateResult?.(next);}catch{setResult({status:'error'});}finally{setBusy(false);}};
      const install=async()=>{if(updating||busy||!effectiveResult?.canInstall)return;setInstallState({status:'preparing',version:effectiveResult.version});try{setInstallState(await env.request('update.install',{version:effectiveResult.version}));}catch{setInstallState({status:'failed'});}};
      const progress={preparing:text('正在准备更新…','Preparing update…'),downloading:text('正在下载…','Downloading…'),verifying:text('正在校验…','Verifying…'),installing:text('正在安装…','Installing…'),completed:text('更新完成','Update installed'),'rolled-back':text('更新失败，已恢复旧版本','Update failed. Previous version restored.'),failed:text('更新失败，请稍后重试','Update failed. Try again later.')};
      const messages={unconfigured:text('尚未配置 GitHub 地址','GitHub URL not configured'),'invalid-config':text('请检查 GitHub 地址','Check the GitHub URL'),'no-release':text('仓库尚未公开或未发布正式版本','Repository unavailable or no stable release'),current:text('已是最新版本','Up to date'),available:text(`发现新版本 v${effectiveResult?.version||''}`,`Version v${effectiveResult?.version||''} available`),'rate-limited':text('检查次数过多，请稍后重试','Too many checks. Try again later.'),'unsupported-release':text('暂不支持此版本信息','Unsupported release information'),error:text('检查失败，请稍后重试','Check failed. Try again later.')};
      const projectName=validUrl(project.githubUrl)?h('a',{href:project.githubUrl,target:'_blank',rel:'noopener noreferrer','data-testid':'agy-project-link','data-pt-tip':text('在 GitHub 查看项目','View project on GitHub'),className:'inline-flex items-center gap-1.5 text-foreground hover:underline rounded-sm focus-visible:outline-2 outline-ring'},project.name,icon('open_in_new',14,{'aria-hidden':true})):h('span',{'data-testid':'agy-project-name'},project.name);
      const labelNode=h('span',{className:'pt-about-head'},
        projectName,
        h('span',{className:'pt-about-ver'},'v',h('span',{'data-testid':'agy-about-version'},env.version)),
        validUrl(project.subscriptionUrl)&&h('a',{href:project.subscriptionUrl,target:'_blank',rel:'noopener noreferrer','data-testid':'agy-subscription-link',className:'pt-about-sub-link'},text('订阅','Subscribe')));
      const compareVer=(a,b)=>{const pa=String(a||'').replace(/^v/,'').split('.').map(Number),pb=String(b||'').replace(/^v/,'').split('.').map(Number);if(pa.length<3||pb.length<3||pa.some(Number.isNaN)||pb.some(Number.isNaN))return null;for(let i=0;i<3;i++)if(pa[i]!==pb[i])return pa[i]>pb[i]?1:-1;return 0;};
      const staleCompleted=installState.status==='completed'&&Boolean(installState.version)&&compareVer(env.version,installState.version)>=0;
      const effectiveInstall=staleCompleted?{status:'idle'}:installState;
      const hasInstallStatus=effectiveInstall.status!=='idle';
      const showDesc=hasInstallStatus||(effectiveResult&&effectiveResult.status!=='current');
      const descTone=effectiveInstall.status==='completed'?'ok':(effectiveInstall.status==='failed'||effectiveInstall.status==='rolled-back'||(effectiveResult&&!['available','current'].includes(effectiveResult.status)))?'error':undefined;
      const installMsg=progress[effectiveInstall.status]||'';
      const installDetail=(effectiveInstall.status==='failed'||effectiveInstall.status==='rolled-back')&&effectiveInstall.error?`${installMsg} (${effectiveInstall.error})`:installMsg;
      const descriptionNode=showDesc?h('span',{className:'pt-about-sub','data-tone':descTone,role:'status','data-testid':hasInstallStatus?'agy-install-status':'agy-update-status'},
        h('span',null,hasInstallStatus?installDetail:(messages[effectiveResult.status]||messages.error)),
        !hasInstallStatus&&effectiveResult?.status==='available'&&effectiveResult.canInstall&&validUrl(effectiveResult.releaseUrl)&&h('a',{href:effectiveResult.releaseUrl,target:'_blank',rel:'noopener noreferrer','data-testid':'agy-update-download',className:'pt-about-sub-link'},text('发布页','Release page'),icon('open_in_new',12,{'aria-hidden':true}))):undefined;
      const actionButton=(()=>{
        if(updating){
          return h(Uy,{variant:'primary',size:'sm',disabled:true,'data-testid':'agy-install-update',className:'pt-about-btn'},
            icon('progress_activity',14,{className:'animate-spin','aria-hidden':true}),
            h('span',null,progress[effectiveInstall.status]||text('正在更新…','Updating…')));
        }
        if(effectiveInstall.status==='completed'){
          return h(Uy,{variant:'secondary',size:'sm',disabled:true,'data-testid':'agy-install-update',className:'pt-about-btn pt-about-btn-ok'},
            icon('check_circle',14,{'aria-hidden':true}),
            h('span',null,text('更新完成','Updated')));
        }
        if(effectiveResult?.status==='available'){
          if(effectiveResult.canInstall){
            const retryInstall=effectiveInstall.status==='failed'||effectiveInstall.status==='rolled-back';
            return h(Uy,{variant:'primary',size:'sm',onClick:()=>{void install();},disabled:busy,'data-testid':'agy-install-update',className:'pt-about-btn'},
              icon(retryInstall?'refresh':'download',14,{'aria-hidden':true}),
              h('span',null,retryInstall?text('重试更新','Retry update'):text(`更新至 v${effectiveResult.version}`,`Update to v${effectiveResult.version}`)));
          }
          return validUrl(effectiveResult.releaseUrl)
            ?h(Uy,{variant:'secondary',size:'sm',asChild:true},h('a',{href:effectiveResult.releaseUrl,target:'_blank',rel:'noopener noreferrer','data-testid':'agy-update-download',className:'pt-about-btn'},h('span',null,text('打开下载页','Open download page')),icon('open_in_new',13,{'aria-hidden':true})))
            :h(Uy,{variant:'secondary',size:'sm',disabled:true,tooltip:text('尚未配置链接','Link not configured'),'data-testid':'agy-update-download',className:'pt-about-btn'},text('打开下载页','Open download page'));
        }
        if(busy){
          return h(Uy,{variant:'secondary',size:'sm',disabled:true,'data-testid':'agy-check-update',className:'pt-about-btn'},
            icon('progress_activity',14,{className:'animate-spin','aria-hidden':true}),
            h('span',null,text('正在检查…','Checking…')));
        }
        if(effectiveResult?.status==='current'){
          return h(Uy,{variant:'secondary',size:'sm',onClick:()=>{void check();},tooltip:text('已是最新版本，点击重新检查','Up to date. Click to check again.'),'data-testid':'agy-check-update',className:'pt-about-btn pt-about-btn-ok'},
            icon('check',14,{'aria-hidden':true}),
            h('span',{'data-testid':'agy-update-status',role:'status'},text('已是最新','Up to date')));
        }
        return h(Uy,{variant:'secondary',size:'sm',onClick:()=>{void check();},'data-testid':'agy-check-update',className:'pt-about-btn'},
          icon('refresh',14,{'aria-hidden':true}),
          h('span',null,effectiveResult||hasInstallStatus?text('重新检查','Check again'):text('检查更新','Check for updates')));
      })();
      const aboutToggle=(key,label,desc)=>h(UP,{
        label,description:desc,descriptionId:`agy-setting-description-${key}`,'data-testid':`agy-setting-row-${key}`,
        rightElement:h(XP,{checked:Boolean(opts[key]),onCheckedChange:value=>{void env.change?.({[key]:value});},'aria-label':label,'aria-describedby':`agy-setting-description-${key}`,'data-testid':`agy-setting-${key}`})
      });
      return section(text('关于','About'),h(TP,null,
        h(UP,{label:labelNode,description:descriptionNode,'data-testid':'agy-setting-row-project',rightElement:h('div',{className:'pt-about-actions'},actionButton)}),
        effectiveResult?.status==='available'&&effectiveResult.notes&&h(k0,{trigger:text('更新说明','Release notes'),defaultExpanded:notesExpanded,dataTestId:'agy-update-notes'},renderReleaseNotes(effectiveResult.notes)),
        typeof env.change==='function'&&aboutToggle('autoCheckUpdates',text('启动时自动检查更新','Automatically check for updates'),text('每 12 小时检查一次 GitHub 新版本；检测到 Antigravity 客户端升级时会检查已适配的更新。','Checks GitHub Releases every 12 hours, and checks for compatible updates when Antigravity upgrades.')),
        typeof env.change==='function'&&opts.autoCheckUpdates!==false&&aboutToggle('autoInstallUpdates',text('空闲时自动热更新','Auto-install updates when idle'),text('默认关闭。开启后在所有会话空闲时自动校验并热安装同大版本更新，无需重启客户端。','Disabled by default. Verifies and installs same-major updates when all conversations are idle, without restarting the client.'))));
    }
    function NetworkProxySection({options,toggle}){
      const status=env.proxyStatus?.()||null;
      const parseParts=raw=>{
        const trimmed=String(raw||'').trim();
        if(!trimmed)return{protocol:'http:',host:'',port:'',auth:''};
        try{
          const u=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)?trimmed:`http://${trimmed}`);
          const protocol=u.protocol==='socks5:'||u.protocol==='socks5h:'?'socks5:':u.protocol==='https:'?'https:':'http:';
          const auth=u.username?`${u.username}${u.password?`:${u.password}`:''}@`:'';
          const host=u.hostname.replace(/^\[|\]$/g,'');
          return{protocol,host,port:u.port||'',auth};
        }catch{
          return{protocol:'http:',host:trimmed,port:'',auth:''};
        }
      };
      const initialParts=parseParts(options.proxyUrl);
      const [protocolDraft,setProtocolDraft]=R.useState(()=>initialParts.protocol);
      const [hostDraft,setHostDraft]=R.useState(()=>initialParts.host);
      const [portDraft,setPortDraft]=R.useState(()=>initialParts.port);
      const [authDraft,setAuthDraft]=R.useState(()=>initialParts.auth);
      const [bypassDraft,setBypassDraft]=R.useState(()=>options.proxyBypass||'localhost,127.0.0.1,::1');
      const [testing,setTesting]=R.useState(false);
      const [saving,setSaving]=R.useState(false);
      const [relaunching,setRelaunching]=R.useState(false);
      const [feedback,setFeedback]=R.useState(null);
      const [confirmRunning,setConfirmRunning]=R.useState(false);
      R.useEffect(()=>{void env.loadProxyStatus?.().catch(()=>{});},[]);
      R.useEffect(()=>{
        const next=parseParts(options.proxyUrl);
        setProtocolDraft(next.protocol);setHostDraft(next.host);setPortDraft(next.port);setAuthDraft(next.auth);
      },[options.proxyUrl]);
      R.useEffect(()=>{setBypassDraft(options.proxyBypass||'localhost,127.0.0.1,::1');},[options.proxyBypass]);
      const composeUrl=()=>{
        const host=String(hostDraft||'').trim().replace(/^\[|\]$/g,'');
        const portText=String(portDraft||'').trim();
        if(!host&&!portText)return{url:'',error:''};
        if(!host)return{url:'',error:text('请填写代理主机或 IP 地址','Enter a proxy host or IP address.')};
        if(/[\s'"`\\;$|&<>\/]/.test(host))return{url:'',error:text('主机或 IP 格式无效','Invalid proxy host or IP address.')};
        if(!portText)return{url:'',error:text('请填写代理端口','Enter a proxy port.')};
        if(!/^\d{1,5}$/.test(portText))return{url:'',error:text('端口需为 1 到 65535 之间的数字','Port must be a number between 1 and 65535.')};
        const portNum=Number(portText);
        if(portNum<1||portNum>65535)return{url:'',error:text('端口需为 1 到 65535 之间的数字','Port must be a number between 1 and 65535.')};
        const formattedHost=host.includes(':')?`[${host}]`:host;
        return{url:`${protocolDraft}//${authDraft}${formattedHost}:${portNum}`,error:''};
      };
      const composed=composeUrl();
      const cleanUrl=composed.url;
      const cleanBypass=String(bypassDraft||'').trim()||'localhost,127.0.0.1,::1';
      const dirty=cleanUrl!==(options.proxyUrl||'')||cleanBypass!==(options.proxyBypass||'localhost,127.0.0.1,::1');
      const handleHostChange=raw=>{
        setFeedback(null);
        const val=String(raw||'');
        const trimmed=val.trim();
        if(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)||(/^[^:\s/]+:\d{1,5}$/.test(trimmed))){
          const parsed=parseParts(trimmed);
          if(parsed.host){
            setProtocolDraft(parsed.protocol);
            setHostDraft(parsed.host);
            if(parsed.port)setPortDraft(parsed.port);
            setAuthDraft(parsed.auth);
            return;
          }
        }
        setHostDraft(val);
      };
      const handlePortChange=raw=>{
        setFeedback(null);
        setPortDraft(String(raw||'').replace(/[^\d]/g,'').slice(0,5));
      };
      const saveDraft=async(extra={})=>{
        const built=composeUrl();
        if(built.error){setFeedback({tone:'error',text:built.error});return false;}
        const nextUrl=built.url;
        const nextBypass=String(bypassDraft||'').trim()||'localhost,127.0.0.1,::1';
        setSaving(true);setFeedback(null);setConfirmRunning(false);
        try{
          await env.change({proxyUrl:nextUrl,proxyBypass:nextBypass,...extra});
          const err=env.settingsError?.();
          if(err){setFeedback({tone:'error',text:err});return false;}
          setFeedback({tone:'ok',text:text('代理配置已保存，重启 Antigravity 后生效','Proxy settings saved. Relaunch Antigravity to apply.')});
          return true;
        }finally{setSaving(false);}
      };
      const runTest=async()=>{
        const built=composeUrl();
        if(built.error||!built.url){setFeedback({tone:'error',text:built.error||text('请先填写代理主机与端口','Enter a proxy host and port first.')});return;}
        setTesting(true);setFeedback(null);
        try{
          const res=await env.testProxy?.(built.url);
          if(res?.ok){
            setFeedback({tone:'ok',text:text(`连接成功（${res.latencyMs??0} ms，已通过代理连通 Google API）`,`Connected (${res.latencyMs??0} ms, reached Google API via proxy)`)});
          }else{
            setFeedback({tone:'error',text:res?.message||res?.error||text('代理测试失败','Proxy test failed')});
          }
        }catch(e){
          setFeedback({tone:'error',text:e.message||text('代理测试失败','Proxy test failed')});
        }finally{setTesting(false);}
      };
      const runRelaunch=async({force=false,saveFirst=false}={})=>{
        if(relaunching)return;
        if(saveFirst&&(dirty||!options.proxyEnabled)){
          const built=composeUrl();
          if(built.error||!built.url){setFeedback({tone:'error',text:built.error||text('请先填写有效的代理主机与端口','Enter a valid proxy host and port first.')});return;}
          const saved=await saveDraft({proxyEnabled:true});
          if(!saved)return;
        }
        if(!force&&env.isTurnRunning?.()&&!confirmRunning){
          setConfirmRunning(true);
          setFeedback({tone:'warning',text:text('当前会话仍有任务正在运行，重启会中断本轮生成。','A conversation turn is still running. Relaunching will interrupt generation.'),allowForce:false,confirmTurn:true});
          return;
        }
        setConfirmRunning(false);
        setRelaunching(true);
        setFeedback(null);
        try{
          const res=await env.relaunchWithProxy?.({force});
          if(res?.portUnreachable){
            setFeedback({tone:'warning',text:res.message||res.error||text('代理端口当前未监听，请先启动代理软件','Proxy port is not listening. Start your proxy app first.'),allowForce:true});
          }else if(res?.ok&&res?.relaunching){
            setFeedback({tone:'ok',text:text('正在重启 Antigravity…','Relaunching Antigravity…')});
          }else{
            setFeedback({tone:'error',text:res?.message||res?.error||text('重启失败，请稍后重试','Failed to relaunch.')});
          }
        }catch(e){
          setFeedback({tone:'error',text:e.message||text('重启失败，请稍后重试','Failed to relaunch.')});
        }finally{setRelaunching(false);}
      };
      const showStatus=Boolean(options.proxyEnabled||status?.mismatch);
      const statusState=status?.reason==='active'?'active':status?.mismatch?'mismatch':'idle';
      const statusText=status?.reason==='active'
        ?text(`当前窗口已通过代理运行（${status.activeDisplayUrl}${status.activeForceHttp1?' / HTTP/1.1':''}）`,`Active in this window (${status.activeDisplayUrl}${status.activeForceHttp1?' / HTTP/1.1':''})`)
        :status?.reason==='needs-disable'
          ?text('已关闭独立代理，当前窗口仍在使用旧代理，需重启恢复直连','Proxy disabled; this window still uses the previous proxy until relaunched')
          :status?.reason==='config-changed'
            ?text('代理配置已修改，需重启 Antigravity 生效','Proxy settings changed; relaunch Antigravity to apply')
            :status?.reason==='not-applied'
              ?text(`当前窗口尚未启用代理（${status.configuredDisplayUrl}），重启后生效`,`Not active in this window (${status.configuredDisplayUrl}); relaunch to enable`)
              :text('请选择协议并填写主机与端口，测试通过后重启生效','Select protocol and enter host & port, then test and relaunch');
      const displayComposed=cleanUrl?cleanUrl.replace(/\/\/[^@]+@/,'//***@'):'';
      return section(text('网络代理','Network proxy'),h(TP,null,
        h(UP,{label:text('启用独立代理（免 TUN）','Application proxy (no TUN)'),description:text('默认关闭。不修改客户端文件与快捷方式，通过重启为当前窗口注入代理参数与环境变量；下次冷启动若未启用会自动提示一键重启。','Disabled by default. Injects proxy args and env on relaunch without patching client files or shortcuts, and prompts to relaunch on cold start.'),descriptionId:'agy-setting-description-proxyEnabled','data-testid':'agy-setting-row-proxyEnabled',rightElement:h(XP,{checked:!!options.proxyEnabled,onCheckedChange:value=>{setFeedback(null);setConfirmRunning(false);void env.change({proxyEnabled:value});},'aria-label':text('启用独立代理（免 TUN）','Application proxy (no TUN)'),'aria-describedby':'agy-setting-description-proxyEnabled','data-testid':'agy-setting-proxyEnabled'})}),
        showStatus&&h('div',{className:'pt-proxy-banner','data-state':statusState,'data-testid':'agy-proxy-status-bar'},
          h('div',{style:{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}},
            h('span',{className:'pt-proxy-dot','data-state':statusState}),
            h('span',{style:{lineHeight:1.45,wordBreak:'break-word'}},statusText)),
          status?.mismatch&&status?.canRelaunch!==false&&!options.proxyEnabled&&h(Uy,{variant:'primary',size:'sm',type:'button',disabled:relaunching,'data-testid':'agy-proxy-restore-direct-btn',onClick:()=>{void runRelaunch({force:true,saveFirst:false});}},relaunching?text('正在重启…','Relaunching…'):text('立即重启恢复','Relaunch to restore'))),
        options.proxyEnabled&&h('div',{className:'pt-proxy-fields'},
          h('div',{className:'pt-proxy-field'},
            h('div',{className:'pt-proxy-field-head'},
              h('span',{style:{fontSize:13,color:'var(--foreground)'}},text('代理服务器','Proxy server')),
              h('span',{className:'pt-muted tabular-nums'},displayComposed||text('协议 / 主机或 IP / 端口','Protocol / Host or IP / Port'))),
            h('div',{className:'pt-proxy-grid'},
              h(Select,{value:protocolDraft,onChange:protocol=>{setProtocolDraft(protocol);setFeedback(null);},label:text('代理协议','Protocol'),testId:'agy-proxy-protocol-select',items:[['http:','HTTP'],['socks5:','SOCKS5'],['https:','HTTPS']]}),
              h('input',{className:'pt-acct-input',type:'text',maxLength:200,'aria-label':text('代理主机或 IP','Proxy host or IP'),placeholder:'127.0.0.1',value:hostDraft,onChange:e=>handleHostChange(e.target.value),'data-testid':'agy-proxy-host-input'}),
              h('input',{className:'pt-acct-input tabular-nums',type:'text',inputMode:'numeric',maxLength:5,'aria-label':text('代理端口','Proxy port'),placeholder:'7897',value:portDraft,onChange:e=>handlePortChange(e.target.value),'data-testid':'agy-proxy-port-input'}))),
          h('label',{className:'pt-proxy-field'},
            h('div',{className:'pt-proxy-field-head'},
              h('span',{style:{fontSize:13,color:'var(--foreground)'}},text('不走代理的地址（NO_PROXY）','Bypass list (NO_PROXY)')),
              h('span',{className:'pt-muted'},text('会自动保留 localhost、127.0.0.1、::1','Always keeps localhost, 127.0.0.1, ::1'))),
            h('input',{className:'pt-acct-input',type:'text',maxLength:512,placeholder:'localhost,127.0.0.1,::1,192.168.0.0/16',value:bypassDraft,onChange:e=>{setBypassDraft(e.target.value);setFeedback(null);},'data-testid':'agy-proxy-bypass-input'})),
          h('div',{className:'pt-proxy-actions'},
            h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}},
              h(Uy,{variant:'secondary',size:'sm',type:'button',disabled:testing||saving||relaunching||!cleanUrl,'data-testid':'agy-proxy-test-btn',onClick:()=>{void runTest();}},testing?text('测试中…','Testing…'):text('测试连通性','Test connection')),
              h(Uy,{variant:'secondary',size:'sm',type:'button',disabled:saving||relaunching||!dirty||Boolean(composed.error),'data-testid':'agy-proxy-save-btn',onClick:()=>{void saveDraft();}},saving?text('保存中…','Saving…'):text('保存设置','Save'))),
            status?.canRelaunch!==false&&h(Uy,{variant:'primary',size:'sm',type:'button',disabled:saving||relaunching||!cleanUrl,'data-testid':'agy-proxy-apply-btn',onClick:()=>{void runRelaunch({force:false,saveFirst:true});}},relaunching?text('正在重启…','Relaunching…'):dirty?text('保存并重启生效','Save & relaunch'):text('立即重启生效','Relaunch to apply')))),
        feedback&&h('div',{style:{padding:'0 14px 12px'}},
          h('div',{className:'pt-proxy-feedback','data-tone':feedback.tone,role:feedback.tone==='error'?'alert':'status','data-testid':'agy-proxy-feedback'},
            h('span',{style:{flex:1,minWidth:0}},feedback.text),
            feedback.allowForce&&h(Uy,{variant:'secondary',size:'sm',type:'button',disabled:relaunching,'data-testid':'agy-proxy-force-relaunch-btn',onClick:()=>{void runRelaunch({force:true,saveFirst:false});}},text('仍要重启','Relaunch anyway')),
            feedback.confirmTurn&&h(Uy,{variant:'primary',size:'sm',type:'button',disabled:relaunching,'data-testid':'agy-proxy-confirm-turn-btn',onClick:()=>{void runRelaunch({force:false,saveFirst:false});}},text('仍要重启','Relaunch anyway')))),
        options.proxyEnabled&&toggle('proxyForceHttp1',text('强制 HTTP/1.1（缓解 EOF）','Force HTTP/1.1 (mitigate EOF)'),text('给后端注入 GODEBUG=http2client=0，禁用 Go HTTP/2 长连接复用，缓解停顿后的 Post: EOF 断连。','Inject GODEBUG=http2client=0 to disable Go HTTP/2 connection reuse and mitigate idle Post: EOF drops.'))));
    }
    function Settings(){
      useData();
      useQuickBadgePrefs();
      const options=env.options(),[riskOpen,setRiskOpen]=R.useState(false);
      const toggle=(key,label,description)=>h(UP,{key,label:t(label),description,descriptionId:description?`agy-setting-description-${key}`:undefined,'data-testid':`agy-setting-row-${key}`,rightElement:h(XP,{checked:options[key],onCheckedChange:value=>{void env.change({[key]:value});},'aria-label':t(label),'aria-describedby':description?`agy-setting-description-${key}`:undefined,'data-testid':`agy-setting-${key}`})});
      return h('div',{className:'pt-stack'},
        env.settingsError()&&h('div',{role:'alert'},env.settingsError()),
        h(TP,null,toggle('enabled',text('启用 Powertools','Enable Powertools'),text('关闭后暂停所有增强，保留当前设置。','Turn off enhancements and keep your settings.'))),
        options.enabled&&h(R.Fragment,null,
          section(text('界面与显示','Interface & display'),h(TP,null,
            h(UP,{label:t('语言'),description:text('切换插件面板与客户端常用原生菜单的显示语言。','Switch display language for Powertools and common native UI menus.'),'data-testid':'agy-setting-row-language',rightElement:h(Select,{value:options.language,onChange:language=>{void env.change({language});},label:'语言',testId:'agy-language-select',items:[['zh-CN','简体中文'],['zh-TW','繁體中文'],['en','English']]})}),
            toggle('compact','紧凑排版',text('收紧聊天行高、段落留白与工具行高，字号跟随客户端设置。','Tighten chat line height and block spacing while following client font size.')),
            toggle('userBubbleTint',text('用户消息气泡着色','Tint user message bubbles'),text('默认关闭。开启后为用户发出的消息气泡添加低饱和底色与细边框，便于在长对话中快速区分提问与回复。','Disabled by default. Adds a subtle low-saturation tint and hairline border to user message bubbles.')),
            options.userBubbleTint&&(()=>{
              const presets=[
                ['slate','#52647A',text('石墨青灰','Slate')],
                ['ocean','#2F6FB8',text('静谧海蓝','Ocean')],
                ['sage','#3D7A64',text('松雾青绿','Sage')],
                ['sand','#9A6B3C',text('暖砂米棕','Sand')],
                ['plum','#6F5A8E',text('暮色灰紫','Plum')]
              ];
              const curPreset=options.userBubblePreset||'accent';
              const curColor=/^#[0-9a-fA-F]{6}$/.test(options.userBubbleColor||'')?options.userBubbleColor:'#2F75C3';
              const curStrength=Number.isInteger(options.userBubbleStrength)&&options.userBubbleStrength>=10&&options.userBubbleStrength<=100?options.userBubbleStrength:20;
              const activeTint=curPreset==='accent'?'var(--primary)':curPreset==='custom'?curColor:(presets.find(([k])=>k===curPreset)?.[1]||'var(--primary)');
              const previewFg=(()=>{
                if(curStrength<60)return undefined;
                if(activeTint==='var(--primary)')return 'var(--primary-foreground,#ffffff)';
                const m=/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(activeTint);
                if(!m)return undefined;
                const lum=0.299*parseInt(m[1],16)+0.587*parseInt(m[2],16)+0.114*parseInt(m[3],16);
                return lum<150?'#ffffff':'#111827';
              })();
              const rangePct=Math.round((curStrength-10)/90*100);
              const checkSvg=()=>h('svg',{viewBox:'0 0 12 12',fill:'none','aria-hidden':true},h('path',{d:'M2.5 6.2 5 8.7 9.5 3.6',stroke:'#fff',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'}));
              return h('div',{className:'pt-bubble-panel','data-testid':'agy-setting-row-userBubbleColor'},
                h('div',{className:'pt-bubble-head'},
                  h('div',{className:'pt-bubble-meta'},
                    h('div',{className:'pt-bubble-title'},text('气泡颜色','Bubble color')),
                    h('div',{className:'pt-muted'},text('选择聊天中用户消息气泡的配色方案。','Choose the color style for your message bubbles in chat.'))),
                  h('div',{className:'pt-bubble-controls',role:'group','aria-label':text('气泡颜色','Bubble color')},
                    h('button',{
                      type:'button',className:'pt-bubble-pill',
                      'aria-pressed':curPreset==='accent',
                      'data-testid':'agy-bubble-preset-accent',
                      'data-pt-tip':text('跟随客户端强调色','Follow client accent color'),
                      onClick:()=>{void env.change({userBubblePreset:'accent'});}
                    },h('span',{className:'pt-bubble-dot',style:{'--pt-dot':'var(--primary)'}}),h('span',null,text('强调色','Accent'))),
                    h('span',{className:'pt-bubble-divider','aria-hidden':true}),
                    h('div',{className:'pt-bubble-swatches'},
                      ...presets.map(([key,swatch,label])=>h('button',{
                        key,type:'button',className:'pt-bubble-swatch',
                        'data-pt-tip':label,'aria-label':label,'aria-pressed':curPreset===key,
                        'data-testid':`agy-bubble-preset-${key}`,
                        style:{'--pt-swatch':swatch},
                        onClick:()=>{void env.change({userBubblePreset:key});}
                      },checkSvg()))),
                    h('span',{className:'pt-bubble-divider','aria-hidden':true}),
                    h('label',{
                      className:'pt-bubble-pill',
                      'aria-pressed':curPreset==='custom',
                      'data-testid':'agy-bubble-preset-custom',
                      'data-pt-tip':text('自定义颜色','Custom color')
                    },
                      h('span',{className:'pt-bubble-dot',style:{'--pt-dot':curPreset==='custom'?curColor:'conic-gradient(from 180deg,#52647A,#2F6FB8,#3D7A64,#9A6B3C,#6F5A8E,#52647A)'}}),
                      h('span',null,text('自定义','Custom')),
                      h('input',{
                        type:'color',value:curColor,'aria-label':text('自定义颜色','Custom color'),
                        'data-testid':'agy-bubble-color-input',
                        onChange:e=>{const next=String(e.target.value||'').trim().toUpperCase();if(/^#[0-9A-F]{6}$/.test(next))void env.change({userBubblePreset:'custom',userBubbleColor:next});}
                      })))),
                h('div',{className:'pt-bubble-strength-row','data-testid':'agy-setting-row-userBubbleStrength'},
                  h('span',{className:'pt-bubble-strength-label'},text('混合强度','Blend strength')),
                  h('input',{
                    type:'range',min:10,max:100,step:5,value:curStrength,
                    className:'pt-bubble-range',
                    'aria-label':text('混合强度','Blend strength'),
                    'data-testid':'agy-bubble-strength-slider',
                    style:{background:`linear-gradient(to right,var(--primary) ${rangePct}%,var(--secondary) ${rangePct}%)`},
                    onChange:e=>{const next=Number(e.target.value);if(Number.isInteger(next)&&next>=10&&next<=100)void env.change({userBubbleStrength:next});}
                  }),
                  h('span',{className:'pt-bubble-strength-val','data-testid':'agy-bubble-strength-value'},curStrength===100?text('100% 实色','100% Solid'):`${curStrength}%`)),
                h('div',{className:'pt-bubble-stage'},
                  h('span',{className:'pt-bubble-preview','data-testid':'agy-bubble-preview',style:{'--pt-preview-tint':activeTint,'--pt-preview-bg':`${curStrength}%`,'--pt-preview-border':`${Math.min(100,curStrength+16)}%`,...(previewFg?{'--pt-preview-fg':previewFg}:{})}},text('帮我检查一下这段实现有没有边界问题','Check if this implementation has any edge cases'))));
            })(),
            toggle('keepTurnOutline',text('始终显示会话目录','Always show conversation outline'),text('在多轮对话左侧常驻显示轮次快速跳转目录。','Keep the turn navigation rail visible in multi-turn chats.')),
            toggle('keepOverviewOpen',text('切换会话时保持概览','Keep Overview open when switching chats'),text('切换不同会话时保留右侧概览面板的展开状态。','Preserve the right Overview panel state across chats.')),
            h(UP,{label:text('项目默认显示会话数','Conversations per project'),description:text('控制侧栏每个项目默认展示的会话数量，超出部分收起至“查看全部”。','Number of conversations shown per project in the sidebar before collapsing into "See all".'),'data-testid':'agy-setting-row-sidebarProjectLimit',rightElement:h(Select,{value:options.sidebarProjectLimit,onChange:limit=>{void env.change({sidebarProjectLimit:Number(limit)});},label:text('项目默认显示会话数','Conversations per project'),testId:'agy-sidebar-project-limit',items:[[0,text('默认 (6)','Default (6)')],[1,text('1 条','1')],[2,text('2 条','2')],[3,text('3 条','3')],[4,text('4 条','4')],[5,text('5 条','5')],[10,text('10 条','10')],[-1,text('全部展开','Show all')]]})}),
            toggle('taskbarBadge',text('任务栏未读提醒','Taskbar unread badge'),text('后台对话完成时在窗口与任务栏标题前显示未读数字，切回查看后自动消除。','Show unread count in the window and taskbar title when background chats finish.')),
            (env.platform==='darwin'||(typeof navigator==='object'&&/Mac/i.test(navigator.platform||navigator.userAgent||'')))&&toggle('macAutoRelaunch',text('冷启动自动重启启用（macOS）','Auto-relaunch on cold start (macOS)'),text('默认开启。直接打开原版 Antigravity 时若未带调试端口，将自动带参数重启一次启用插件（内置防循环保护，无需创建第二个应用图标）；关闭后可在右侧「插件 -> Powertools」手动点击重启。','Enabled by default. Automatically relaunches Antigravity once with the debug flag on cold start (with loop protection and no duplicate app icon); turn off to relaunch manually from Plugins -> Powertools.')))),
          section(text('账号与切换','Accounts & switching'),h(TP,null,
            h(UP,{label:text('启用多账号切换','Enable multi-account switching'),description:text('默认关闭。开启后支持在侧栏与管理页保存、查看额度并切换多个 Google 账号（可能涉及 Google 风控或服务条款风险）。','Disabled by default. Allows managing and switching multiple Google accounts via local OS keyring (may carry Google ToS/risk-control risks).'),descriptionId:'agy-setting-description-multiAccount','data-testid':'agy-setting-row-multiAccount',rightElement:h(XP,{checked:!!options.multiAccount,onCheckedChange:value=>{if(value){setRiskOpen(true);}else{void env.change({multiAccount:false});}},'aria-label':text('启用多账号切换','Enable multi-account switching'),'aria-describedby':'agy-setting-description-multiAccount','data-testid':'agy-setting-multiAccount'})}),
            options.multiAccount&&toggle('accountSwitcher',text('侧栏账号切换器','Sidebar account switcher'),text('在左侧边栏底部整合账号快捷切换与原生设置入口。','Integrate the quick account switcher and native Settings entry at the bottom of the left sidebar.')),
            options.multiAccount&&toggle('autoSwitchAccount',text('额度耗尽自动切换','Auto switch when quota runs out'),text('当当前账号 5 小时或周限额耗尽时，自动切换到剩余额度最充足的已启用账号并重启生效。','Automatically switch to the best enabled account and relaunch when the active account quota runs out.')),
            options.multiAccount&&h(UP,{label:text('账号管理默认视图','Default account view'),description:text('设置「账号与额度」页面默认使用列表或卡片展示已保存账号。','Choose whether the Accounts & Quota page defaults to List or Card view.'),'data-testid':'agy-setting-row-accountViewMode',rightElement:h(Select,{value:options.accountViewMode,onChange:accountViewMode=>{void env.change({accountViewMode});},label:text('账号管理默认视图','Default account view'),testId:'agy-account-view-mode',items:[['list',text('列表视图','List view')],['card',text('卡片视图','Card view')]]})}),
            options.multiAccount&&h(UP,{label:text('默认展示额度周期','Default quota window'),description:text('控制主页侧栏账号切换浮窗与列表视图展示 5 小时限额或周限额。','Choose whether the sidebar account switcher and list view display 5-hour or weekly quota.'),'data-testid':'agy-setting-row-accountQuotaWindow',rightElement:h(Select,{value:options.accountQuotaWindow,onChange:accountQuotaWindow=>{void env.change({accountQuotaWindow});},label:text('默认展示额度周期','Default quota window'),testId:'agy-account-quota-window',items:[['5h',text('5 小时限额','5-hour limit')],['weekly',text('周限额','Weekly limit')]]})}))),
          section(text('统计与进度','Telemetry & progress'),h(TP,null,
            h(UP,{label:text('概览默认时间范围','Default Overview range'),description:text('设置 Powertools 概览页默认展示的统计时间范围。','Choose the default time range displayed on the Powertools Overview tab.'),'data-testid':'agy-setting-row-overviewRange',rightElement:h(Select,{value:options.overviewRange||'weeklyQuota',onChange:overviewRange=>{void env.change({overviewRange});},label:text('概览默认时间范围','Default Overview range'),testId:'agy-overview-range',items:overviewRangeItems(false)})}),
            h(UP,{label:text('费用估算口径','Cost estimation basis'),description:text('选择概览、请求与额度估值采用的公开 API 单价基准；Google One 订阅按配额计费，推荐按正式标准价估算，API 限时首发优惠仅适用于 API / Cloud 付费账单。','Choose the public API rate basis for cost and quota estimates. Standard list rates are recommended for Google One subscriptions; introductory promos apply to paid API/Cloud billing only.'),'data-testid':'agy-setting-row-pricingMode',rightElement:h(Select,{value:options.pricingMode||'standard',onChange:pricingMode=>{void env.change({pricingMode});},label:text('费用估算口径','Cost estimation basis'),testId:'agy-pricing-mode-select',items:[['standard',text('正式标准价（推荐）','Standard list (recommended)')],['promo',text('含 API 首发优惠','Include API promos')]]})}),
            toggle('contextRing','上下文圆环',text('在输入框模型选择器旁显示上下文占用圆环与拆解浮窗。','Show the context usage ring and breakdown popover in the composer.')),
            toggle('speedStats',text('速度与统计','Speed & statistics'),text('在输入框旁显示生成速度码表，点击查看会话统计详情。','Show the generation speed dial in the composer and click for session telemetry.')),
            toggle('progress','任务进度',text('在右侧概览面板展示任务清单、实时阶段与执行轨迹。','Show checklist progress, live phase, and activity trail in Overview.')),
            toggle('overviewQuota',text('概览显示账号额度','Show quota in Overview'),text('默认关闭。开启后在右侧概览面板底部显示当前账号各模型组的 5 小时与周剩余额度。','Disabled by default. Shows active account 5-hour and weekly remaining quota in the Overview panel.')),
            toggle('titlebarQuickPanel',text('标题栏快捷概览','Titlebar quick overview'),text('默认关闭。开启后在窗口右上角标题栏显示 Powertools 快捷入口，无需离开当前会话即可弹出查看与管理面板。','Disabled by default. Shows a Powertools trigger in the top-right titlebar to open the dashboard and settings without leaving your chat.')),
            options.titlebarQuickPanel&&quickBadgeMuted&&h(UP,{label:text('快捷入口状态圆点提醒','Titlebar status dot alerts'),description:text('已设为不再提醒，低额度或代理待重启时不再显示圆点与浮卡提示。','Muted. Status dot and first-time alert callout are hidden for low quota or pending proxy.'),'data-testid':'agy-setting-row-quickBadgeMuted',rightElement:h(Uy,{variant:'secondary',size:'sm',type:'button','data-testid':'agy-quick-badge-unmute',onClick:()=>{setQuickBadgeMuted(false);setQuickBadgeAck('');}},text('恢复提醒','Restore alerts'))}),
            toggle('composerQuotaHalo',text('输入框额度光环','Composer quota halo'),text('默认关闭。开启后沿输入框外框绘制当前所选模型的剩余额度光环，随消耗从左上角顺时针推进（>=50% 青绿、20%-49% 琥珀、<20% 红色）。','Disabled by default. Draws a perimeter quota halo around the composer for the active model, draining clockwise from the top-left (emerald >=50%, amber 20-49%, red <20%).')),
            options.composerQuotaHalo&&h(UP,{label:text('光环额度周期','Quota halo window'),description:text('选择输入框光环追踪的额度周期；自动模式取 5 小时与周限额中较低一项。','Choose which quota window the composer halo tracks; Auto uses the lower of 5-hour and weekly limits.'),'data-testid':'agy-setting-row-composerQuotaHaloWindow',rightElement:h(Select,{value:options.composerQuotaHaloWindow||'auto',onChange:composerQuotaHaloWindow=>{void env.change({composerQuotaHaloWindow});},label:text('光环额度周期','Quota halo window'),testId:'agy-composer-halo-window',items:[['auto',text('自动（较低项）','Auto (lower)')],['weekly',text('周限额','Weekly limit')],['5h',text('5 小时限额','5-hour limit')]]})}),
            toggle('composerWorkingBeam',text('工作时输入框流光','Working composer border beam'),text('默认关闭。开启后在 Agent 工作时沿输入框边框平滑旋转流光光环，空闲时淡出零占用；与额度光环同时开启时自动无缝切换。','Disabled by default. Animates a smooth border beam around the composer while the agent is working and fades out idle with zero cost; transitions cleanly with the quota halo.')),
            options.composerWorkingBeam&&(()=>{
              const beamPalettes=[
                ['gemini',text('Gemini','Gemini'),'conic-gradient(from 30deg,#4285F4,#9B72CB,#EB4335,#FA8C33,#FABC05,#34A853,#4285F4)'],
                ['aurora',text('极光','Aurora'),'conic-gradient(from 30deg,#29E09E,#26BDFA,#7561FA,#DB70FA,#29E09E)'],
                ['colorful',text('炫彩','Colorful'),'conic-gradient(from 30deg,#33D170,#2E94F2,#AD57F2,#FA57A3,#FA9E38,#33D170)'],
                ['neon',text('霓虹','Neon'),'conic-gradient(from 30deg,#00D6FA,#4766FF,#D133FA,#FA3394,#00D6FA)'],
                ['accent',text('主题色','Accent'),'var(--primary)'],
                ['quota',text('额度色','Quota'),'linear-gradient(135deg,#10B981,#F59E0B,#EF4444)']
              ];
              const curBeam=options.composerWorkingBeamPalette||'gemini';
              const previewing=Boolean(env.beamPreview?.());
              return h('div',{className:'pt-bubble-panel','data-testid':'agy-setting-row-composerWorkingBeamPalette'},
                h('div',{className:'pt-bubble-head'},
                  h('div',{className:'pt-bubble-meta'},
                    h('div',{className:'pt-bubble-title'},text('流光配色','Beam palette')),
                    h('div',{className:'pt-muted'},text('选择 Agent 工作时输入框流光光环的色板。','Choose the color palette for the working composer border beam.'))),
                  h('div',{className:'pt-bubble-controls',role:'group','aria-label':text('流光配色','Beam palette')},
                    ...beamPalettes.map(([key,label,bg])=>h('button',{
                      key,type:'button',className:'pt-bubble-pill',
                      'aria-pressed':curBeam===key,
                      'data-testid':`agy-beam-palette-${key}`,
                      onClick:()=>{void env.change({composerWorkingBeamPalette:key});}
                    },h('span',{className:'pt-beam-dot',style:{background:bg},'aria-hidden':true}),label)))),
                h('div',{className:'pt-beam-preview-row','data-testid':'agy-setting-row-composerWorkingBeamPreview'},
                  h('div',{className:'pt-bubble-meta'},
                    h('div',{className:'pt-bubble-title'},text('试用预览','Live preview')),
                    h('div',{className:'pt-muted'},previewing
                      ?text('预览中：当前所有对话输入框均强制旋转流光，切回对话即可查看，看完点击「停止预览」恢复。','Preview active: every chat composer is showing the beam. Switch to any chat to view, then click Stop preview.')
                      :text('开启后无论是否正在工作，所有对话输入框都会强制显示流光，方便直接切回对话看效果与挑色板。','Force-show the beam on every chat composer while idle so you can preview palettes immediately.'))),
                  h(Uy,{
                    variant:previewing?'primary':'secondary',
                    size:'sm',
                    type:'button',
                    className:'pt-about-btn',
                    'aria-pressed':previewing,
                    'data-testid':'agy-beam-preview-toggle',
                    onClick:()=>{env.setBeamPreview?.(!previewing);}
                  },icon(previewing?'stop':'play_arrow',14,{'aria-hidden':true}),h('span',null,previewing?text('停止预览','Stop preview'):text('试用预览','Try preview')))));
            })(),
            toggle('subagentTelemetry',text('子智能体上下文与统计','Subagent context & telemetry'),text('在右侧概览的子智能体列表以及上下文、速度浮窗中展示各子智能体的模型、上下文占用、Token 与费用。','Show per-subagent model, context usage, tokens, and cost in Overview subagent rows and composer popovers.')),
            toggle('timing','每轮用时',text('在每轮已完成的回复顶部展示总耗时。','Display completion duration at the top of each finished turn.')),
            toggle('toolDetails','点击用时展开工具',text('点击每轮用时标签展开或收起工具调用详情。','Click the turn duration label to expand or collapse tool details.')))),
          section(text('会话增强','Conversation enhancements'),h(TP,null,
            toggle('stageUpdates',text('阶段汇报','Stage updates'),text('类 Codex，Agent 在工作时会实时汇报当前进度。','Codex-style live progress updates while the agent is working.')),
            toggle('efficientIO',text('并行检索与读取','Parallel search & read'),text('引导 Agent 在同一轮合并搜索与读取相关文件，减少来回调用轮次、加快响应速度。','Guide the agent to batch file searches and reads in one turn to reduce round trips.')),
            toggle('sessionSearch',text('原生搜索支持全文检索','Full-text search in native picker'),text('在顶部原生放大镜（会话搜索）中输入关键词时，同步检索历史对话正文、代码块与终端命令，点击直达对应轮次。','Extends the native conversation search picker to also search historical message bodies, code blocks, and terminal commands, jumping directly to the matched turn.')),
            toggle('responseBranch',text('分支会话功能','Conversation branching'),text('提供 Antigravity 默认未开启的分支会话功能。','Enable Antigravity\'s native conversation branching from menus and replies.')),
            toggle('messageEdit',text('消息编辑功能','Message editing'),text('提供 Antigravity 默认未提供的消息编辑功能，在原消息位置打开原生输入框，修改并重新生成回答。','Enable native message editing: open the native composer in place to revise a sent message and regenerate.')),
            toggle('fileContextMenu',text('文件右键菜单','File context menu'),text('右键消息中的文件链接或右侧文件树，支持按本机已安装应用选择打开方式（含行号跳转）、引用到输入框、打开所在文件夹、复制文件或复制路径。','Right-click file links in messages or the Files tree to open with installed local apps (with line jump), attach to chat, show in folder, copy the file, or copy its path.')),
            toggle('sshCommandPaste',text('识别粘贴的 SSH 命令','Recognize pasted SSH commands'),text('在「新建项目 -> SSH Host」框内粘贴 ssh -p 端口 用户@主机 时自动提取并填入地址（自动忽略附带密码，仍由原生弹窗认证）。','Automatically extract user@host:port when pasting ssh -p PORT user@host into the SSH Host input (discards any appended password).')))),
          h(NetworkProxySection,{options,toggle}),
          section(text('上下文（实验性）','Context (Experimental)'),h(TP,null,h(UP,{label:text('上下文目标','Context target'),description:text('选择“默认”时不改动客户端原生配置；其余档位从下次请求起生效。','Default leaves native client settings untouched; other targets apply on the next request.'),'data-testid':'agy-setting-row-contextLimit',rightElement:h(Select,{value:options.contextLimit,onChange:limit=>{void env.change({contextLimit:Number(limit)});},label:text('上下文目标','Context target'),testId:'agy-context-limit',items:[[0,text('默认','Default')],[256000,'256K'],[500000,'500K'],[1000000,'1M']]})}),h(UP,{label:t('实际记录上限'),'data-testid':'agy-setting-row-actualMaxTokens',rightElement:h('span',{className:'tabular-nums'},n(env.state()?.contextWindow.maxTokens))}))),
          h('div',{className:'flex justify-end'},button('恢复默认设置',()=>{void env.change(env.defaults);}))),
        h(About),
        h(MultiAccountRiskModal,{open:riskOpen,onConfirm:()=>{setRiskOpen(false);void env.change({multiAccount:true});},onCancel:()=>setRiskOpen(false)}));
    }
    function Page(){
      const rev=useData();const opts=env.options(),enabled=opts.enabled,[tab,setTab]=R.useState(()=>env.consumeRequestedTab?.()||'overview'),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
      R.useEffect(()=>{const next=env.consumeRequestedTab?.();if(next)setTab(next);},[rev]);
      const load=async(force=false)=>{if(!enabled)return;setBusy(true);try{await env.loadDashboard(force);setError('');}catch(e){setError(e.message);}finally{setBusy(false);}};
      R.useEffect(()=>{if(!enabled)return;void load();const timer=setInterval(()=>{void load();},15000);return()=>clearInterval(timer);},[enabled]);
      const dashboard=env.dashboard();
      return h('div',{className:'pt-page','data-agy-management-page':'','data-testid':'agy-management-page'},h('div',{className:'pt-content'},
        h('header',{className:'pt-header'},h('h1',null,'Powertools'),enabled&&h('div',{className:'pt-toolbar'},
          h(Tabs,{value:tab,onChange:setTab,testId:'agy-page-tabs',items:[['overview','概览'],['requests','请求事件'],['errors','错误事件'],['quota',opts.multiAccount?text('账号与额度','Accounts & Quota'):'额度'],['pricing','价格'],['settings','设置']]}),
          h(Refresh,{onClick:()=>{void load(true);},busy,testId:'agy-refresh-dashboard'}))),
        enabled&&error&&h('div',{role:'alert',className:'pt-alert text-error text-sm'},error),
        h('div',{className:'pt-body','data-wide':enabled&&(tab==='requests'||tab==='errors')?tab:undefined},
          !enabled?h(Settings):tab==='overview'?h(Overview,{dashboard}):tab==='requests'?h(EventTable,{key:'requests',dashboard}):tab==='errors'?h(EventTable,{key:'errors',dashboard,errors:true}):tab==='quota'?h(Quotas):tab==='pricing'?h(Pricing,{dashboard}):h(Settings))));
    }
    function QuickPopover(){
      useData();
      useQuickBadgePrefs();
      const opts=env.options?.()||{};
      const [open,setOpen]=R.useState(false);
      const [tab,setTab]=R.useState('overview');
      const [refreshing,setRefreshing]=R.useState(false);
      const [loadMeta]=R.useState(()=>({at:0}));
      const [anchorBox]=R.useState(()=>({el:null}));
      const [calloutPos,setCalloutPos]=R.useState(null);
      const [exitingAlert,setExitingAlert]=R.useState('');
      const [exitTimerBox]=R.useState(()=>({id:0,kind:''}));
      const triggerTipId=R.useId();
      R.useEffect(()=>()=>{if(exitTimerBox.id){clearTimeout(exitTimerBox.id);exitTimerBox.id=0;}},[]);
      R.useEffect(()=>{
        if(!open)return;
        const timer=setInterval(()=>{
          loadMeta.at=Date.now();
          void Promise.resolve(env.loadDashboard?.(false)).catch(()=>{});
          void Promise.resolve(env.loadProxyStatus?.()).catch(()=>{});
        },15000);
        return()=>clearInterval(timer);
      },[open]);
      const triggerLabel=text('Powertools 快捷概览','Powertools quick overview');
      const H=helpers();
      const readFrac=b=>{const raw=b?.remaining?.case==='remainingFraction'?b.remaining.value:b?.remainingFraction;return typeof raw==='number'&&Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):null;};
      const groupShort=g=>H?.quotaGroupMeta?.(g)?.compactName||(/argon/i.test(g?.displayName||'')?'Argon':/claude|gpt/i.test(g?.displayName||'')?'Claude/GPT':/gemini/i.test(g?.displayName||'')?'Gemini':(g?.displayName||'-'));
      const store=env.accounts?.();
      const accounts=store?.accounts||[];
      const activeAcct=accounts.find(a=>a.id===store?.activeId)||accounts[0]||null;
      const liveGroups=env.account?.()?.groups||[];
      const quotaGroups=liveGroups.length?liveGroups:(activeAcct?.groups||[]);
      let minQuotaPct=null;
      const lowQuotaItems=[];
      const alertParts=[];
      for(const group of quotaGroups){
        const gLabel=groupShort(group);
        const gKey=H?.quotaGroupMeta?.(group)?.key||gLabel.toLowerCase();
        for(const b of group?.buckets||[]){
          if(b?.disabled)continue;
          const frac=readFrac(b);
          if(frac!=null){
            const pct=Math.round(frac*100);
            if(minQuotaPct==null||pct<minQuotaPct)minQuotaPct=pct;
            if(pct<25){
              const isWeekly=b?.window==='weekly'||/weekly/i.test(b?.bucketId||'');
              const winLbl=isWeekly?text('周','Weekly'):'5h';
              const tier=pct<10?'critical':'warning';
              lowQuotaItems.push({pct,text:`${gLabel} ${winLbl} ${pct}%`});
              alertParts.push(`${gKey}:${isWeekly?'weekly':'5h'}:${tier}`);
            }
          }
        }
      }
      lowQuotaItems.sort((a,b)=>a.pct-b.pct);
      const ps=env.proxyStatus?.()||null;
      const proxyPending=Boolean(ps?.mismatch||(ps&&ps.reason&&ps.reason!=='active'&&ps.reason!=='disabled'));
      if(proxyPending)alertParts.push(`proxy:${ps?.reason||'pending'}`);
      const upd=env.updateNotice?.()||null;
      const updateReady=Boolean(upd?.status==='available'&&upd.version&&upd.version!==upd.dismissedVersion);
      const alertTone=(minQuotaPct!=null&&minQuotaPct<10)?'critical':((minQuotaPct!=null&&minQuotaPct<25)||proxyPending)?'warning':'';
      const triggerBadgeTone=alertTone||(updateReady?'info':'');
      const acctScope=activeAcct?.id||String(env.capabilities?.()?.email||'').trim().toLowerCase()||'active';
      const alertKey=alertParts.length?`${acctScope}|${[...new Set(alertParts)].sort().join('|')}`:'';
      R.useEffect(()=>{if(!alertKey&&quickBadgeAck)setQuickBadgeAck('');},[alertKey]);
      const badgeSuppressed=quickBadgeMuted||Boolean(alertKey&&quickBadgeAck===alertKey);
      const showBadgeDot=Boolean(opts.enabled&&opts.titlebarQuickPanel&&((alertTone&&!badgeSuppressed)||(updateReady&&!quickBadgeMuted)));
      const showAlertCallout=Boolean(opts.enabled&&opts.titlebarQuickPanel&&alertTone&&!badgeSuppressed&&!open);
      const usePositionEffect=typeof R.useLayoutEffect==='function'?R.useLayoutEffect:R.useEffect;
      usePositionEffect(()=>{
        if(!showAlertCallout){setCalloutPos(null);return;}
        let ro=null;
        let observedAnchor=null;
        let observedBar=null;
        let settleRaf1=0;
        let settleRaf2=0;
        function bindObservers(){
          if(typeof globalThis.ResizeObserver!=='function')return;
          const el=anchorBox.el;
          const bar=el?.closest?.('[class*="justify-between"]')||el?.closest?.('[data-testid="pane-titlebar-toolbar"]')||el?.parentElement?.parentElement||null;
          if(ro&&el===observedAnchor&&bar===observedBar)return;
          ro?.disconnect?.();
          ro=new globalThis.ResizeObserver(measure);
          observedAnchor=el;
          observedBar=bar;
          if(el)ro.observe(el);
          if(bar&&bar!==el)ro.observe(bar);
          if(document?.body)ro.observe(document.body);
        }
        function measure(){
          bindObservers();
          const el=anchorBox.el;
          if(!el||el.isConnected===false)return;
          const rect=el.getBoundingClientRect?.();
          if(!rect||(!rect.width&&!rect.height))return;
          const vw=globalThis.innerWidth||1280;
          const cardW=Math.min(276,Math.max(180,vw-24));
          const toolbarEl=el.closest?.('[data-testid="pane-titlebar-toolbar"]')||null;
          let groupRight=rect.right;
          if(toolbarEl&&typeof toolbarEl.querySelectorAll==='function'){
            for(const b of toolbarEl.querySelectorAll('button')){
              const br=b?.getBoundingClientRect?.();
              if(br&&br.width>0&&br.right>groupRight&&br.right-rect.left<360)groupRight=br.right;
            }
          }else{
            const groupEl=el.parentElement?.parentElement||el.parentElement;
            const groupRect=groupEl?.getBoundingClientRect?.();
            if(groupRect&&groupRect.width>0&&groupRect.width<320&&groupRect.right>groupRight)groupRight=groupRect.right;
          }
          const cardRight=Math.min(vw-12,Math.max(rect.right,groupRight));
          const right=Math.max(12,Math.round(vw-cardRight));
          const btnCenter=rect.left+rect.width/2;
          const caretRight=Math.max(16,Math.min(cardW-16,Math.round(cardRight-btnCenter)));
          const top=Math.round(rect.bottom+10);
          setCalloutPos(prev=>prev&&prev.top===top&&prev.right===right&&prev.caretRight===caretRight?prev:{top,right,caretRight,settled:Boolean(prev?.settled)});
        }
        measure();
        const rafId=typeof globalThis.requestAnimationFrame==='function'?globalThis.requestAnimationFrame(measure):0;
        if(typeof globalThis.requestAnimationFrame==='function'){
          settleRaf1=globalThis.requestAnimationFrame(()=>{
            settleRaf2=globalThis.requestAnimationFrame(()=>{
              setCalloutPos(prev=>prev&&!prev.settled?{...prev,settled:true}:prev);
            });
          });
        }
        const timerId=setTimeout(measure,180);
        timerId?.unref?.();
        const pollId=typeof globalThis.window?.addEventListener==='function'?setInterval(measure,250):0;
        pollId?.unref?.();
        globalThis.window?.addEventListener?.('resize',measure);
        return()=>{
          if(rafId&&typeof globalThis.cancelAnimationFrame==='function')globalThis.cancelAnimationFrame(rafId);
          if(settleRaf1&&typeof globalThis.cancelAnimationFrame==='function')globalThis.cancelAnimationFrame(settleRaf1);
          if(settleRaf2&&typeof globalThis.cancelAnimationFrame==='function')globalThis.cancelAnimationFrame(settleRaf2);
          clearTimeout(timerId);
          if(pollId)clearInterval(pollId);
          ro?.disconnect?.();
          globalThis.window?.removeEventListener?.('resize',measure);
        };
      },[showAlertCallout]);
      if(!opts.enabled||!opts.titlebarQuickPanel)return null;
      const badgeReasons=[];
      for(const item of lowQuotaItems){
        const tone=item.pct<10?'critical':'warning';
        const prefix=item.pct<10?text('额度告急：','Critical quota: '):text('低额度：','Low quota: ');
        badgeReasons.push({tone,text:`${prefix}${item.text}`});
      }
      if(proxyPending){
        const proxyReason=ps?.reason==='needs-disable'
          ?text('独立代理已关闭，需重启恢复直连','Proxy disabled, relaunch to restore direct')
          :ps?.reason==='config-changed'
            ?text('独立代理配置已修改，需重启生效','Proxy config changed, relaunch to apply')
            :text('独立代理待重启生效','Proxy pending relaunch');
        badgeReasons.push({tone:'warning',text:proxyReason});
      }
      if(updateReady){
        badgeReasons.push({tone:'info',text:text(`发现新版本 v${upd.version}`,`Update v${upd.version} available`)});
      }
      const triggerAriaLabel=badgeReasons.length
        ?(opts.language==='en'?`${triggerLabel} (${badgeReasons.map(r=>r.text).join('; ')})`:`${triggerLabel}（${badgeReasons.map(r=>r.text).join(text('；','; '))}）`)
        :triggerLabel;
      const triggerTooltipContent=badgeReasons.length
        ?h('div',{className:'pt-qp-tip','data-testid':'agy-quick-trigger-tooltip'},
          h('div',{className:'pt-qp-tip-title'},triggerLabel),
          ...badgeReasons.map((r,idx)=>h('div',{key:idx,className:'pt-qp-tip-row','data-tone':r.tone},
            h('span',{className:'pt-qp-tip-dot','data-tone':r.tone,'aria-hidden':true}),
            h('span',null,r.text))))
        :triggerLabel;
      const commitDismiss=kind=>{
        setExitingAlert('');
        if(kind==='mute')setQuickBadgeMuted(true);
        else setQuickBadgeAck(alertKey);
      };
      const flushExit=()=>{
        if(!exitTimerBox.id)return;
        clearTimeout(exitTimerBox.id);
        exitTimerBox.id=0;
        const pendingKind=exitTimerBox.kind;
        exitTimerBox.kind='';
        if(pendingKind)commitDismiss(pendingKind);
      };
      const dismissAlert=kind=>{
        if(exitingAlert)return;
        const reduced=typeof globalThis.window?.matchMedia==='function'&&globalThis.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(!reduced&&anchorBox.el?.isConnected&&typeof globalThis.requestAnimationFrame==='function'){
          setExitingAlert(kind);
          exitTimerBox.kind=kind;
          exitTimerBox.id=setTimeout(()=>{
            exitTimerBox.id=0;
            exitTimerBox.kind='';
            commitDismiss(kind);
          },150);
          exitTimerBox.id?.unref?.();
        }else{
          commitDismiss(kind);
        }
      };
      const handleOpenChange=(next,details)=>{
        if(!next){
          const target=details?.event?.target;
          const insideMenu=Boolean(target?.closest?.('[role="menu"],[role="menuitem"],[role="menuitemradio"],[role="listbox"],[role="option"]'));
          const hasNestedOverlay=activeModalCount>0||insideMenu||Boolean(typeof document?.querySelector==='function'&&document.querySelector('[data-testid="agy-account-switch-dialog"],[data-testid="agy-add-account-dialog"],[data-testid="agy-multi-account-risk-dialog"],[data-testid="agy-date-range-popup"]'));
          if(hasNestedOverlay){details?.cancel?.();return;}
        }
        if(next&&exitTimerBox.id)flushExit();
        setOpen(next);
        if(next){
          const nowMs=Date.now();
          if(!env.dashboard?.()||nowMs-loadMeta.at>30000){
            loadMeta.at=nowMs;
            void Promise.resolve(env.loadDashboard?.(false)).catch(()=>{});
          }
          if(opts.multiAccount&&!env.accounts?.())void Promise.resolve(env.loadAccounts?.()).catch(()=>{});
          void Promise.resolve(env.loadProxyStatus?.()).catch(()=>{});
        }
      };
      const doRefresh=async()=>{
        if(refreshing)return;
        setRefreshing(true);
        loadMeta.at=Date.now();
        try{
          await Promise.all([
            Promise.resolve(env.loadDashboard?.(true)).catch(()=>{}),
            opts.multiAccount?Promise.resolve(env.loadAccounts?.()).catch(()=>{}):Promise.resolve(),
            Promise.resolve(env.loadProxyStatus?.()).catch(()=>{})
          ]);
        }finally{setRefreshing(false);}
      };
      const openFull=()=>{setOpen(false);env.openManagementTab?.(tab);};
      const tabItems=[
        ['overview',text('概览','Overview')],
        ['requests',text('请求事件','Requests')],
        ['errors',text('错误事件','Errors')],
        ['quota',opts.multiAccount?text('账号与额度','Accounts & Quota'):text('额度','Quota')],
        ['pricing',text('价格','Pricing')],
        ['settings',text('设置','Settings')]
      ];
      const renderContent=()=>{
        const dashboard=env.dashboard?.()||null;
        const body=tab==='overview'?h(Overview,{dashboard})
          :tab==='requests'?h(EventTable,{key:'qp-requests',dashboard})
          :tab==='errors'?h(EventTable,{key:'qp-errors',dashboard,errors:true})
          :tab==='quota'?h(Quotas)
          :tab==='pricing'?h(Pricing,{dashboard})
          :h(Settings);
        return h('div',{className:'pt-qp'},
          h('div',{className:'pt-qp-head'},
            h('div',{className:'pt-qp-brand'},
              icon('tune',16,{style:{flexShrink:0,color:'var(--primary)'}}),
              h('span',{className:'pt-qp-title'},'Powertools')),
            h('nav',{className:'pt-qp-tabs','aria-label':triggerLabel,'data-testid':'agy-quick-tabs'},
              ...tabItems.map(([key,label])=>h('button',{
                key,type:'button',className:'pt-qp-tab','aria-current':tab===key?'page':undefined,'data-testid':`agy-quick-tab-${key}`,
                onClick:()=>setTab(key),
                onKeyDown:event=>{
                  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
                  event.preventDefault();
                  const index=tabItems.findIndex(([id])=>id===tab);
                  const next=event.key==='Home'?0:event.key==='End'?tabItems.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabItems.length)%tabItems.length;
                  setTab(tabItems[next][0]);
                  event.currentTarget.parentElement?.children?.[next]?.focus?.();
                }
              },label))),
            h('div',{className:'pt-qp-actions'},
              h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7 rounded-md',disabled:refreshing,tooltip:t('刷新数据'),'aria-label':t('刷新数据'),'data-testid':'agy-quick-refresh',onClick:()=>{void doRefresh();}},
                icon('refresh',15,{className:refreshing?'animate-spin':''})),
              h(Uy,{variant:'ghost',size:'icon',type:'button',className:'h-7 w-7 rounded-md',tooltip:text('打开完整页','Open full page'),'aria-label':text('打开完整页','Open full page'),'data-testid':'agy-quick-open-full',onClick:openFull},
                icon('open_in_new',14)))),
          h('div',{className:'pt-qp-scroll','data-testid':'agy-quick-body'},body));
      };
      const triggerButton=h(Uy,{
        variant:'ghost',size:'icon',type:'button',className:'h-7 w-7 rounded-lg pt-qp-trigger',
        'data-tooltip-id':triggerTipId,'aria-label':triggerAriaLabel,'aria-expanded':open,
        'data-testid':'agy-titlebar-quick-trigger',
        onClick:typeof HC==='function'?undefined:()=>handleOpenChange(!open)
      },icon('tune',16),showBadgeDot&&h('span',{className:'pt-qp-trigger-dot','data-tone':triggerBadgeTone,'data-state':exitingAlert?'exiting':undefined,'data-testid':'agy-quick-trigger-badge','aria-hidden':true}));
      const alertCalloutNode=showAlertCallout&&h('div',{
        role:'status',
        className:'pt-qp-alert-callout',
        'data-tone':triggerBadgeTone,
        'data-state':exitingAlert?'exiting':'open',
        'data-ready':calloutPos?.settled?'true':undefined,
        'data-testid':'agy-quick-alert-callout',
        style:{top:calloutPos?.top??72,right:calloutPos?.right??12,'--pt-caret-r':`${calloutPos?.caretRight??24}px`}
      },
        calloutPos?.caretRight!=null&&h('span',{className:'pt-qp-alert-caret','aria-hidden':true,style:{right:calloutPos.caretRight}}),
        h('div',{className:'pt-qp-alert-head'},
          h('span',{className:'pt-qp-tip-dot','data-tone':triggerBadgeTone,'aria-hidden':true}),
          h('span',null,text('Powertools 状态提醒','Powertools status alert'))),
        h('div',{className:'pt-qp-alert-list'},
          ...badgeReasons.map((r,idx)=>h('div',{key:idx,className:'pt-qp-tip-row','data-tone':r.tone,style:{'--pt-i':idx}},
            h('span',{className:'pt-qp-tip-dot','data-tone':r.tone,'aria-hidden':true}),
            h('span',null,r.text)))),
        h('div',{className:'pt-qp-alert-actions'},
          h(Uy,{variant:'ghost',size:'sm',type:'button',disabled:Boolean(exitingAlert),'data-testid':'agy-quick-alert-mute',onClick:()=>{dismissAlert('mute');}},text('不再提醒','Don\'t remind')),
          h(Uy,{variant:'secondary',size:'sm',type:'button',disabled:Boolean(exitingAlert),'data-testid':'agy-quick-alert-ack',onClick:()=>{dismissAlert('ack');}},text('我知道了','Got it'))));
      const alertCallout=alertCalloutNode&&(typeof globalThis.ReactDOM?.createPortal==='function'&&document?.body?globalThis.ReactDOM.createPortal(alertCalloutNode,document.body):alertCalloutNode);
      return h('span',{ref:el=>{anchorBox.el=el;},style:{position:'relative',display:'inline-flex',alignItems:'center'}},
        typeof HC==='function'
          ?h(HC,{open,onOpenChange:handleOpenChange,placement:'bottom-end',disableMobileSheet:true},
            h(IC,{asChild:true},triggerButton),
            h(JC,{className:'pt-qp-pop','data-testid':'agy-quick-popover','aria-label':triggerLabel,role:'dialog'},open?renderContent():null))
          :h('div',{style:{position:'relative',display:'inline-flex',alignItems:'center'}},
            triggerButton,
            open&&h('div',{className:'pt-qp-pop','data-testid':'agy-quick-popover',role:'dialog','aria-label':triggerLabel,style:{position:'absolute',top:'100%',right:0,marginTop:6,zIndex:50,border:'1px solid var(--border)',borderRadius:12,background:'var(--card)',boxShadow:'0 10px 28px rgba(0,0,0,.18)'}},renderContent())),
        alertCallout,
        h(Sy,{id:triggerTipId,place:'bottom'},triggerTooltipContent));
    }
    function Sidebar(){
      useData();
      const opts=env.options?.()||{};
      const upd=env.updateNotice?.()||null;
      const hasUpdate=Boolean(opts.enabled!==false&&upd?.status==='available'&&upd.version&&upd.version!==upd.dismissedVersion);
      const jumpToUpdate=event=>{
        event.preventDefault?.();
        event.stopPropagation?.();
        if(typeof env.openUpdateSettings==='function')env.openUpdateSettings();
        else env.openManagementTab?.('settings');
      };
      return h('a',{href:'/powertools','data-testid':'agy-management-trigger','aria-current':location.pathname==='/powertools'?'page':undefined,className:`flex w-full items-center justify-start h-8 min-w-0 gap-1.5 px-2 py-1 rounded-lg text-secondary-foreground hover:bg-sidebar-muted ${location.pathname==='/powertools'?'bg-sidebar-muted text-foreground':''}`,onClick:event=>{if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0){event.preventDefault();void env.adapter.router().navigate({to:'/powertools'});}}},icon('tune'),h('span',{className:'truncate'},'Powertools'),hasUpdate&&h('span',{role:'button',tabIndex:0,className:'pt-sidebar-update-pill','data-testid':'agy-sidebar-update-badge','data-pt-tip':text(`发现新版本 v${upd.version}，点击前往更新`,`Update v${upd.version} available. Click to open updates.`),onClick:jumpToUpdate,onKeyDown:event=>{if(event.key==='Enter'||event.key===' ')jumpToUpdate(event);}},text('新版','New')));
    }
    return{Page,Overview,EventTable,Sidebar,AccountSwitcher,QuickPopover,Quotas,Pricing,Settings,Progress,ProgressOrb,resolveProgressOrbMode,OverviewQuota,Outline,About,dispose(){style.remove();}};
  };
})();
