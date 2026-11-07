const companies=[
["Adaro Andalan Indonesia","AD","Grup batu bara & energi","https://alamtri.com"],
["Kaltim Prima Coal","KPC","Produsen batu bara","https://www.kpc.co.id"],
["Bayan Resources","BY","Grup pertambangan batu bara","https://www.bayan.com.sg"],
["Bukit Asam","PTBA","BUMN pertambangan batu bara","https://www.ptba.co.id"],
["Kideco Jaya Agung","KJ","Produsen batu bara","https://www.kideco.co.id"],
["Golden Energy Mines","GEMS","Grup pertambangan batu bara","https://www.goldenenergymines.com"],
["Arutmin Indonesia","AI","Produsen batu bara","https://www.arutmin.com"],
["Berau Coal","BC","Produsen batu bara","https://www.beraucoalenergy.co.id"],
["Indominco Mandiri","IM","Produsen batu bara","https://www.itmg.co.id"],
["Baramulti Suksessarana","BSSR","Grup pertambangan batu bara","https://www.bssr.co.id"]
];
const contractors=[
["PAMA Persada Nusantara","PAMA","Kontraktor pertambangan","https://www.pamapersada.com"],
["Bukit Makmur Mandiri Utama (BUMA)","BUMA","Kontraktor pertambangan","https://www.deltadunia.com"],
["Cipta Kridatama","CK","Jasa pertambangan","https://www.ciptakridatama.co.id"],
["Darma Henwa","DEWA","Kontraktor pertambangan","https://www.ptdh.co.id"],
["Petrosea","PTRO","Jasa pertambangan & EPC","https://petrosea.com"],
["Saptaindra Sejati","SIS","Kontraktor pertambangan","https://www.saptaindra.co.id"],
["Thiess Indonesia","TH","Kontraktor pertambangan","https://thiess.co.id"],
["Berkat Anugerah Sejahtera","BAS","Jasa pertambangan","https://basprima.com"],
["Bina Sarana Sukses","BSS","Kontraktor pertambangan","https://binasaranasukses.co.id"],
["Karya Bhumi Lestari","KBL","Jasa pertambangan","https://karyabhumilestari.com"],
["Madhani Talatah Nusantara","MTN","Kontraktor pertambangan","https://www.madhani.co.id"],
["Putra Perkasa Abadi","PPA","Kontraktor pertambangan","https://ppa.co.id"],
["Ricobana Abadi","RA","Kontraktor pertambangan","https://ricobana.co.id"],
["Riung Mitra Lestari","RML","Kontraktor pertambangan","https://riungmitra.co.id"],
["Harmoni Panca Utama","HPU","Kontraktor pertambangan","https://hpu-mining.com"],
["Kalimantan Prima Persada","KPP","Jasa pertambangan","https://kppmining.com"],
["Satria Bahana Sarana","SBS","Kontraktor pertambangan","https://www.satriabahana.co.id"],
["Hasnur Riung Sinergi","HRS","Kontraktor pertambangan","https://hasnurriungsinergi.co.id"],
["Prima Sarana Gemilang","PSG","Kontraktor pertambangan","https://pt-psg.co.id"],
["Mandiri Karya Prima","MKP","Kontraktor pertambangan","https://mandiricontractor.co.id"]
];
function renderDirectory(id,data){const el=document.getElementById(id);if(!el)return;el.innerHTML=data.map(c=>`<a class="company-card" href="${c[3]}" target="_blank" rel="noopener noreferrer" aria-label="Buka situs resmi ${c[0]}"><span class="company-logo"><img src="https://www.google.com/s2/favicons?domain=${new URL(c[3]).hostname}&sz=128" alt="" onerror="this.remove();this.parentElement.textContent='${c[1]}'"></span><span><b>${c[0]}</b><small>${c[2]} ↗</small></span></a>`).join("")}
renderDirectory("companyGrid",companies);renderDirectory("contractorGrid",contractors);
document.getElementById("today").textContent=new Intl.DateTimeFormat("id-ID",{dateStyle:"full"}).format(new Date());
document.getElementById("year").textContent=new Date().getFullYear();
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("mainNav").classList.toggle("open"));
async function loadArticles(){const grid=document.getElementById("articleGrid");try{const r=await fetch("/api/articles");if(!r.ok)throw new Error();const items=await r.json();if(!items.length){grid.innerHTML='<div class="empty-state">Belum ada berita yang diterbitkan. Artikel pertama akan tampil di sini setelah admin mempublikasikannya.</div>';return}grid.innerHTML=items.map(a=>`<article class="article-card"><div class="article-image" style="${a.image_url?`background-image:url('${String(a.image_url).replace(/'/g,"%27")}')`:""}"></div><div class="article-body"><span class="article-category">${escapeHtml(a.category||"BERITA")}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.summary||"Baca informasi selengkapnya di Mining Insight Indonesia.")}</p></div></article>`).join("")}catch(e){grid.innerHTML='<div class="empty-state">Berita belum dapat dimuat. Silakan coba beberapa saat lagi.</div>'}}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
loadArticles();