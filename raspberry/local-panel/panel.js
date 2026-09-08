const key = location.hash.slice(1);
if (key) { sessionStorage.setItem('kla-local-token', key); history.replaceState(null, '', '/'); }
const token = sessionStorage.getItem('kla-local-token') || '';
const el = id => document.getElementById(id);
let busy = false, selected = '', trigger = null;
const labels = {start:'Uruchomić istniejący serwis?', 'safe-restart':'Zrestartować aplikację? Niezapisane formularze użytkowników mogą zostać przerwane. Baza i Raspberry nie będą restartowane.', backup:'Utworzyć szyfrowaną kopię? Nie odłączaj dysku ani zasilania.', 'restore-test':'Odtworzyć ostatnią kopię w osobnej bazie testowej? To może potrwać kilka minut. Baza szkoły nie zostanie zastąpiona.'};
async function api(path, body) {
  const response = await fetch(path, {headers:{Authorization:`Bearer ${token}`, ...(body ? {'Content-Type':'application/json'} : {})}, ...(body ? {method:'POST',body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(50000)});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || data.message || 'Nie udało się wykonać operacji.');
  return data;
}
async function refresh() {
  el('refresh').disabled = true;
  try {
    const data = await api('/api/status');
    el('status').replaceChildren(...data.text.split('\n').filter(Boolean).map(line => {
      const item = document.createElement('li'); item.textContent = line;
      item.className = line.startsWith('[OK]') ? 'ok' : line.startsWith('[STOP]') ? 'error' : line.includes('[UWAGA]') ? 'warn' : ''; return item;
    }));
    el('summary').textContent = data.demo ? 'Tryb demonstracyjny — polecenia są symulowane.' : data.text.includes('[STOP]') ? 'Są elementy wymagające naprawy. Sprawdź poniżej.' : data.text.includes('[UWAGA]') ? 'Serwer odpowiada. Sprawdź ostrzeżenia poniżej.' : 'Serwer odpowiada. Kontrole poniżej są aktualne.';
    el('updated').textContent = `Ostatni odczyt: ${new Date().toLocaleTimeString('pl-PL')}`;
  } catch(error) { el('summary').textContent = error.message; el('status').replaceChildren(); }
  finally { el('refresh').disabled = false; }
}
function setBusy(value) { busy=value; document.querySelectorAll('[data-action]').forEach(button => {button.disabled=value;}); }
async function poll() {
  try {
    const job=await api('/api/job'); setBusy(job.state==='running');
    if(job.message) el('result').textContent=job.message;
  } catch(error) { el('result').textContent=error.message; setBusy(true); }
}
el('refresh').addEventListener('click',refresh);
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click',()=>{
  if(busy)return; selected=button.dataset.action; trigger=button; el('confirmation').textContent=labels[selected]; el('confirm').showModal();
}));
el('confirm').addEventListener('close',async()=>{
  const action=selected; trigger?.focus(); if(el('confirm').returnValue!=='ok')return;
  setBusy(true); el('result').textContent='Rozpoczynam operację…';
  try { await api('/api/action',{action,confirmed:true}); await poll(); }
  catch(error) {el('result').textContent=error.message; setBusy(false);}
});
if(token) {
  refresh(); poll(); setInterval(()=>{if(!document.hidden)poll();},3000); setInterval(()=>{if(!document.hidden && !busy)refresh();},60000);
} else {
  el('summary').textContent='Otwórz skrót „KLA — serwer” z pulpitu Raspberry, aby uzyskać lokalny dostęp.';
  setBusy(true); el('refresh').disabled=true;
}
