let allAssets = [];
let employeesCache = []; // เก็บรายชื่อพนักงานไว้ ไม่ต้องโหลดบ่อยๆ
let currentAssetId = null;

window.onload = loadAssets;

async function loadAssets() {
    document.getElementById('assetGrid').innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#64748b;">กำลังโหลดข้อมูล...</div>';
    
    // 1. โหลดข้อมูลคอมฯ
    const { data: assets, error } = await supabaseClient.from('computers').select(`*, employees(name, department, desk_phone)`).order('computer_id');
    if (error) return alert('Error: ' + error.message);
    allAssets = assets;
    document.getElementById('totalCount').innerText = allAssets.length;
    renderGrid(allAssets);

    // 2. แอบโหลดรายชื่อพนักงานเตรียมไว้สำหรับ Dropdown
    const { data: emps } = await supabaseClient.from('employees').select('employee_id, name').order('name');
    employeesCache = emps || [];
}

function renderGrid(assets) {
    const grid = document.getElementById('assetGrid');
    grid.innerHTML = '';
    assets.forEach(asset => {
        let statusClass='st-free', statusText='ว่าง', userDisplay='<span style="color:#94a3b8">ไม่มีเจ้าของ</span>', icon='fa-desktop';
        
        if (asset.asset_type === 'Notebook') icon = 'fa-laptop';
        else if (asset.asset_type === 'All-in-One') icon = 'fa-tv';
        else if (asset.asset_type === 'Monitor') icon = 'fa-desktop';

        if (asset.user_id) { 
            statusClass='st-use'; statusText='ใช้งานอยู่'; 
            userDisplay=`<span style="color:#0f172a; font-weight:600;">${asset.employees?.name || 'Unknown'}</span>`; 
        } else if (asset.loan_borrower_name) { 
            statusClass='st-loan'; statusText='ถูกยืม'; 
            userDisplay=`<span style="color:#854d0e;">${asset.loan_borrower_name}</span>`; 
        }

        const card = document.createElement('div'); card.className = 'asset-card';
        card.onclick = () => openDetail(asset.computer_id);
        
        card.innerHTML = `
            <div class="card-header"><div class="card-icon"><i class="fas ${icon}"></i></div><div class="card-status ${statusClass}">${statusText}</div></div>
            <h3 class="card-title">${asset.computer_id}</h3>
            <p class="card-subtitle">${asset.asset_type} • ${asset.spec||'-'}</p>
            <div class="card-user"><div class="user-avatar"><i class="fas fa-user"></i></div><div style="font-size:0.9rem;">${userDisplay}</div></div>
        `;
        grid.appendChild(card);
    });
}

async function openDetail(id) {
    currentAssetId = id;
    const asset = allAssets.find(a => a.computer_id === id);
    
    // Header Info
    document.getElementById('viewId').innerText = asset.computer_id;
    document.getElementById('viewTypeHeader').innerText = asset.asset_type;

    // Fill Form Inputs
    document.getElementById('editType').value = asset.asset_type;
    document.getElementById('editSpec').value = asset.spec || '';
    document.getElementById('editRemark').value = asset.remarks || '';

    // 🔥 สร้าง Dropdown เลือกเจ้าของ (Owner)
    const ownerSelect = document.getElementById('editOwner');
    ownerSelect.innerHTML = '<option value="">-- ว่าง / ไม่ระบุ (No Owner) --</option>';
    
    employeesCache.forEach(emp => {
        ownerSelect.add(new Option(`${emp.name} (${emp.employee_id})`, emp.employee_id));
    });

    // ตั้งค่าเจ้าของปัจจุบัน (ถ้ามี)
    if (asset.user_id) {
        ownerSelect.value = asset.user_id;
    } else {
        ownerSelect.value = "";
    }

    // Badge สถานะ
    const badge = document.getElementById('viewStatusBadge');
    if (asset.user_id) badge.innerHTML = `<span class="status-badge status-in-use">ใช้งานโดยพนักงาน</span>`;
    else if (asset.loan_borrower_name) badge.innerHTML = `<span class="status-badge status-loaned">ถูกยืมชั่วคราว (${asset.loan_borrower_name})</span>`;
    else badge.innerHTML = `<span class="status-badge status-available">ว่างพร้อมใช้</span>`;

    // Timeline
    renderTimeline(asset.repair_history);
    document.getElementById('detailModal').style.display = 'block';
}

