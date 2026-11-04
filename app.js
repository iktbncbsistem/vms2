// GUNA KUNCI SUPABASE BOS
const supabaseUrl = 'https://eazdfwzifcsfayapyshv.supabase.co';
const supabaseKey = 'sb_publishable_IVJA3hCseLo_d39XX9RzMg_Nz4p8az2';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let cacheUrusetia = []; // Untuk simpan data permohonan modal

// Utility tambah baris jadual pemohon
function tambahBaris(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    const tr = tbody.querySelector('tr').cloneNode(true);
    tr.querySelectorAll('input').forEach(input => input.value = '');
    tbody.appendChild(tr);
}

// ==========================================
// PENGURUSAN SESI LOG MASUK & PERANAN
// ==========================================
async function loginGoogle() {
    await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

window.onload = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('btnLogout').classList.remove('hidden');
        semakPeranan();
    }
};

async function semakPeranan() {
    const { data, error } = await supabaseClient.from('profil').select('peranan, nama').eq('id', currentUser.id).single();
    if (data) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('sistem-tab-utama').classList.remove('hidden'); 
        
        semakJadualAwam('aktif'); 

        // Tunjuk tab dan fungsi mengikut peranan masing-masing
        if (data.peranan === 'pemohon') {
            // HANYA PEMOHON yang nampak tab Mohon Kenderaan & kotak carian
            const btnTabMohon = document.getElementById('btnTabMohon');
            const ruangCarian = document.getElementById('ruang-carian-jadual');
            if(btnTabMohon) btnTabMohon.classList.remove('hidden');
            if(ruangCarian) ruangCarian.classList.remove('hidden');
            
            const appNameField = document.getElementById('applicantName');
            if(appNameField) appNameField.value = data.nama;
        } 
        else if (data.peranan === 'urusetia') {
            document.getElementById('btnTabUrusetia').classList.remove('hidden');
            muatSenaraiUrusetia();
        } 
        else if (data.peranan === 'pelulus') {
            document.getElementById('btnTabPelulus').classList.remove('hidden');
            muatSenaraiPelulus();
        }
    } else {
        alert("Profil anda tiada dalam pangkalan data. Sila hubungi Admin.");
    }
}
// ==========================================
// FUNGSI TOGGLE TAB UTAMA (KALIS RALAT)
// ==========================================
window.tukarTab = function(tabName) {
    // 1. Sembunyikan SEMUA tab dengan selamat (kalau wujud baru hide)
    const semuaTab = ['tab-jadual-awam', 'tab-mohon-kenderaan', 'dashboard-pemohon', 'tab-dashboard-urusetia', 'tab-dashboard-pelulus'];
    semuaTab.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // 2. Reset warna SEMUA butang tab dengan selamat
    const semuaButang = ['btnTabJadual', 'btnTabMohon', 'btnTabUrusetia', 'btnTabPelulus'];
    semuaButang.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.style.background = '#f1f5f9';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '600';
            btn.style.borderBottom = '1px solid #cbd5e1';
        }
    });

    // 3. Tentukan tab mana nak buka
    let idTabBuka = '';
    let idBtnBuka = '';

    if (tabName === 'jadual') { 
        idTabBuka = 'tab-jadual-awam'; 
        idBtnBuka = 'btnTabJadual'; 
    }
    else if (tabName === 'mohon') {
        // Semak jika guna ID baharu atau lama
        idTabBuka = document.getElementById('tab-mohon-kenderaan') ? 'tab-mohon-kenderaan' : 'dashboard-pemohon';
        idBtnBuka = 'btnTabMohon';
    }
    else if (tabName === 'urusetia') { 
        idTabBuka = 'tab-dashboard-urusetia'; 
        idBtnBuka = 'btnTabUrusetia'; 
    }
    else if (tabName === 'pelulus') { 
        idTabBuka = 'tab-dashboard-pelulus'; 
        idBtnBuka = 'btnTabPelulus'; 
    }

    // 4. Buka tab dan warnakan butang
    const tabDibuka = document.getElementById(idTabBuka);
    if (tabDibuka) {
        tabDibuka.classList.remove('hidden');
        // Pastikan ruang borang dipaparkan jika guna HTML struktur lama
        const borang = document.getElementById('ruangBorangPemohon');
        if (borang) borang.classList.remove('hidden');
    }

    const btnDibuka = document.getElementById(idBtnBuka);
    if (btnDibuka) {
        btnDibuka.style.background = 'white';
        btnDibuka.style.color = '#1767c2';
        btnDibuka.style.fontWeight = '700';
        btnDibuka.style.borderBottom = 'none';
    }
};
// Redirect fungsi lama ke fungsi baru (supaya masa hantar borang dia refresh jadual atas)
window.muatSejarahPemohon = function() { semakJadualAwam('aktif'); };

