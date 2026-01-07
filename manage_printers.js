window.onload=load;
async function load(){
    const t=document.getElementById('list'); t.innerHTML='Loading...';
    const {data}=await supabaseClient.from('printers').select('*, employees(name)').order('printer_id');
    t.innerHTML='';
    data.forEach(p=>{
        const u=p.employees?p.employees.name:'-';
        t.innerHTML+=`<tr><td>${p.printer_id}</td><td>${p.model||'-'}</td><td>${u}</td><td><button class="btn-action btn-primary" onclick="openModal('update','${p.printer_id}')">แก้</button> <button class="btn-action btn-danger" onclick="del('${p.printer_id}')">ลบ</button></td></tr>`;
    });
}
window.openModal=async(m,id)=>{
    document.getElementById('form').reset(); document.getElementById('mode').value=m;
    if(m==='create') document.getElementById('pid').readOnly=false;
    else { document.getElementById('pid').readOnly=true; document.getElementById('eid').value=id; const{data}=await supabaseClient.from('printers').select('*').eq('printer_id',id).single(); document.getElementById('pid').value=data.printer_id; document.getElementById('pmodel').value=data.model; }
    document.getElementById('modalBackdrop').style.display='block';
};
window.save=async()=>{
    const m=document.getElementById('mode').value, d={printer_id:document.getElementById('pid').value, model:document.getElementById('pmodel').value};
    if(m==='create') await supabaseClient.from('printers').insert([d]); else { delete d.printer_id; await supabaseClient.from('printers').update(d).eq('printer_id',document.getElementById('eid').value); }
    closeModal(); load();
};
window.del=async(id)=>{ if(confirm('ลบ?')) { await supabaseClient.from('printers').delete().eq('printer_id',id); load(); } };
window.closeModal=()=>document.getElementById('modalBackdrop').style.display='none';