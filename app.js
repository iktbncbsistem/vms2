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
    } else {
        // LETAK KOD DI SINI JIKA TIADA SESI (BELUM LOG MASUK)
        document.getElementById('login-section').classList.remove('hidden');
    }
};
async function semakPeranan() {
    const { data, error } = await supabaseClient.from('profil').select('peranan, nama').eq('id', currentUser.id).single();    
    if (data) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('sistem-tab-utama').classList.remove('hidden');
        const headerUtama = document.getElementById('header-utama');
        if(headerUtama) headerUtama.classList.remove('hidden');

        semakJadualAwam('aktif');

        // 1. Sekatan akaun tidak aktif / baharu (Tapis awal-awal)
        if (data.peranan === 'tidak_aktif' || !data.peranan) {
            alert("Akaun anda belum diaktifkan. Sila maklumkan kepada Urusetia untuk pengaktifan peranan.");
            return;
        }


// 2. Semakan peranan lain
        if (data.peranan === 'pemohon') {
            const btnTabMohon = document.getElementById('btnTabMohon');
            const ruangCarian = document.getElementById('ruang-carian-jadual');
            if(btnTabMohon) btnTabMohon.classList.remove('hidden');
            if(ruangCarian) ruangCarian.classList.remove('hidden');
            
            const appNameField = document.getElementById('applicantName');
            if(appNameField) appNameField.value = data.nama;

            // Panggil fungsi tarik data bahagian ke dalam borang
            muatDropdownBahagian();
        }
        else if (data.peranan === 'urusetia') {
            document.getElementById('btnTabUrusetia').classList.remove('hidden');
            
            // Buka akses tab tetapan kepada Urusetia
            const btnTabTetapan = document.getElementById('btnTabTetapan');
            if(btnTabTetapan) btnTabTetapan.classList.remove('hidden');
            
            const btnTabPengguna = document.getElementById('btnTabPengguna');
            if(btnTabPengguna) btnTabPengguna.classList.remove('hidden');
            const btnTabBahagian = document.getElementById('btnTabBahagian');
        if(btnTabBahagian) btnTabBahagian.classList.remove('hidden');
            muatSenaraiUrusetia();
        } 
        else if (data.peranan === 'pelulus') {
            const btnTabPelulus = document.getElementById('btnTabPelulus');
            if(btnTabPelulus) btnTabPelulus.classList.remove('hidden');
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
    const semuaTab = [
        'tab-jadual-awam', 
        'tab-mohon-kenderaan', 
        'dashboard-pemohon', 
        'tab-dashboard-urusetia', 
        'tab-tetapan-urusetia', 
        'tab-tetapan-pengguna', 
        'tab-dashboard-pelulus',
        'tab-tetapan-bahagian'
    ];
    semuaTab.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const semuaButang = ['btnTabJadual', 'btnTabMohon', 'btnTabUrusetia', 'btnTabTetapan', 'btnTabPengguna', 'btnTabPelulus', 'btnTabBahagian'];
    semuaButang.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.style.background = '#f1f5f9';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '600';
            btn.style.borderBottom = '1px solid #cbd5e1';
        }
    });

    let idTabBuka = '';
    let idBtnBuka = '';

    if (tabName === 'jadual') { 
        idTabBuka = 'tab-jadual-awam'; idBtnBuka = 'btnTabJadual'; 
    }
    else if (tabName === 'mohon') {
        idTabBuka = document.getElementById('tab-mohon-kenderaan') ? 'tab-mohon-kenderaan' : 'dashboard-pemohon';
        idBtnBuka = 'btnTabMohon';
        if(typeof muatDraf === 'function') muatDraf(); 
    }
    else if (tabName === 'urusetia') { 
        idTabBuka = 'tab-dashboard-urusetia'; idBtnBuka = 'btnTabUrusetia'; 
        muatSenaraiUrusetia();
    }
    else if (tabName === 'tetapan') { 
        idTabBuka = 'tab-tetapan-urusetia'; idBtnBuka = 'btnTabTetapan'; 
        if(typeof muatTetapan === 'function') muatTetapan();
    }
    else if (tabName === 'pengguna') { 
        idTabBuka = 'tab-tetapan-pengguna'; idBtnBuka = 'btnTabPengguna'; 
        muatSenaraiPengguna();
    }
    else if (tabName === 'pelulus') { 
        idTabBuka = 'tab-dashboard-pelulus'; idBtnBuka = 'btnTabPelulus'; 
    }