// ==========================================
// FUNGSI TOGGLE BORANG BARU 
// ==========================================
window.toggleBorangBaru = function() {
    const tabMohon = document.getElementById('tab-mohon-kenderaan');
    
    // Jika borang tersembunyi, buka tab borang (Fungsi butang ➕ Mohon Baru)
    if (tabMohon && tabMohon.classList.contains('hidden')) {
        tukarTab('mohon'); 
    } 
    // Jika borang sedang dibuka, kembali ke jadual (Fungsi butang ← Batal)
    else {
        tukarTab('jadual'); 
    }
};
// ==========================================
// PEMOHON: HANTAR BORANG KE SUPABASE
// ==========================================
const vehicleForm = document.getElementById('vehicleForm');
if(vehicleForm) {
    vehicleForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSubmit');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '⏳ Menghantar...';
        btnSubmit.disabled = true;

        try {
            // Upload Fail Surat
            const fileUpload = document.getElementById('fileUpload').files[0];
            let fileUrl = null;
            if (fileUpload) {
                const fileName = `surat_${Date.now()}.${fileUpload.name.split('.').pop()}`;
                const { error: uploadError } = await supabaseClient.storage.from('dokumen_sokongan').upload(fileName, fileUpload);
                if (uploadError) throw uploadError;
                fileUrl = supabaseClient.storage.from('dokumen_sokongan').getPublicUrl(fileName).data.publicUrl;
            }

            // Kumpul Data Penumpang & Peralatan (JSON)
            const passengers = [];
            document.querySelectorAll('#tblPassengers tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs[0].value.trim()) passengers.push({ nama: inputs[0].value, kp: inputs[1].value, bahagian: inputs[2].value });
            });
            const equipments = [];
            document.querySelectorAll('#tblEquipment tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs[0].value.trim()) equipments.push({ nama: inputs[0].value, kuantiti: inputs[1].value, catatan: inputs[2].value });
            });

            // Hantar ke Database
            const { error: insertError } = await supabaseClient.from('tempahan').insert([{
                id_pemohon: currentUser.id,
                nama_pemohon: document.getElementById('applicantName').value,
                no_telefon: document.getElementById('phone').value,
                bahagian: document.getElementById('department').value,
                tujuan: document.getElementById('purpose').value,
                destinasi: document.getElementById('location').value,
                lokasi: document.getElementById('location').value, // backup column
                tarikh_pergi: document.getElementById('tripDate').value,
                tarikh_balik: document.getElementById('returnDate').value,                
                masa_bertolak: document.getElementById('departTime').value,
                masa_balik: document.getElementById('returnTime').value,
                fail_surat: fileUrl,
                senarai_penumpang: passengers,
                senarai_peralatan: equipments,
                status: 'Menunggu Semakan'
            }]);

            if (insertError) throw insertError;
            alert("Permohonan berjaya dihantar!");
            vehicleForm.reset();
            
            // Sembunyikan borang semula selepas hantar & refresh jadual
            // Sembunyikan borang secara selamat
const ruangBorang = document.getElementById('ruangBorangPemohon');
if (ruangBorang) {
    ruangBorang.classList.add('hidden');
}
            muatSejarahPemohon();

        } catch (error) {
            alert("Ralat menghantar permohonan: " + error.message);
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}


// ==========================================
// URUSETIA: PAPAR & AGIH KENDERAAN
// ==========================================
async function muatSenaraiUrusetia() {
    const div = document.getElementById('senarai-tempahan-urusetia');
    div.innerHTML = "Memuatkan data...";

    const { data: tempahan, error } = await supabaseClient.from('tempahan').select('*').in('status', ['Menunggu Semakan', 'Lulus']).order('id', {ascending: false});
    if (error) return div.innerHTML = "Ralat: " + error.message;
    if (!tempahan || tempahan.length === 0) return div.innerHTML = "<p>Tiada permohonan baharu.</p>";

    cacheUrusetia = tempahan; // Simpan untuk modal
    const { data: kenderaanList } = await supabaseClient.from('kenderaan').select('*');

    // Tambah lajur No. Rujukan
    let html = `<table style="min-width: 900px;"><tr><th>No. Rujukan</th><th>Pemohon & Lokasi</th><th>Tarikh Perjalanan</th><th>Status</th><th>Tindakan Urusetia</th></tr>`;
    
    tempahan.forEach((t, index) => {
        // Format No Rujukan
        const noRujukan = `VMS-${t.id.toString().padStart(4, '0')}`;

        html += `<tr>
            <td><strong>${noRujukan}</strong></td>
            <td><strong>${t.nama_pemohon}</strong><br><small>${t.destinasi || t.lokasi}</small></td>
            <td>${t.tarikh_pergi}</td>
            <td><strong style="color:var(--primary);">${t.status}</strong></td>
            <td>
                <button class="btn btn-light" onclick="paparButiran(${index})" style="margin-bottom:8px; font-size:12px; width:100%;">🔍 Butiran Penuh</button><br>
        `;

        // FLOW BAHAGIAN B: Semakan Pegawai Mengurus (Dikemas kini)
        if (t.status === 'Menunggu Semakan') {
            html += `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <button class="btn btn-primary" onclick="sahkanUrusetia(${t.id})" style="font-size:12px; width:100%;">✅ Sahkan & Hantar Pelulus</button>
                    <button class="btn btn-danger" onclick="updateStatus(${t.id}, 'Tolak')" style="font-size:12px; width:100%;">❌ Tolak (Tidak Lengkap)</button>
                </div>
            `;
        
        // FLOW BAHAGIAN C: Arahan Pemandu & Kenderaan (Selepas Diluluskan)
        } else if (t.status === 'Lulus') {
            html += `
                <select id="pemandu-${t.id}" style="margin-bottom:5px; width:100%; padding:5px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px;">
                    <option value="">-- Pilih Pemandu --</option>
                    <option value="Rohaizan bin Mohd Fuzi">Rohaizan bin Mohd Fuzi</option>
                    <option value="Mohamad Khairoul Azuan">Mohamad Khairoul Azuan</option>
                    <option value="Pemandu Gantian">Pemandu Gantian</option>
                </select><br>
                <select id="kenderaan-${t.id}" style="margin-bottom:5px; width:100%; padding:5px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px;">
                    <option value="">-- Pilih Kenderaan --</option>`;
            if (kenderaanList) {
                kenderaanList.forEach(k => html += `<option value="${k.id}">${k.no_plat} - ${k.model}</option>`);
            }
            html += `</select><br>
                <button class="btn btn-success" onclick="agihKenderaan(${t.id})" style="font-size:12px; width:100%;">Sahkan Agihan</button>`;
        }
        html += `</td></tr>`;
    });
    div.innerHTML = html + `</table>`;
}