function renderTimeline(historyText) {
    const container = document.getElementById('repairTimeline'); container.innerHTML = '';
    if (!historyText) return container.innerHTML = '<div style="text-align:center; color:#cbd5e1; margin-top:20px;">- ไม่มีประวัติการซ่อม -</div>';
    historyText.split('\n').reverse().forEach(line => {
        if(!line.trim()) return;
        let date='บันทึก', msg=line;
        if(line.includes(' - ')) { const parts=line.split(' - '); date=parts[0]; msg=parts.slice(1).join(' - '); }
        container.innerHTML += `<div class="timeline-item"><div class="timeline-date">${date}</div><div class="timeline-text">${msg}</div></div>`;
    });
}

async function addLog() {
    const msg = document.getElementById('newLogInput').value.trim();
    if (!msg) return;
    const newEntry = `${new Date().toLocaleString('th-TH')} - ${msg}`;
    const asset = allAssets.find(a => a.computer_id === currentAssetId);
    let updatedHistory = asset.repair_history ? (asset.repair_history + '\n' + newEntry) : newEntry;
    await supabaseClient.from('computers').update({ repair_history: updatedHistory }).eq('computer_id', currentAssetId);
    asset.repair_history = updatedHistory; renderTimeline(updatedHistory); document.getElementById('newLogInput').value = '';
}

async function saveChanges() {
    const type = document.getElementById('editType').value;
    const spec = document.getElementById('editSpec').value;
    const remark = document.getElementById('editRemark').value;
    
    // 🔥 รับค่าเจ้าของใหม่
    let newOwner = document.getElementById('editOwner').value;
    if (newOwner === "") newOwner = null; // ถ้าเลือกว่าง ให้ส่งค่า null ไป Database

    // เตรียมข้อมูลอัปเดต
    const updateData = { 
        asset_type: type, 
        spec: spec, 
        remarks: remark,
        user_id: newOwner 
    };

    // ถ้ามีการเลือกเจ้าของถาวร (พนักงาน) -> ให้เคลียร์สถานะ "ยืมชั่วคราว" ออกด้วย เพื่อไม่ให้ซ้ำซ้อน
    if (newOwner) {
        updateData.loan_borrower_name = null;
    }

    await supabaseClient.from('computers').update(updateData).eq('computer_id', currentAssetId);
    
    alert('บันทึกเรียบร้อย'); 
    closeDetailModal(); 
    loadAssets(); // โหลดหน้าใหม่
}

async function deleteCurrentAsset() {
    if(confirm('ลบเครื่องนี้?')) { await supabaseClient.from('computers').delete().eq('computer_id', currentAssetId); closeDetailModal(); loadAssets(); }
}
function closeDetailModal() { document.getElementById('detailModal').style.display='none'; }
function openCreateModal() { document.getElementById('createModal').style.display='block'; }
async function createNewAsset() {
    const id=document.getElementById('newId').value, type=document.getElementById('newType').value, spec=document.getElementById('newSpec').value;
    if(!id) return alert('ใส่รหัส');
    await supabaseClient.from('computers').insert([{computer_id:id, asset_type:type, spec:spec}]);
    document.getElementById('createModal').style.display='none'; loadAssets();
}
function filterAssets() {
    const txt = document.getElementById('searchInput').value.toLowerCase();
    renderGrid(allAssets.filter(a => a.computer_id.toLowerCase().includes(txt) || (a.employees?.name||'').toLowerCase().includes(txt) || (a.spec||'').toLowerCase().includes(txt)));
}