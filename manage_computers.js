let allAssets=[], employeesCache=[], currentAssetId=null;
window.onload = loadAssets;

async function loadAssets() {
    document.getElementById('assetGrid').innerHTML = '<div style="text-align:center; grid-column:1/-1;">Loading...</div>';
    const { data, error } = await supabaseClient.from('computers').select(`*, employees(name, department)`).order('computer_id');
    if (error) return alert(error.message);
    allAssets = data; document.getElementById('totalCount').innerText = allAssets.length;
    renderGrid(allAssets);
    const { data: emps } = await supabaseClient.from('employees').select('employee_id, name').order('name');
    employeesCache = emps || [];
}

function renderGrid(assets) {
    const grid = document.getElementById('assetGrid'); grid.innerHTML = '';
    assets.forEach(asset => {
        let strip='strip-other', icon='fa-desktop', uStat='<span style="color:#94a3b8">ว่าง</span>', dot='dot-green';
        if(asset.asset_type==='Notebook'){strip='strip-notebook'; icon='fa-laptop';}
        else if(asset.asset_type==='All-in-One'){strip='strip-aio'; icon='fa-tv';}
        else if(asset.asset_type==='PC'){strip='strip-pc'; icon='fa-desktop';}

        if(asset.user_id){ uStat=`<span style="color:#1e293b">${asset.employees?.name}</span>`; dot='dot-blue'; }
        else if(asset.loan_borrower_name){ uStat=`<span style="color:#d97706">ถูกยืม: ${asset.loan_borrower_name}</span>`; dot='dot-orange'; }

        const card = document.createElement('div'); card.className = 'asset-card';
        card.onclick = () => openDetail(asset.computer_id);
        card.innerHTML = `
            <div class="card-strip ${strip}"></div>
            <div class="card-body">
                <div class="card-header"><div class="asset-id">${asset.computer_id}</div><span class="asset-type-badge">${asset.asset_type}</span></div>
                <div class="asset-spec">${asset.spec||'-'}</div>
                <div class="card-footer"><div class="user-status"><div class="status-dot ${dot}"></div>${uStat}</div></div>
            </div>`;
        grid.appendChild(card);
    });
}

async function openDetail(id) {
    currentAssetId = id;
    const asset = allAssets.find(a => a.computer_id === id);
    document.getElementById('viewId').innerText = asset.computer_id;
    document.getElementById('viewTypeHeader').innerText = asset.asset_type;
    document.getElementById('editType').value = asset.asset_type;
    document.getElementById('editSpec').value = asset.spec || '';
    document.getElementById('editRemark').value = asset.remarks || '';

    const sel = document.getElementById('editOwner'); sel.innerHTML = '<option value="">-- ว่าง --</option>';
    employeesCache.forEach(e => sel.add(new Option(`${e.name}`, e.employee_id)));
    sel.value = asset.user_id || "";

    const badge = document.getElementById('viewStatusBadge');
    if(asset.user_id) badge.innerHTML = `<span class="status-badge status-in-use">ใช้งาน</span>`;
    else if(asset.loan_borrower_name) badge.innerHTML = `<span class="status-badge status-loaned">ถูกยืม</span>`;
    else badge.innerHTML = `<span class="status-badge status-available">ว่าง</span>`;

    renderTimeline(asset.repair_history);
    document.getElementById('detailModal').style.display = 'flex';
}

function renderTimeline(h) {
    const box=document.getElementById('repairTimeline'); box.innerHTML='';
    if(!h) return box.innerHTML='<div style="text-align:center; color:#ccc; margin-top:20px;">ไม่มีประวัติ</div>';
    h.split('\n').reverse().forEach(l=>{
        if(!l.trim())return;
        let d='Log', m=l;
        if(l.includes(' - ')){const p=l.split(' - '); d=p[0]; m=p.slice(1).join(' - ');}
        box.innerHTML+=`<div class="chat-bubble"><span class="chat-date">${d}</span><div class="chat-text">${m}</div></div>`;
    });
}

async function addLog() {
    const msg=document.getElementById('newLogInput').value; if(!msg)return;
    const ent=`${new Date().toLocaleDateString('th-TH')} - ${msg}`;
    const asset=allAssets.find(a=>a.computer_id===currentAssetId);
    const nh=asset.repair_history?(asset.repair_history+'\n'+ent):ent;
    await supabaseClient.from('computers').update({repair_history:nh}).eq('computer_id',currentAssetId);
    asset.repair_history=nh; renderTimeline(nh); document.getElementById('newLogInput').value='';
}
async function saveChanges() {
    const t=document.getElementById('editType').value, s=document.getElementById('editSpec').value, o=document.getElementById('editOwner').value||null, r=document.getElementById('editRemark').value;
    const pl={asset_type:t, spec:s, user_id:o, remarks:r}; if(o) pl.loan_borrower_name=null;
    await supabaseClient.from('computers').update(pl).eq('computer_id',currentAssetId);
    alert('Saved'); closeDetailModal(); loadAssets();
}
async function createNewAsset() {
    const i=document.getElementById('newId').value, t=document.getElementById('newType').value, s=document.getElementById('newSpec').value;
    if(!i)return alert('Error');
    await supabaseClient.from('computers').insert([{computer_id:i, asset_type:t, spec:s}]);
    document.getElementById('createModal').style.display='none'; loadAssets();
}
async function deleteCurrentAsset(){if(confirm('Delete?')){await supabaseClient.from('computers').delete().eq('computer_id',currentAssetId); closeDetailModal(); loadAssets();}}
function closeDetailModal(){document.getElementById('detailModal').style.display='none';}
function openCreateModal(){document.getElementById('createModal').style.display='flex';}
function filterAssets(){const v=document.getElementById('searchInput').value.toLowerCase(); renderGrid(allAssets.filter(a=>a.computer_id.toLowerCase().includes(v)||a.employees?.name.toLowerCase().includes(v)));}