// ==========================================
// FUNGSI PENGESAHAN URUSETIA (BAHAGIAN B)
// ==========================================
async function sahkanUrusetia(id) {
    if(!confirm("Adakah anda pasti borang ini lengkap dan terdapat kenderaan/pemandu yang tersedia pada tarikh tersebut?")) return;
    
    const { error } = await supabaseClient.from('tempahan').update({ status: 'Menunggu Kelulusan' }).eq('id', id);
    
    if(error) {
        alert("Ralat: " + error.message);
    } else {
        alert("Pengesahan berjaya! Permohonan telah dihantar kepada Pelulus.");
        muatSenaraiUrusetia(); // Refresh jadual Urusetia
    }
}

// ==========================================
// FUNGSI AGIHAN KENDERAAN & PEMANDU (URUSETIA)
// ==========================================
async function agihKenderaan(id) {
    // 1. Tarik nilai yang dipilih oleh Urusetia dari dropdown
    const idKenderaan = document.getElementById(`kenderaan-${id}`).value;
    const namaPemandu = document.getElementById(`pemandu-${id}`).value;
    
    // 2. Halang jika ada yang belum dipilih
    if (!idKenderaan || !namaPemandu) {
        alert("Sila pastikan bos telah memilih Pemandu DAN Kenderaan!");
        return;
    }

    // 3. Hantar ke pangkalan data Supabase
    const { error } = await supabaseClient.from('tempahan').update({ 
        id_kenderaan: idKenderaan, 
        nama_pemandu: namaPemandu, 
        status: 'Selesai Diagih' 
    }).eq('id', id);

    // 4. Mesej berjaya dan 'refresh' jadual
    if (error) {
        alert("Ralat! Pastikan lajur 'nama_pemandu' wujud di Supabase. Ralat: " + error.message);
    } else {
        alert("Mantap bos! Pemandu dan Kenderaan telah berjaya diagihkan."); 
        muatSenaraiUrusetia();
    }
}