else if (tabName === 'bahagian') {
        idTabBuka = 'tab-tetapan-bahagian';
        idBtnBuka = 'btnTabBahagian';
        muatSenaraiBahagian();
    }
    const tabDibuka = document.getElementById(idTabBuka);
    if (tabDibuka) {
        tabDibuka.classList.remove('hidden');
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
window.muatSejarahPemohon = function() { semakJadualAwam('aktif'); };

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

            // Kumpul Data Penumpang (4 lajur)
            const passengers = [];
            document.querySelectorAll('#tblPassengers tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs.length >= 4 && inputs[0].value.trim()) {
                    passengers.push({ nama: inputs[0].value, kp: inputs[1].value, telefon: inputs[2].value, bahagian: inputs[3].value });
                }
            });
            
            // Kumpul Data Peralatan (4 lajur)
            const equipments = [];
            document.querySelectorAll('#tblEquipment tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs.length >= 4 && inputs[0].value.trim()) {
                    equipments.push({ nama: inputs[0].value, kuantiti: inputs[1].value, unit: inputs[2].value, catatan: inputs[3].value });
                }
            });

            // Hantar ke Database
            const { error: insertError } = await supabaseClient.from('tempahan').insert([{
                id_pemohon: currentUser.id,
                nama_pemohon: document.getElementById('applicantName').value,
                no_telefon: document.getElementById('phone').value,
                bahagian: document.getElementById('pilihanBahagian').value,
            tujuan: document.getElementById('tujuanPermohonan').value,
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
            
            // BUANG DRAF BILA DAH BERJAYA HANTAR
            if(currentUser) {
                localStorage.removeItem('vms_draft_' + currentUser.id);
            }
            
            // Kembali ke jadual
            tukarTab('jadual');
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
    if(!div) return;
    div.innerHTML = "Memuatkan data...";

    const { data: tempahan, error } = await supabaseClient.from('tempahan').select('*').in('status', ['Menunggu Semakan', 'Lulus']).order('id', {ascending: false});
    if (error) return div.innerHTML = "Ralat: " + error.message;
    if (!tempahan || tempahan.length === 0) return div.innerHTML = "<p>Tiada permohonan baharu.</p>";

    cacheUrusetia = tempahan; 
    
    // Tarik data Pemandu & Kenderaan secara DINAMIK dari Supabase!
    const { data: kenderaanList } = await supabaseClient.from('kenderaan').select('*');
    const { data: pemanduList } = await supabaseClient.from('pemandu').select('*');

    let html = `<table style="min-width: 900px;"><tr><th>No. Rujukan</th><th>Pemohon & Lokasi</th><th>Tarikh Perjalanan</th><th>Status</th><th>Tindakan Urusetia</th></tr>`;
    
    tempahan.forEach((t, index) => {
        const noRujukan = `VMS-${t.id.toString().padStart(4, '0')}`;

        html += `<tr>
            <td><strong>${noRujukan}</strong></td>
            <td><strong>${t.nama_pemohon}</strong><br><small>${t.destinasi || t.lokasi}</small></td>
            <td>${t.tarikh_pergi}</td>
            <td><strong style="color:var(--primary);">${t.status}</strong></td>
            <td>
                <button class="btn btn-light" onclick="paparButiran(${index})" style="margin-bottom:8px; font-size:12px; width:100%;">🔍 Butiran Penuh</button><br>
        `;

        if (t.status === 'Menunggu Semakan') {
            html += `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <button class="btn btn-primary" onclick="sahkanUrusetia(${t.id})" style="font-size:12px; width:100%;">✅ Sahkan & Hantar Pelulus</button>
                    <button class="btn btn-danger" onclick="updateStatus(${t.id}, 'Tolak')" style="font-size:12px; width:100%;">❌ Tolak (Tidak Lengkap)</button>
                </div>
            `;
        } else if (t.status === 'Lulus') {
            // Dropdown Pemandu (Dinamik)
            html += `
                <select id="pemandu-${t.id}" style="margin-bottom:5px; width:100%; padding:5px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px;">
                    <option value="">-- Pilih Pemandu --</option>`;
            if (pemanduList) {
                pemanduList.forEach(p => {
                    const labelNama = p.kategori === 'Gantian' ? `${p.nama} (Gantian)` : p.nama;
                    html += `<option value="${labelNama}">${labelNama}</option>`;
                });
            }
            
            // Dropdown Kenderaan (Dinamik)
            html += `</select><br>
                <select id="kenderaan-${t.id}" style="margin-bottom:5px; width:100%; padding:5px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px;">
                    <option value="">-- Pilih Kenderaan --</option>`;
            if (kenderaanList) {
               kenderaanList.forEach(k => {
    const labelKategori = k.jenis_kenderaan ? `[${k.jenis_kenderaan}] ` : '';
    html += `<option value="${k.id}">${labelKategori}${k.model} (${k.no_plat})</option>`;
});
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
    const idKenderaan = document.getElementById(`kenderaan-${id}`).value;
    const namaPemandu = document.getElementById(`pemandu-${id}`).value;
    
    if (!idKenderaan || !namaPemandu) {
        alert("Sila pastikan bos telah memilih Pemandu DAN Kenderaan!");
        return;
    }

    const { error } = await supabaseClient.from('tempahan').update({ 
        id_kenderaan: idKenderaan, 
        nama_pemandu: namaPemandu, 
        status: 'Selesai Diagih' 
    }).eq('id', id);

    if (error) {
        alert("Ralat! Pastikan lajur 'nama_pemandu' wujud di Supabase. Ralat: " + error.message);
    } else {
        alert("Mantap bos! Pemandu dan Kenderaan telah berjaya diagihkan."); 
        muatSenaraiUrusetia();
    }
}

/* VMS - PAPARAN BUTIRAN PERMOHONAN KENDERAAN */
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
                                <th>Telefon</th>
                                <th>Bahagian</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${penumpang.map((p, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><strong>${vmsEscape(p.nama)}</strong></td>
                                    <td>${vmsEscape(p.kp)}</td>
                                    <td>${vmsEscape(p.telefon)}</td>
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
        const tabUtama = document.getElementById('sistem-tab-utama'); 

        if (!isiModal || !modal) return;

        isiModal.innerHTML = modalHtml;
        
        if(tabUtama) tabUtama.classList.add('hidden');
        modal.classList.remove('hidden');
        window.scrollTo(0, 0);

        const btnTutup = document.getElementById('btnTutupVms');
        if (btnTutup) {
            btnTutup.innerHTML = '← &nbsp; Kembali ke Senarai';
            btnTutup.style.background = '#1767c2'; 
            
            btnTutup.addEventListener('click', function() {
                modal.classList.add('hidden');
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
        if(currentUser) semakPeranan(); 
    }
}
// ==========================================
// FUNGSI BUTANG TAMBAH PENUMPANG & PERALATAN
// ==========================================

window.kemaskiniBil = function(tableId) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    rows.forEach((row, index) => {
        row.cells[0].innerText = index + 1;
    });
};

const btnAddPassenger = document.getElementById('btnAddPassenger');
if (btnAddPassenger) {
    btnAddPassenger.addEventListener('click', function() {
        const tbody = document.querySelector('#tblPassengers tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center; font-weight:600;"></td>
            <td><input type="text" placeholder="Nama Penuh" class="form-control" name="nama_penumpang[]" oninput="this.value = this.value.toUpperCase();" style="text-transform: uppercase; width: 100%;"></td>
            <td><input type="text" placeholder="No. K/P" class="form-control" name="kp_penumpang[]" maxlength="14" oninput="this.value = this.value.replace(/[^0-9-]/g, '');" style="width: 100%;"></td>
            <td><input type="tel" placeholder="No. Telefon" class="form-control" name="tel_penumpang[]" style="width: 100%;"></td>
            <td><input type="text" placeholder="Bahagian" class="form-control" name="bahagian_penumpang[]" oninput="this.value = this.value.toUpperCase();" style="text-transform: uppercase; width: 100%;"></td>
            <td style="text-align:center;"><button type="button" class="btn-delete" onclick="this.closest('tr').remove(); kemaskiniBil('tblPassengers')" title="Padam">✕</button></td>
        `;
        tbody.appendChild(tr);
        kemaskiniBil('tblPassengers');
    });
}

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
// FUNGSI SIMPAN DRAF (LOCAL STORAGE)
// ==========================================
const btnDraft = document.getElementById('btnDraft');
if (btnDraft) {
    btnDraft.addEventListener('click', function() {
        if (!currentUser) return alert("Sila log masuk dahulu.");

        // Kumpul data input asas
        const draftData = {
            phone: document.getElementById('phone') ? document.getElementById('phone').value : '',
            department: document.getElementById('department') ? document.getElementById('department').value : '',
            purpose: document.getElementById('purpose') ? document.getElementById('purpose').value : '',
            tripDate: document.getElementById('tripDate') ? document.getElementById('tripDate').value : '',
            returnDate: document.getElementById('returnDate') ? document.getElementById('returnDate').value : '',
            departTime: document.getElementById('departTime') ? document.getElementById('departTime').value : '',
            returnTime: document.getElementById('returnTime') ? document.getElementById('returnTime').value : '',
            location: document.getElementById('location') ? document.getElementById('location').value : '',
            tripPurpose: document.getElementById('tripPurpose') ? document.getElementById('tripPurpose').value : '',
            passengerCount: document.getElementById('passengerCount') ? document.getElementById('passengerCount').value : '1'
        };

        const checkedDriver = document.querySelector('input[name="driver"]:checked');
        if (checkedDriver) draftData.driver = checkedDriver.value;

        // Kumpul senarai penumpang
        const passengers = [];
        document.querySelectorAll('#tblPassengers tbody tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length >= 4) {
                passengers.push({ nama: inputs[0].value, kp: inputs[1].value, telefon: inputs[2].value, bahagian: inputs[3].value });
            }
        });
        draftData.passengers = passengers;

        // Kumpul senarai peralatan
        const equipments = [];
        document.querySelectorAll('#tblEquipment tbody tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length >= 4) {
                equipments.push({ nama: inputs[0].value, kuantiti: inputs[1].value, unit: inputs[2].value, catatan: inputs[3].value });
            }
        });
        draftData.equipments = equipments;

        // Simpan ke Local Storage pelayar bos
        localStorage.setItem('vms_draft_' + currentUser.id, JSON.stringify(draftData));
        
        alert("✅ Draf berjaya disimpan!\nAnda boleh sambung isi borang ini pada bila-bila masa (dari peranti ini).\n\nNota: Lampiran surat rasmi perlu dimuat naik semula semasa penghantaran.");
    });
}

// Fungsi Automatik Muat Draf (Dipanggil bila buka tab 'Mohon')
function muatDraf() {
    if (!currentUser) return;
    const saved = localStorage.getItem('vms_draft_' + currentUser.id);
    if (saved) {
        try {
            const draftData = JSON.parse(saved);
            
            if(document.getElementById('phone') && draftData.phone) document.getElementById('phone').value = draftData.phone;
            if(document.getElementById('department') && draftData.department) document.getElementById('department').value = draftData.department;
            if(document.getElementById('purpose') && draftData.purpose) document.getElementById('purpose').value = draftData.purpose;
            if(document.getElementById('tripDate') && draftData.tripDate) document.getElementById('tripDate').value = draftData.tripDate;
            if(document.getElementById('returnDate') && draftData.returnDate) document.getElementById('returnDate').value = draftData.returnDate;
            if(document.getElementById('departTime') && draftData.departTime) document.getElementById('departTime').value = draftData.departTime;
            if(document.getElementById('returnTime') && draftData.returnTime) document.getElementById('returnTime').value = draftData.returnTime;
            if(document.getElementById('location') && draftData.location) document.getElementById('location').value = draftData.location;
            if(document.getElementById('tripPurpose') && draftData.tripPurpose) document.getElementById('tripPurpose').value = draftData.tripPurpose;
            if(document.getElementById('passengerCount') && draftData.passengerCount) document.getElementById('passengerCount').value = draftData.passengerCount;
            
            if (draftData.driver) {
                const radio = document.querySelector(`input[name="driver"][value="${draftData.driver}"]`);
                if (radio) radio.checked = true;
            }

            // Muat semula jadual penumpang
            const tbodyP = document.querySelector('#tblPassengers tbody');
            if (tbodyP && draftData.passengers && draftData.passengers.length > 0) {
                tbodyP.innerHTML = '';
                draftData.passengers.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align:center; font-weight:600;"></td>
                        <td><input type="text" placeholder="Nama Penuh" required value="${p.nama}"></td>
                        <td><input type="text" placeholder="No. K/P" required value="${p.kp}"></td>
                        <td><input type="tel" placeholder="No. Telefon" required value="${p.telefon}"></td>
                        <td><input type="text" placeholder="Bahagian" required value="${p.bahagian}"></td>
                        <td style="text-align:center;"><button type="button" class="btn-delete" onclick="this.closest('tr').remove(); kemaskiniBil('tblPassengers')" title="Padam">✕</button></td>
                    `;
                    tbodyP.appendChild(tr);
                });
                kemaskiniBil('tblPassengers');
            }

            // Muat semula jadual peralatan
            const tbodyE = document.querySelector('#tblEquipment tbody');
            if (tbodyE && draftData.equipments && draftData.equipments.length > 0) {
                tbodyE.innerHTML = '';
                draftData.equipments.forEach(e => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align:center; font-weight:600;"></td>
                        <td><input type="text" placeholder="Nama Peralatan" required value="${e.nama}"></td>
                        <td><input type="number" placeholder="Kuantiti" min="1" required value="${e.kuantiti}"></td>
                        <td><input type="text" placeholder="Unit (Cth: Kotak)" required value="${e.unit}"></td>
                        <td><input type="text" placeholder="Catatan" value="${e.catatan}"></td>
                        <td style="text-align:center;"><button type="button" class="btn-delete" onclick="this.closest('tr').remove(); kemaskiniBil('tblEquipment')" title="Padam">✕</button></td>
                    `;
                    tbodyE.appendChild(tr);
                });
                kemaskiniBil('tblEquipment');
            }
        } catch (e) {
            console.error("Ralat memuatkan draf:", e);
        }
    }
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
    
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px;">Memuatkan rekod... ⏳</td></tr>';
    
    const today = new Date().toISOString().split('T')[0];
    let query = supabaseClient.from('tempahan').select('*').order('tarikh_pergi', {ascending: true});
    
    if (mod === 'sejarah') {
        query = query.lt('tarikh_pergi', today);
    } else if (mod === 'cari' && (tMula || tAkhir)) {
        if (tMula) query = query.gte('tarikh_pergi', tMula);
        if (tAkhir) query = query.lte('tarikh_pergi', tAkhir);
    } else {
        query = query.gte('tarikh_pergi', today);
    }
    
    const { data, error } = await query;
    if (error) { tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center; padding:30px;">Ralat: ${error.message}</td></tr>`; return; }
    
    const { data: senaraiKenderaan } = await supabaseClient.from('kenderaan').select('id, no_plat, model, jenis_kenderaan');

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
    
    const jadualPemandu = {};
    dataDitapis.forEach((t, i) => {
        t.indexAsal = i; 
        const pemandu = t.nama_pemandu || '⏳ Belum Diagih (Menunggu Urusetia)';
        
        if (!jadualPemandu[pemandu]) jadualPemandu[pemandu] = [];
        jadualPemandu[pemandu].push(t);
    });

    let html = '';
    
    for (const pemandu in jadualPemandu) {
        const senaraiTrip = jadualPemandu[pemandu];
        const jumlahRow = senaraiTrip.length;

        senaraiTrip.forEach((t, index) => {
            let statusWarna = '#f59e0b'; 
            let labelStatus = 'Dalam Proses';
            
            if (t.status === 'Lulus' || t.status === 'Selesai Diagih') { statusWarna = '#10b981'; labelStatus = 'Sedia'; }
            else if (t.status === 'Tolak') { statusWarna = '#ef4444'; labelStatus = 'Tidak Diluluskan'; }

            let infoKenderaan = '-';
            if (t.id_kenderaan && senaraiKenderaan) {
                const kenderaan = senaraiKenderaan.find(k => k.id == t.id_kenderaan);
                if (kenderaan) {
                    const badgeKategori = kenderaan.jenis_kenderaan 
                        ? `<span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; display:inline-block; margin-bottom:2px;">${kenderaan.jenis_kenderaan}</span><br>` 
                        : '';
                    infoKenderaan = `
                        ${badgeKategori}
                        <strong>${kenderaan.model || '-'}</strong><br>
                        <small style="color:#475569; font-weight:600;">${kenderaan.no_plat || '-'}</small>
                    `;
                }
            }

            html += `<tr>`;
            
            if (index === 0) {
                const stylePemandu = pemandu.includes('Belum Diagih') ? 'color:#ef4444; font-style:italic;' : 'color:#1e293b; font-weight:700;';
                html += `<td rowspan="${jumlahRow}" style="${stylePemandu} vertical-align: top; background: #f8fafc; border-right: 1px solid #e2e8f0; min-width: 150px;">
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        <span style="font-size:18px;">👨‍✈️</span>
                        <span>${pemandu}</span>
                    </div>
                </td>`;
            }

            const tarikhMohon = t.created_at ? t.created_at.split('T')[0] : '-';
            const noRujukan = `VMS-${t.id.toString().padStart(4, '0')}`;

            html += `
                <td><strong style="color:#102a43;">${tarikhMohon}</strong><br><small style="color:#64748b;">${noRujukan}</small></td>
                <td>${infoKenderaan}</td>
                <td>${t.destinasi || t.lokasi || '-'}</td>
                
                <td>
                    <strong style="color:#334155;">${t.masa_bertolak || '-'}</strong><br>
                    <small style="color:#94a3b8;">${t.tarikh_pergi || '-'}</small>
                </td>
                
                <td>
                    <strong style="color:#334155;">${t.masa_balik || '-'}</strong><br>
                    <small style="color:#94a3b8;">${t.tarikh_balik || '-'}</small>
                </td>
                
                <td>
                    <div style="font-weight:600; margin-bottom:6px;">${t.nama_pemohon || '-'}</div>
                    <span style="color:${statusWarna}; font-weight:700; background:${statusWarna}15; padding:4px 10px; border-radius:12px; font-size:11px;">${labelStatus}</span>
                </td>

                <td style="color:#64748b; font-size:12px; max-width: 150px;">
                    ${t.catatan || t.tujuan || '-'}
                </td>
                
                <td style="text-align:right;">
                    <a class="air-link" onclick="paparButiran(${t.indexAsal})">Butiran ❯</a>
                </td>
            </tr>`;
        });
    }
    
    tbody.innerHTML = html;
}
// ==========================================
// FUNGSI PENGURUSAN TETAPAN (URUSETIA SAHAJA)
// ==========================================
async function muatTetapan() {
    // 1. Muat Pemandu
    const tbodyP = document.getElementById('jadualTetapanPemandu');
    if(tbodyP) tbodyP.innerHTML = '<tr><td colspan="3" style="text-align:center;">Memuatkan...</td></tr>';
    
    const { data: pData } = await supabaseClient.from('pemandu').select('*').order('id', {ascending: true});
    if(tbodyP) {
        if(pData && pData.length > 0) {
            let htmlP = '';
            pData.forEach(p => {
                let badge = p.kategori === 'Gantian' 
                    ? '<span style="background:#fef3c7; color:#d97706; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">Gantian</span>' 
                    : '<span style="background:#f1f5f9; color:#475569; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">Tetap</span>';
                
                htmlP += `<tr>
                            <td><strong>${p.nama}</strong></td>
                            <td>${badge}</td>
                            <td style="text-align:center; white-space:nowrap;">
                                <button type="button" onclick="editPemandu(${p.id}, '${(p.nama || '').replace(/'/g, "\\'")}', '${p.kategori || 'Tetap'}')" title="Kemaskini" style="background:none; border:none; cursor:pointer; font-size:15px; padding:2px 4px; margin:0 3px;">✏️</button>
                                <button type="button" onclick="padamPemandu(${p.id})" title="Padam" style="background:none; border:none; cursor:pointer; font-size:15px; padding:2px 4px; margin:0 3px; color:#ef4444; font-weight:bold;">✕</button>
                            </td>
                          </tr>`;
            });
            tbodyP.innerHTML = htmlP;
        } else {
            tbodyP.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#64748b;">Tiada rekod pemandu.</td></tr>';
        }
    }

    // 2. Muat Kenderaan
    const tbodyK = document.getElementById('jadualTetapanKenderaan');
    if(tbodyK) tbodyK.innerHTML = '<tr><td colspan="4" style="text-align:center;">Memuatkan...</td></tr>';
    
    const { data: kData } = await supabaseClient.from('kenderaan').select('*').order('id', {ascending: true});
    if(tbodyK) {
        if(kData && kData.length > 0) {
            let htmlK = '';
            kData.forEach(k => {
                htmlK += `<tr>
                            <td><strong>${k.jenis_kenderaan || '-'}</strong></td>
                            <td>${k.model}</td>
                            <td><span style="color:#1e293b; font-weight:600;">${k.no_plat}</span></td>
                            <td style="text-align:center; white-space:nowrap;">
                                <button type="button" onclick="editKenderaan(${k.id}, '${(k.jenis_kenderaan || '').replace(/'/g, "\\'")}', '${(k.model || '').replace(/'/g, "\\'")}', '${(k.no_plat || '').replace(/'/g, "\\'")}')" title="Kemaskini" style="background:none; border:none; cursor:pointer; font-size:15px; padding:2px 4px; margin:0 3px;">✏️</button>
                                <button type="button" onclick="padamKenderaan(${k.id})" title="Padam" style="background:none; border:none; cursor:pointer; font-size:15px; padding:2px 4px; margin:0 3px; color:#ef4444; font-weight:bold;">✕</button>
                            </td>
                          </tr>`;
            });
            tbodyK.innerHTML = htmlK;
        } else {
            tbodyK.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b;">Tiada rekod kenderaan.</td></tr>';
        }
    }
}

// ==========================================
// FUNGSI TAMBAH & PADAM
// ==========================================
window.tambahPemandu = async function() {
    const nama = document.getElementById('namaPemanduBaru').value.trim();
    const kategori = document.getElementById('kategoriPemanduBaru').value;
    if(!nama) return alert('Sila masukkan nama pemandu!');
    
    const { error } = await supabaseClient.from('pemandu').insert([{ nama: nama, kategori: kategori }]);
    if(error) alert('Ralat: ' + error.message);
    else { document.getElementById('namaPemanduBaru').value = ''; muatTetapan(); }
};

window.padamPemandu = async function(id) {
    if(!confirm('Adakah anda pasti mahu memadam pemandu ini?')) return;
    const { error } = await supabaseClient.from('pemandu').delete().eq('id', id);
    if(error) alert('Ralat: ' + error.message);
    else muatTetapan();
};

window.tambahKenderaan = async function() {
    const plat = document.getElementById('platKenderaanBaru').value.trim();
    const model = document.getElementById('modelKenderaanBaru').value.trim();
    const jenis = document.getElementById('jenisKenderaanBaru').value.trim();

    if(!plat || !model || !jenis) return alert('Sila masukkan Kategori, Keluaran, dan No. Plat!');
    
    const { error } = await supabaseClient.from('kenderaan').insert([{ no_plat: plat, model: model, jenis_kenderaan: jenis }]);
    if(error) alert('Ralat: ' + error.message);
    else { 
        document.getElementById('platKenderaanBaru').value = ''; 
        document.getElementById('modelKenderaanBaru').value = ''; 
        document.getElementById('jenisKenderaanBaru').value = ''; 
        muatTetapan(); 
    }
};

window.padamKenderaan = async function(id) {
    if(!confirm('Adakah anda pasti mahu memadam kenderaan ini?')) return;
    const { error } = await supabaseClient.from('kenderaan').delete().eq('id', id);
    if(error) alert('Ralat: ' + error.message);
    else muatTetapan();
};

// ==========================================
// FUNGSI KEMASKINI (EDIT)
// ==========================================
window.editPemandu = async function(id, namaAsal, kategoriAsal) {
    const namaBaru = prompt("Kemaskini Nama Pemandu:", namaAsal);
    if (namaBaru === null) return;
    if (!namaBaru.trim()) return alert("Nama tidak boleh kosong!");

    const kategoriBaru = prompt("Kemaskini Kategori (Taip: Tetap atau Gantian):", kategoriAsal || 'Tetap');
    if (kategoriBaru === null) return;

    const { error } = await supabaseClient
        .from('pemandu')
        .update({ nama: namaBaru.trim(), kategori: kategoriBaru.trim() })
        .eq('id', id);

    if (error) alert("Ralat: " + error.message);
    else muatTetapan();
};

window.editKenderaan = async function(id, jenisAsal, modelAsal, platAsal) {
    const jenisBaru = prompt("Kemaskini Kategori Kenderaan (Cth: Bas, Van, Kereta, SUV):", jenisAsal || '');
    if (jenisBaru === null) return;
    if (!jenisBaru.trim()) return alert("Kategori tidak boleh kosong!");

    const modelBaru = prompt("Kemaskini Keluaran / Model (Cth: Scania, Hiace):", modelAsal || '');
    if (modelBaru === null) return;
    if (!modelBaru.trim()) return alert("Keluaran tidak boleh kosong!");

    const platBaru = prompt("Kemaskini No. Plat:", platAsal || '');
    if (platBaru === null) return;
    if (!platBaru.trim()) return alert("No. Plat tidak boleh kosong!");

    const { error } = await supabaseClient
        .from('kenderaan')
        .update({ 
            jenis_kenderaan: jenisBaru.trim(), 
            model: modelBaru.trim(), 
            no_plat: platBaru.trim() 
        })
        .eq('id', id);

    if (error) alert("Ralat: " + error.message);
    else muatTetapan();
};
function formatMasaLogin(tarikh) {
    if (!tarikh) return '<span style="color: #94a3b8; font-style: italic; font-size: 12px;">Belum log masuk</span>';
    const d = new Date(tarikh);
    return d.toLocaleString('ms-MY', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
    });
}
// ==========================================
// FUNGSI PENGURUSAN PENGGUNA (URUSETIA SAHAJA)
// ==========================================
async function muatSenaraiPengguna() {
    const tbody = document.getElementById('jadualTetapanPengguna');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 25px;">Memuatkan senarai pengguna... ⏳</td></tr>';

    const { data: users, error } = await supabaseClient
        .from('profil')
        .select('*')
        .order('nama', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red; padding: 20px;">Ralat: ${error.message}</td></tr>`;
        return;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">Tiada rekod pengguna dijumpai.</td></tr>';
        return;
    }

    let html = '';
    users.forEach((u, i) => {
        const perananSemasa = u.peranan || 'tidak_aktif';

        // Lencana status peranan
        let badge = '<span style="background:#fee2e2; color:#b91c1c; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">Akaun Tidak Aktif</span>';
        if (perananSemasa === 'pemohon') {
            badge = '<span style="background:#dbeafe; color:#1d4ed8; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">Pemohon</span>';
        } else if (perananSemasa === 'urusetia') {
            badge = '<span style="background:#ffedd5; color:#c2410c; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">Urusetia</span>';
        } else if (perananSemasa === 'pelulus') {
            badge = '<span style="background:#dcfce7; color:#15803d; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">Pelulus</span>';
        }

        html += `
            <tr>
                <td style="text-align: center; font-weight: 600;">${i + 1}</td>
                <td><strong>${u.nama || '-'}</strong></td>
               <td style="color: #64748b; font-size: 13px;">${u.email || u.emel || '-'}</td>
                <td style="color: #64748b; font-size: 13px;">${formatMasaLogin(u.last_sign_in_at || u.log_terakhir)}</td>
                <td>${badge}</td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        <select id="select-role-${u.id}" style="width: 130px; padding: 6px 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            <option value="tidak_aktif" ${perananSemasa === 'tidak_aktif' ? 'selected' : ''}>Akaun Tidak Aktif</option>
                            <option value="pemohon" ${perananSemasa === 'pemohon' ? 'selected' : ''}>Pemohon</option>
                            <option value="urusetia" ${perananSemasa === 'urusetia' ? 'selected' : ''}>Urusetia</option>
                            <option value="pelulus" ${perananSemasa === 'pelulus' ? 'selected' : ''}>Pelulus</option>
                        </select>
                        <button class="btn btn-primary" onclick="simpanPerananUser('${u.id}')" style="padding: 6px 14px; font-size: 12px;">Simpan</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

window.simpanPerananUser = async function(userId) {
    const selectElem = document.getElementById(`select-role-${userId}`);
    if (!selectElem) return;
    const perananBaru = selectElem.value;

    const { error } = await supabaseClient
        .from('profil')
        .update({ peranan: perananBaru })
        .eq('id', userId);

    if (error) {
        alert("Ralat mengemaskini peranan: " + error.message);
    } else {
        alert("Peranan pengguna berjaya dikemaskini!");
        muatSenaraiPengguna();
    }
};

// ==========================================
// FUNGSI SEMAK TUJUAN LAIN-LAIN
// ==========================================
window.semakTujuanLain = function(nilai) {
    const inputLain = document.getElementById('inputTujuanLain');
    if (nilai === 'Lain-lain') {
        inputLain.classList.remove('hidden');
        inputLain.focus();
    } else {
        inputLain.classList.add('hidden');
        inputLain.value = ''; // Kosongkan semula jika batal pilih
    }
};

// ==========================================
// FUNGSI PENGURUSAN BAHAGIAN (BERASASKAN ID)
// ==========================================
async function muatSenaraiBahagian() {
    const tbody = document.getElementById('jadualTetapanBahagian');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 25px;">Memuatkan senarai bahagian... ⏳</td></tr>';

    const { data: bahagianData, error } = await supabaseClient
        .from('bahagian')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red; padding: 20px;">Ralat: ${error.message}</td></tr>`;
        return;
    }

    if (!bahagianData || bahagianData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">Tiada rekod bahagian dijumpai. Sila klik butang + Tambah Bahagian.</td></tr>';
        return;
    }

    let html = '';
    bahagianData.forEach((b, i) => {
        html += `
            <tr>
                <td style="text-align: center; font-weight: 600;">${i + 1}</td>
                <td><strong>${b.nama_bahagian}</strong></td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 15px; justify-content: center; align-items: center;">
                        <button onclick="editBahagian('${b.id}', '${b.nama_bahagian}')" style="background: transparent; border: none; cursor: pointer; font-size: 18px; padding: 0; transition: transform 0.2s;" title="Kemaskini" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">✏️</button>
                        <button onclick="padamBahagian('${b.id}')" style="background: transparent; border: none; cursor: pointer; font-size: 18px; padding: 0; transition: transform 0.2s;" title="Padam" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">❌</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

window.editBahagian = async function(id, namaLama) {
    const namaBaru = prompt("Kemaskini nama Bahagian / Cawangan:", namaLama);
    if (!namaBaru || namaBaru.trim() === "" || namaBaru.trim() === namaLama) return;

    const { error } = await supabaseClient
        .from('bahagian')
        .update({ nama_bahagian: namaBaru.trim() })
        .eq('id', id);

    if (error) {
        alert("Ralat mengemaskini bahagian: " + error.message);
    } else {
        muatSenaraiBahagian();
        if (typeof muatDropdownBahagian === 'function') muatDropdownBahagian();
    }
};

window.padamBahagian = async function(id) {
    if (!confirm("Adakah anda pasti mahu memadam bahagian ini?")) return;

    const { error } = await supabaseClient
        .from('bahagian')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Ralat memadam bahagian: " + error.message);
    } else {
        muatSenaraiBahagian();
        if (typeof muatDropdownBahagian === 'function') muatDropdownBahagian();
    }
};
window.tambahBahagian = async function() {
    const namaBaharu = prompt("Masukkan nama Bahagian / Cawangan baharu:");
    
    // Jika pengguna tekan cancel atau biarkan kosong
    if (!namaBaharu || namaBaharu.trim() === "") return; 

    const { error } = await supabaseClient
        .from('bahagian')
        .insert([{ nama_bahagian: namaBaharu.trim() }]);

    if (error) {
        alert("Ralat menambah bahagian: " + error.message);
    } else {
        muatSenaraiBahagian(); // Refresh jadual terus
        if (typeof muatDropdownBahagian === 'function') muatDropdownBahagian(); // Refresh dropdown borang
    }
};

// ==========================================
// FUNGSI MUAT DROPDOWN BORANG PEMOHON
// ==========================================
async function muatDropdownBahagian() {
    const dropdown = document.getElementById('pilihanBahagian');
    if (!dropdown) return;

    // Tarik senarai bahagian dari Supabase
    const { data, error } = await supabaseClient
        .from('bahagian')
        .select('nama_bahagian')
        .order('nama_bahagian', { ascending: true });

    if (error) {
        console.error("Ralat memuatkan dropdown bahagian:", error.message);
        return;
    }

    // Kosongkan dan letak pilihan lalai (default)
    dropdown.innerHTML = '<option value="">Sila pilih bahagian / cawangan</option>';

    // Masukkan data dari pangkalan data ke dalam dropdown
    if (data && data.length > 0) {
        data.forEach(b => {
            dropdown.innerHTML += `<option value="${b.nama_bahagian}">${b.nama_bahagian}</option>`;
        });
    }
}
function formatMasaLogin(tarikh) {
    if (!tarikh) return '<span style="color: #94a3b8; font-style: italic; font-size: 12px;">Belum log masuk</span>';
    const d = new Date(tarikh);
    return d.toLocaleString('ms-MY', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
    });
}