/* VMS - PAPARAN BUTIRAN PERMOHONAN KENDERAAN
   Reka bentuk baharu berdasarkan imej rujukan.
   Fungsi data dan nama medan asal dikekalkan.
*/
(function () {
    'use strict';

    function pasangGayaVMS() {
        if (document.getElementById('vms-modern-style')) return;

        const css = `
        #modalUrusetia .vms-form,
        .vms-form {
            --vms-blue: #1769c2;
            --vms-navy: #102f70;
            --vms-muted: #5576a8;
            --vms-line: #d8e6fa;
            width: 100%;
            max-height: 92vh;
            overflow-y: auto;
            box-sizing: border-box;
            padding: 0 0 18px;
            border: 1px solid #dce7f5;
            border-radius: 14px;
            background: #fff;
            color: var(--vms-navy);
            font-family: Inter, "Segoe UI", Arial, sans-serif;
            box-shadow: 0 18px 50px rgba(20, 48, 91, .18);
        }
        .vms-form * { box-sizing: border-box; }

        .vms-header {
            position: relative;
            display: flex;
            align-items: center;
            gap: 20px;
            min-height: 130px;
            padding: 22px 42px;
            margin: 0 0 14px;
            border-bottom: 1px solid #e4edf9;
            background:
                radial-gradient(circle at 82% 40%, rgba(213,232,255,.48) 0 105px, transparent 106px),
                linear-gradient(115deg, #fff 0%, #f7fbff 72%, #eaf4ff 100%);
            overflow: hidden;
        }
        .vms-header:after {
            content: "";
            position: absolute;
            right: -25px;
            bottom: -62px;
            width: 230px;
            height: 105px;
            transform: rotate(-25deg);
            background: linear-gradient(90deg, rgba(183,215,255,.12), rgba(153,196,250,.55));
            pointer-events: none;
        }
        .vms-logo {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 90px;
            width: 90px;
            height: 90px;
            border-radius: 50%;
            color: #fff;
            font-size: 43px;
            background: linear-gradient(145deg, #3194f6, #1255b8);
            box-shadow: 0 7px 17px rgba(28, 105, 197, .18);
        }
        .vms-heading {
            position: relative;
            z-index: 1;
            min-width: 0;
        }
        .vms-header h3 {
            margin: 0 0 8px;
            color: #102e70;
            font-size: clamp(18px, 2.1vw, 27px);
            line-height: 1.2;
            font-weight: 850;
            letter-spacing: -.45px;
        }
        .vms-subtitle {
            color: #607da9;
            font-size: 16px;
            line-height: 1.4;
        }
        .vms-reference {
            position: relative;
            z-index: 1;
            min-width: 155px;
            margin-left: auto;
            padding: 13px 20px;
            border-radius: 40px;
            background: rgba(220, 237, 255, .9);
            color: #5275a8;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: .2px;
        }
        .vms-reference strong {
            display: block;
            margin-top: 4px;
            color: #102f70;
            font-size: 20px;
            letter-spacing: .3px;
        }
        .vms-header-close {
            position: absolute;
            z-index: 3;
            top: 13px;
            right: 18px;
            width: 32px;
            height: 32px;
            border: 0;
            border-radius: 50%;
            background: transparent;
            color: #647b9c;
            font-size: 27px;
            line-height: 1;
            cursor: pointer;
        }
        .vms-header-close:hover {
            background: #e8f1fc;
            color: #173d7b;
        }

        .vms-section {
            margin: 14px 32px 18px;
            overflow: hidden;
            border: 1px solid #cfe2ff;
            border-radius: 15px;
            background: #fff;
            box-shadow: 0 2px 5px rgba(35, 89, 155, .035);
        }
        .vms-section-title {
            display: flex;
            align-items: center;
            gap: 14px;
            min-height: 51px;
            margin: 0;
            padding: 8px 13px;
            color: #123775;
            font-size: 18px;
            font-weight: 850;
            line-height: 1.3;
        }
        .vms-blue {
            background: linear-gradient(100deg, #e5f1ff, #edf6ff);
            color: #123775;
        }
        .vms-teal {
            background: linear-gradient(100deg, #e0f4f2, #eaf8f6);
            color: #08666a;
        }
        .vms-purple {
            background: linear-gradient(100deg, #e9eaff, #f0f0ff);
            color: #5559b4;
        }
        .vms-section-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 42px;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: linear-gradient(145deg, #1595ce, #1262a8);
            color: #fff;
            font-size: 21px;
            box-shadow: 0 2px 5px rgba(0,0,0,.08);
        }
        .vms-teal .vms-section-icon {
            background: linear-gradient(145deg, #15958f, #075c5c);
        }
        .vms-purple .vms-section-icon {
            background: linear-gradient(145deg, #7779db, #4546a4);
        }

        .vms-content {
            margin: 0;
            padding: 17px 24px 12px;
            background: linear-gradient(115deg, #fff, #fbfdff);
        }
        .vms-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: 24px;
            row-gap: 0;
        }
        .vms-field {
            position: relative;
            display: flex;
            align-items: center;
            gap: 17px;
            min-width: 0;
            min-height: 85px;
            padding: 12px 7px;
            border-bottom: 1px solid #dce8f8;
        }
        .vms-field:nth-child(2n):not(.full) {
            border-left: 1px solid #dce8f8;
            padding-left: 20px;
        }
        .vms-field.full {
            grid-column: 1 / -1;
            border-bottom: 0;
        }
        .vms-field-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 55px;
            width: 55px;
            height: 55px;
            border-radius: 50%;
            background: #e5f1ff;
            color: #1769c2;
            font-size: 25px;
        }
        .vms-field-icon.teal {
            background: #e1f4f1;
            color: #08716e;
        }
        .vms-field-icon.purple {
            background: #f0e9fb;
            color: #6547c7;
        }
        .vms-field-icon.gold {
            background: #fff0cf;
            color: #b77912;
        }
        .vms-field-body {
            min-width: 0;
            flex: 1;
        }
        .vms-label {
            display: block;
            margin-bottom: 6px;
            color: #5679a8;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.25;
        }
        .vms-value {
            color: #102f70;
            font-size: 16px;
            font-weight: 700;
            line-height: 1.4;
            overflow-wrap: anywhere;
        }
        .vms-subvalue {
            display: block;
            margin-top: 3px;
            color: #6481ad;
            font-size: 14px;
            font-weight: 500;
        }
        .vms-file-row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 22px;
        }
        .vms-download {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 44px;
            padding: 11px 25px;
            border-radius: 9px;
            background: linear-gradient(110deg, #1680f0, #075bd0);
            color: #fff !important;
            text-decoration: none !important;
            font-size: 13px;
            font-weight: 800;
            box-shadow: 0 4px 9px rgba(17, 105, 215, .16);
            transition: transform .18s ease, box-shadow .18s ease;
        }
        .vms-download:hover {
            transform: translateY(-1px);
            box-shadow: 0 7px 14px rgba(17, 105, 215, .22);
        }
        .vms-file-name {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            min-height: 42px;
            padding-left: 22px;
            border-left: 1px solid #9dbce5;
            color: #617da8;
            font-size: 14px;
            line-height: 1.5;
            overflow-wrap: anywhere;
        }
        .vms-file-name .file-icon {
            color: #8298b8;
            font-size: 27px;
        }
        .vms-empty {
            color: #8b9bb2;
            font-size: 13px;
            font-style: italic;
            font-weight: 500;
        }

        .vms-passenger-wrap {
            padding: 15px 20px 10px;
            overflow-x: auto;
        }
        .vms-table {
            width: 100%;
            min-width: 590px;
            border: 1px solid #d6e2fa;
            border-radius: 10px;
            border-spacing: 0;
            border-collapse: separate;
            overflow: hidden;
            font-size: 14px;
        }
        .vms-table th {
            padding: 11px 15px;
            border-right: 1px solid #dce6fa;
            border-bottom: 1px solid #d6e2fa;
            background: #eef0ff;
            color: #18366f;
            text-align: left;
            font-weight: 800;
            white-space: nowrap;
        }
        .vms-table td {
            padding: 10px 15px;
            border-right: 1px solid #e0e8f8;
            border-bottom: 1px solid #e4ebf8;
            color: #18366f;
            line-height: 1.35;
        }
        .vms-table th:last-child,
        .vms-table td:last-child {
            border-right: 0;
        }
        .vms-table tbody tr:nth-child(even) {
            background: #f3f5ff;
        }
        .vms-table tbody tr:last-child td {
            border-bottom: 0;
        }
        .vms-table th:first-child,
        .vms-table td:first-child {
            width: 65px;
            text-align: center;
        }
        .vms-passenger-total {
            display: flex;
            align-items: center;
            gap: 13px;
            margin: 0 20px 10px;
            padding: 9px 16px;
            border-radius: 9px;
            background: #f0f0ff;
            color: #6469c5;
            font-size: 13px;
            font-style: italic;
            font-weight: 700;
        }
        .vms-no-passenger {
            margin: 15px 20px;
            padding: 18px;
            border: 1px solid #e0e8f8;
            border-radius: 9px;
            background: #f8faff;
        }
        .vms-footer {
            display: flex;
            justify-content: flex-end;
            padding: 0 32px;
            margin-top: 12px;
        }
        .vms-close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-width: 118px;
            min-height: 46px;
            padding: 11px 22px;
            border: 0;
            border-radius: 10px;
            background: #71819b;
            color: #fff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 800;
            transition: background .18s ease;
        }
        .vms-close:hover {
            background: #52647f;
        }

        @media (max-width: 760px) {
            .vms-header {
                gap: 13px;
                padding: 20px 18px;
                min-height: 105px;
            }
            .vms-logo {
                flex-basis: 62px;
                width: 62px;
                height: 62px;
                font-size: 30px;
            }
            .vms-header h3 {
                font-size: 17px;
            }
            .vms-subtitle {
                font-size: 12px;
            }
            .vms-reference {
                min-width: 105px;
                padding: 9px 12px;
                font-size: 10px;
            }
            .vms-reference strong {
                font-size: 15px;
            }
            .vms-section {
                margin: 12px 14px 15px;
            }
            .vms-section-title {
                font-size: 15px;
            }
            .vms-content {
                padding: 10px 13px;
            }
            .vms-grid {
                grid-template-columns: 1fr;
            }
            .vms-field {
                min-height: 76px;
            }
            .vms-field:nth-child(2n):not(.full) {
                border-left: 0;
                padding-left: 7px;
            }
            .vms-field.full {
                grid-column: auto;
            }
            .vms-field-icon {
                flex-basis: 46px;
                width: 46px;
                height: 46px;
                font-size: 21px;
            }
            .vms-value {
                font-size: 14px;
            }
            .vms-file-name {
                padding-left: 0;
                border-left: 0;
            }
            .vms-footer {
                padding: 0 14px;
            }
        }
        @media (max-width: 430px) {
            .vms-header {
                flex-wrap: wrap;
                padding-right: 42px;
            }
            .vms-reference {
                margin-left: 75px;
            }
            .vms-file-row {
                gap: 10px;
            }
            .vms-download {
                width: 100%;
            }
        }
        `;

        const style = document.createElement('style');
        style.id = 'vms-modern-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function vmsEscape(value) {
        return String(value ?? '-').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[char];
        });
    }

    function vmsSafeFileUrl(value) {
        const url = String(value ?? '').trim();
        if (!url) return null;

        try {
            const parsed = new URL(url, window.location.href);
            return ['http:', 'https:'].includes(parsed.protocol)
                ? parsed.href
                : null;
        } catch (error) {
            return null;
        }
    }

    function vmsField(icon, label, value, extraClass, subvalue) {
        return `
            <div class="vms-field">
                <span class="vms-field-icon ${extraClass || ''}" aria-hidden="true">${icon}</span>
                <div class="vms-field-body">
                    <span class="vms-label">${label}</span>
                    <div class="vms-value">${vmsEscape(value)}</div>
                    ${subvalue ? `<span class="vms-subvalue">${vmsEscape(subvalue)}</span>` : ''}
                </div>
            </div>`;
    }

    // FUNGSI UTAMA
    window.paparButiran = function (index) {

        const sumberCache = (typeof cacheUrusetia !== 'undefined')
            ? cacheUrusetia
            : window.cacheUrusetia;

        const t = sumberCache && sumberCache[index];

        if (!t) {
            alert('Rekod permohonan tidak dijumpai.');
            return;
        }

        pasangGayaVMS();

        const noRujukan = 'VMS-' +
            String(t.id ?? Number(index) + 1).padStart(4, '0');

        // SURAT RASMI
        const fileUrl = vmsSafeFileUrl(t.fail_surat);

        const failHtml = fileUrl
            ? `<div class="vms-file-row">
                    <a href="${vmsEscape(fileUrl)}"
                       target="_blank"
                       rel="noopener noreferrer"
                       class="vms-download">
                        <span aria-hidden="true">📎</span>
                        Muat Turun Surat Rasmi
                    </a>
                    <span class="vms-file-name">
                        <span class="file-icon" aria-hidden="true">▤</span>
                        <span>
                            ${vmsEscape(fileUrl.split('/').pop().split('?')[0] || 'Fail surat')}
                            <br>
                            <small>Dokumen lampiran</small>
                        </span>
                    </span>
               </div>`
            : `<span class="vms-empty">
                    ${t.fail_surat
                        ? 'Pautan fail tidak sah.'
                        : 'Tiada fail dilampirkan.'}
               </span>`;

        // SENARAI PENUMPANG
        const penumpang = Array.isArray(t.senarai_penumpang)
            ? t.senarai_penumpang
            : [];

        const htmlPenumpang = penumpang.length > 0
            ? `<div class="vms-passenger-wrap">
                    <table class="vms-table">
                        <thead>
                            <tr>
                                <th>Bil</th>
                                <th>Nama Penumpang</th>
                                <th>No. K/P</th>
                                <th>Bahagian</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${penumpang.map((p, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><strong>${vmsEscape(p.nama)}</strong></td>
                                    <td>${vmsEscape(p.kp)}</td>
                                    <td>${vmsEscape(p.bahagian)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="vms-passenger-total">
                    <span aria-hidden="true">👥</span>
                    Jumlah penumpang: ${penumpang.length} orang
                </div>`
            : `<div class="vms-no-passenger">
                    <span class="vms-empty">
                        Tiada rekod penumpang.
                    </span>
               </div>`;

       // PAPARAN MODAL (HALAMAN PENUH)
        const modalHtml = `
            <div class="vms-form">

                <div class="vms-header">
                    <div class="vms-logo">🚘</div>

                    <div class="vms-heading">
                        <h3>BORANG PERMOHONAN KENDERAAN</h3>
                        <div class="vms-subtitle">
                            Perjalanan Rasmi • Urusan Kerajaan
                        </div>
                    </div>

                    <div class="vms-reference">
                        NO. RUJUKAN
                        <strong>${vmsEscape(noRujukan)}</strong>
                    </div>
                </div>

                <!-- SEKSYEN A -->
                <section class="vms-section">
                    <h4 class="vms-section-title vms-blue">
                        <span class="vms-section-icon">👤</span>
                        A. MAKLUMAT PEMOHON
                    </h4>

                    <div class="vms-content">
                        <div class="vms-grid">

                            <div class="vms-field">
                                <span class="vms-label">NAMA PEMOHON</span>
                                <div class="vms-value">
                                    ${vmsEscape(t.nama_pemohon)}
                                </div>
                            </div>

                            <div class="vms-field">
                                <span class="vms-label">NO. TELEFON</span>
                                <div class="vms-value">
                                    ${vmsEscape(t.no_telefon)}
                                </div>
                            </div>

                            <div class="vms-field">
                                <span class="vms-label">BAHAGIAN / CAWANGAN</span>
                                <div class="vms-value">
                                    ${vmsEscape(t.bahagian)}
                                </div>
                            </div>

                            <div class="vms-field">
                                <span class="vms-label">TUJUAN PERMOHONAN</span>
                                <div class="vms-value">
                                    ${vmsEscape(t.tujuan)}
                                </div>
                            </div>

                            <div class="vms-field full">
                                <span class="vms-label">
                                    SURAT ARAHAN TUGAS RASMI
                                </span>
                                ${failHtml}
                            </div>

                        </div>
                    </div>
                </section>

                <!-- SEKSYEN B -->
                <section class="vms-section">
                    <h4 class="vms-section-title vms-teal">
                        <span class="vms-section-icon">📍</span>
                        B. JADUAL PERJALANAN
                    </h4>

                    <div class="vms-content">
                        <div class="vms-grid">

                            <div class="vms-field full">
                                <span class="vms-label">
                                    DESTINASI / LOKASI
                                </span>
                                <div class="vms-value">
                                    ${vmsEscape(t.destinasi || t.lokasi)}
                                </div>
                            </div>

                            <div class="vms-field">
                                <span class="vms-label">
                                    TARIKH PERJALANAN
                                </span>
                                <div class="vms-value">
                                    ${vmsEscape(t.tarikh_pergi)}
                                </div>
                            </div>

                            <div class="vms-field">
                                <span class="vms-label">
                                    MASA PERJALANAN
                                </span>
                                <div class="vms-value">
                                    ${vmsEscape(t.masa_bertolak || '-')}
                                    hingga
                                    ${vmsEscape(t.masa_balik || '-')}
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                <!-- SEKSYEN C -->
                <section class="vms-section">
                    <h4 class="vms-section-title vms-purple">
                        <span class="vms-section-icon">👥</span>
                        C. SENARAI PENUMPANG
                    </h4>
                    ${htmlPenumpang}
                </section>

                <div class="vms-footer">
                    <button type="button"
                        class="vms-close"
                        id="btnTutupVms"
                        style="background:var(--primary);">
                        ← &nbsp; Kembali ke Senarai
                    </button>
                </div>

            </div>
        `;

        const isiModal = document.getElementById('isiModalUrusetia');
        const modal = document.getElementById('modalUrusetia');
        const tabUtama = document.getElementById('sistem-tab-utama'); // Dikemas kini

        if (!isiModal || !modal) return;

        isiModal.innerHTML = modalHtml;
        
        // 1. Sembunyikan jadual Urusetia / Tab Utama sepenuhnya
        if(tabUtama) {
            tabUtama.classList.add('hidden');
        }
        
        // 2. Tunjuk borang premium sebagai halaman penuh
        modal.classList.remove('hidden');
        window.scrollTo(0, 0);

        // 3. FUNGSI KEMBALI KE SENARAI
        const btnTutup = document.getElementById('btnTutupVms');
        if (btnTutup) {
            btnTutup.innerHTML = '← &nbsp; Kembali ke Senarai';
            btnTutup.style.background = '#1767c2'; // Warna biru supaya lebih menyerlah
            
            btnTutup.addEventListener('click', function() {
                // Sembunyikan borang
                modal.classList.add('hidden');
                // Tunjukkan jadual semula
                if(tabUtama) tabUtama.classList.remove('hidden');
                window.scrollTo(0, 0);
            });
        }
    };

})();

// ==========================================
// PELULUS: LULUS ATAU TOLAK PERMOHONAN
// ==========================================
async function muatSenaraiPelulus() {
    const div = document.getElementById('senarai-tempahan-pelulus');
    if (!div) return;
    
    div.innerHTML = "Memuatkan data kelulusan...";

    const { data: tempahan, error } = await supabaseClient
        .from('tempahan')
        .select('*')
        .eq('status', 'Menunggu Kelulusan')
        .order('id', {ascending: false});
        
    if (error) { 
        div.innerHTML = "Ralat: " + error.message; 
        return; 
    }
    
    if (!tempahan || tempahan.length === 0) { 
        div.innerHTML = "<p style='padding: 15px;'>Tiada kelulusan diperlukan setakat ini.</p>"; 
        return; 
    }

    let html = `<table class="vms-table" style="min-width: 100%;">
        <thead>
            <tr>
                <th>No. Rujukan</th>
                <th>Pemohon & Destinasi</th>
                <th>Tarikh Perjalanan</th>
                <th>Tindakan Pelulus</th>
            </tr>
        </thead>
        <tbody>`;
        
    tempahan.forEach((t, index) => {
        const noRujukan = `VMS-${t.id.toString().padStart(4, '0')}`;
        // Simpan dalam cacheUrusetia supaya butiran penuh boleh diguna pakai oleh Pelulus juga
        cacheUrusetia[index] = t; 

        html += `<tr>
            <td><strong>${noRujukan}</strong></td>
            <td><strong>${t.nama_pemohon}</strong><br><small>${t.destinasi || t.lokasi}</small></td>
            <td>${t.tarikh_pergi}</td>
            <td>
                <button class="btn btn-light" onclick="paparButiran(${index})" style="font-size:12px; margin-bottom:5px; width:100%;">🔍 Butiran Penuh</button>
                <button class="btn btn-success" onclick="updateStatus(${t.id}, 'Lulus')" style="font-size:12px; margin-bottom:5px; width:100%;">✅ Lulus</button>
                <button class="btn btn-danger" onclick="updateStatus(${t.id}, 'Tolak')" style="font-size:12px; width:100%;">❌ Tolak</button>
            </td>
        </tr>`;
    });
    
    div.innerHTML = html + `</tbody></table>`;
}

// ==========================================
// FUNGSI KEMAS KINI STATUS (DIGUNAKAN OLEH URUSETIA & PELULUS)
// ==========================================
async function updateStatus(id, statusBaru) {
    if(!confirm(`Adakah anda pasti untuk menukar status kepada: ${statusBaru}?`)) return;
    
    const { error } = await supabaseClient
        .from('tempahan')
        .update({ status: statusBaru })
        .eq('id', id);
        
    if (error) {
        alert("Ralat mengemas kini status: " + error.message);
    } else {
        alert(`Berjaya! Permohonan telah dikemas kini kepada status: ${statusBaru}`);
        if(currentUser) semakPeranan(); // Refresh data pada papan pemuka
    }
}
// ==========================================
// FUNGSI BUTANG TAMBAH PENUMPANG & PERALATAN
// ==========================================

// 1. Fungsi susun semula nombor Bilangan (1, 2, 3...)
window.kemaskiniBil = function(tableId) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    rows.forEach((row, index) => {
        row.cells[0].innerText = index + 1;
    });
};

// 2. Butang Tambah Penumpang
const btnAddPassenger = document.getElementById('btnAddPassenger');
if (btnAddPassenger) {
    btnAddPassenger.addEventListener('click', function() {
        const tbody = document.querySelector('#tblPassengers tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center; font-weight:600;"></td>
            <td><input type="text" placeholder="Nama Penuh" required></td>
            <td><input type="text" placeholder="No. K/P" required></td>
            <td><input type="tel" placeholder="No. Telefon" required></td>
            <td><input type="text" placeholder="Bahagian" required></td>
            <td style="text-align:center;"><button type="button" class="btn-delete" onclick="this.closest('tr').remove(); kemaskiniBil('tblPassengers')" title="Padam">✕</button></td>
        `;
        tbody.appendChild(tr);
        kemaskiniBil('tblPassengers');
    });
}

// 3. Butang Tambah Peralatan
const btnAddEquipment = document.getElementById('btnAddEquipment');
if (btnAddEquipment) {
    btnAddEquipment.addEventListener('click', function() {
        const tbody = document.querySelector('#tblEquipment tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center; font-weight:600;"></td>
            <td><input type="text" placeholder="Nama Peralatan" required></td>
            <td><input type="number" placeholder="Kuantiti" min="1" required></td>
            <td><input type="text" placeholder="Unit (Cth: Kotak)" required></td>
            <td><input type="text" placeholder="Catatan"></td>
            <td style="text-align:center;"><button type="button" class="btn-delete" onclick="this.closest('tr').remove(); kemaskiniBil('tblEquipment')" title="Padam">✕</button></td>
        `;
        tbody.appendChild(tr);
        kemaskiniBil('tblEquipment');
    });
}

// ==========================================
// FUNGSI BUTANG SIMPAN DRAF & SEMAK SEMULA
// ==========================================
const btnDraft = document.getElementById('btnDraft');
if (btnDraft) {
    btnDraft.addEventListener('click', function() {
        alert("Fungsi 'Simpan Draf' akan membolehkan permohonan disambung semula pada masa lain. (Fungsi ini sedang dibangunkan)");
    });
}

const btnReview = document.getElementById('btnReview');
if (btnReview) {
    btnReview.addEventListener('click', function() {
        alert("Fungsi 'Semak Semula' akan memaparkan ringkasan penuh untuk disemak oleh pemohon sebelum dihantar. (Fungsi ini sedang dibangunkan)");
    });
}

// ==========================================
// FUNGSI CARIAN JADUAL AWAM & PERMOHONAN SAYA
// ==========================================
async function semakJadualAwam(mod = 'aktif') {
    const tMula = document.getElementById('cariTarikhMula').value;
    const tAkhir = document.getElementById('cariTarikhAkhir').value;
    const tbody = document.getElementById('isiJadualAwam');
    
    // Tukar colspan ke 8 mengikut jumlah lajur baharu
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">Memuatkan rekod... ⏳</td></tr>';
    
    const today = new Date().toISOString().split('T')[0];
    let query = supabaseClient.from('tempahan').select('*').order('tarikh_pergi', {ascending: true});
    
    // Tapis berdasarkan butang yang ditekan
    if (mod === 'sejarah') {
        query = query.lt('tarikh_pergi', today);
    } else if (mod === 'cari' && (tMula || tAkhir)) {
        if (tMula) query = query.gte('tarikh_pergi', tMula);
        if (tAkhir) query = query.lte('tarikh_pergi', tAkhir);
    } else {
        // Lalai (Aktif): Dari tarikh hari ini dan ke hadapan
        query = query.gte('tarikh_pergi', today);
    }
    
    const { data, error } = await query;
    if (error) { tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center; padding:30px;">Ralat: ${error.message}</td></tr>`; return; }
    
    // Tarik data senarai kenderaan untuk padankan Nombor Plat & Model
    const { data: senaraiKenderaan } = await supabaseClient.from('kenderaan').select('id, no_plat, model');

    // TAPISAN PINTAR: 
    const dataDitapis = data.filter(t => {
        if (t.status === 'Lulus' || t.status === 'Selesai Diagih') return true;
        if (t.id_pemohon === currentUser.id) return true; 
        return false;
    });
    
    if (!dataDitapis || dataDitapis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">Tiada rekod perjalanan ditemui pada julat tarikh ini.</td></tr>`;
        return;
    }
    
    cacheUrusetia = dataDitapis; 
    
    // 1. Kumpulkan data mengikut Pemandu
    const jadualPemandu = {};
    dataDitapis.forEach((t, i) => {
        t.indexAsal = i; // Simpan index asal untuk butang 'Lihat Butiran'
        const pemandu = t.nama_pemandu || '⏳ Belum Diagih (Menunggu Urusetia)';
        
        if (!jadualPemandu[pemandu]) jadualPemandu[pemandu] = [];
        jadualPemandu[pemandu].push(t);
    });

    // 2. Bina HTML
    let html = '';
    
    for (const pemandu in jadualPemandu) {
        const senaraiTrip = jadualPemandu[pemandu];
        const jumlahRow = senaraiTrip.length;

        senaraiTrip.forEach((t, index) => {
            let statusWarna = '#f59e0b'; 
            let labelStatus = 'Dalam Proses';
            
            if (t.status === 'Lulus' || t.status === 'Selesai Diagih') { statusWarna = '#10b981'; labelStatus = 'Sedia'; }
            else if (t.status === 'Tolak') { statusWarna = '#ef4444'; labelStatus = 'Tidak Diluluskan'; }

            // Padankan info kenderaan berdasarkan ID
            let infoKenderaan = '-';
            if (t.id_kenderaan && senaraiKenderaan) {
                const kenderaan = senaraiKenderaan.find(k => k.id == t.id_kenderaan);
                if (kenderaan) infoKenderaan = `<strong style="color:#0f172a;">${kenderaan.no_plat}</strong><br><small style="color:#64748b;">${kenderaan.model}</small>`;
            }

            html += `<tr>`;
            
            // Kolum Pemandu (Merge sel untuk baris pertama)
            if (index === 0) {
                const stylePemandu = pemandu.includes('Belum Diagih') ? 'color:#ef4444; font-style:italic;' : 'color:#1e293b; font-weight:700;';
                html += `<td rowspan="${jumlahRow}" style="${stylePemandu} vertical-align: top; background: #f8fafc; border-right: 1px solid #e2e8f0; min-width: 150px;">
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        <span style="font-size:18px;">👨‍✈️</span>
                        <span>${pemandu}</span>
                    </div>
                </td>`;
            }

            // Kolum-kolum lain yang telah dipisahkan
            html += `
                <td><strong style="color:#102a43;">${t.tarikh_pergi}</strong><br><small style="color:#64748b;">VMS-${t.id.toString().padStart(4, '0')}</small></td>
                <td>${infoKenderaan}</td>
                <td>${t.destinasi || t.lokasi || '-'}</td>
                <td style="font-weight:600; color:#334155;">${t.masa_bertolak || '-'}</td>
                <td style="font-weight:600; color:#334155;">${t.masa_balik || '-'}</td>
                <td>
                    <div style="font-weight:600; margin-bottom:6px;">${t.nama_pemohon || '-'}</div>
                    <span style="color:${statusWarna}; font-weight:700; background:${statusWarna}15; padding:4px 10px; border-radius:12px; font-size:11px;">${labelStatus}</span>
                </td>
                <td style="text-align:right;">
                    <a class="air-link" onclick="paparButiran(${t.indexAsal})">Butiran ❯</a>
                </td>
            </tr>`;
        });
    }
    
    tbody.innerHTML = html;
}
