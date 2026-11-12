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
        document.getElementById('skrin-login').classList.remove('hidden');
    }
};

async function semakPeranan() {
    try {
        // 1. Semak profil pengguna dalam pangkalan data
        let { data, error } = await supabaseClient.from('profil').select('peranan, nama').eq('id', currentUser.id).single();    
        
        // 2. Jika profil TIADA (pengguna baharu), daftar secara automatik!
        if (!data) {
            const { error: insertErr } = await supabaseClient.from('profil').insert([{
                id: currentUser.id,
                email: currentUser.email,
                nama: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
                peranan: 'pemohon',
                log_terakhir: new Date().toISOString()
            }]);

            // Jika Supabase menghalang pendaftaran (Isu RLS)
            if (insertErr) {
                console.error("Ralat pendaftaran automatik:", insertErr);
                alert("Gagal mendaftar! Sila pastikan sistem RLS (Row Level Security) di Supabase untuk jadual 'profil' telah dimatikan (Disable RLS) atau dibenarkan fungsi INSERT.");
                return;
            }
            
            // Tetapkan data lalai sementara
            data = { peranan: 'pemohon', nama: currentUser.user_metadata?.full_name || currentUser.email };
        } else {
            // Jika profil wujud, kemas kini masa log masuk
            await supabaseClient.from('profil').update({
                email: currentUser.email,
                log_terakhir: new Date().toISOString()
            }).eq('id', currentUser.id);
        }

        // 3. Paparan UI selepas disahkan berjaya
        document.getElementById('skrin-login').classList.add('hidden');
        document.getElementById('sistem-tab-utama').classList.remove('hidden');
        const headerUtama = document.getElementById('header-utama');
        if (headerUtama) headerUtama.classList.remove('hidden');

        if (typeof semakJadualAwam === 'function') semakJadualAwam('aktif');

      
        // 4. Buka tab mengikut peranan
        if (data.peranan === 'pemohon') {
            const btnTabMohon = document.getElementById('btnTabMohon');
            const ruangCarian = document.getElementById('ruang-carian-jadual');
            if (btnTabMohon) btnTabMohon.classList.remove('hidden');
            if (ruangCarian) ruangCarian.classList.remove('hidden');
            
            const appNameField = document.getElementById('applicantName');
            if (appNameField) appNameField.value = data.nama;

            if (typeof muatDropdownBahagian === 'function') muatDropdownBahagian();
        }
        else if (data.peranan === 'urusetia') {
            document.getElementById('btnTabUrusetia').classList.remove('hidden');
            const btnTabTetapan = document.getElementById('btnTabTetapan');
            if (btnTabTetapan) btnTabTetapan.classList.remove('hidden');
            const btnTabPengguna = document.getElementById('btnTabPengguna');
            if (btnTabPengguna) btnTabPengguna.classList.remove('hidden');
            const btnTabBahagian = document.getElementById('btnTabBahagian');
            if (btnTabBahagian) btnTabBahagian.classList.remove('hidden');
            if (typeof muatSenaraiUrusetia === 'function') muatSenaraiUrusetia();
        } 
        else if (data.peranan === 'pelulus') {
            const btnTabPelulus = document.getElementById('btnTabPelulus');
            if (btnTabPelulus) btnTabPelulus.classList.remove('hidden');
            if (typeof muatSenaraiPelulus === 'function') muatSenaraiPelulus();
        }
    } catch (err) {
        console.error("Ralat semak peranan:", err);
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
            // Upload Fail Surat Arahan Rasmi
            let fileUpload = document.getElementById('fileUpload').files[0];
            let fileUrl = null;
            if (fileUpload) {
                fileUpload = await mampatkanGambar(fileUpload);
                const fileName = `surat_${Date.now()}_${Math.floor(Math.random()*1000)}.${fileUpload.name.split('.').pop()}`;
                const { error: uploadError } = await supabaseClient.storage.from('dokumen_sokongan').upload(fileName, fileUpload);
                if (uploadError) throw uploadError;
                fileUrl = supabaseClient.storage.from('dokumen_sokongan').getPublicUrl(fileName).data.publicUrl;
            }

            // Upload Fail Senarai Penumpang (Jika Ada)
            let failPenumpang = document.getElementById('failSenaraiPenumpang') ? document.getElementById('failSenaraiPenumpang').files[0] : null;
            let filePenumpangUrl = null;
            if (failPenumpang) {
                failPenumpang = await mampatkanGambar(failPenumpang);
                const fName = `penumpang_${Date.now()}_${Math.floor(Math.random()*1000)}.${failPenumpang.name.split('.').pop()}`;
                const { error: upErr } = await supabaseClient.storage.from('dokumen_sokongan').upload(fName, failPenumpang);
                if (upErr) throw upErr;
                filePenumpangUrl = supabaseClient.storage.from('dokumen_sokongan').getPublicUrl(fName).data.publicUrl;
            }

            // Upload Fail Senarai Peralatan (Jika Ada)
            let failPeralatan = document.getElementById('failSenaraiPeralatan') ? document.getElementById('failSenaraiPeralatan').files[0] : null;
            let filePeralatanUrl = null;
            if (failPeralatan) {
                failPeralatan = await mampatkanGambar(failPeralatan);
                const fName = `peralatan_${Date.now()}_${Math.floor(Math.random()*1000)}.${failPeralatan.name.split('.').pop()}`;
                const { error: upErr } = await supabaseClient.storage.from('dokumen_sokongan').upload(fName, failPeralatan);
                if (upErr) throw upErr;
                filePeralatanUrl = supabaseClient.storage.from('dokumen_sokongan').getPublicUrl(fName).data.publicUrl;
            }

            // Kumpul Data Penumpang (Jadual)
            const passengers = [];
            document.querySelectorAll('#tblPassengers tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs.length >= 4 && inputs[0].value.trim()) {
                    passengers.push({ nama: inputs[0].value, kp: inputs[1].value, telefon: inputs[2].value, bahagian: inputs[3].value });
                }
            });
            
            // Kumpul Data Peralatan (Jadual)
            const equipments = [];
            document.querySelectorAll('#tblEquipment tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs.length >= 4 && inputs[0].value.trim()) {
                    equipments.push({ nama: inputs[0].value, kuantiti: inputs[1].value, unit: inputs[2].value, catatan: inputs[3].value });
                }
            });

            // Hantar semua data ke Database Supabase
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
                fail_penumpang: filePenumpangUrl, // Link upload penumpang
                fail_peralatan: filePeralatanUrl, // Link upload peralatan
                senarai_penumpang: passengers,
                senarai_peralatan: equipments,
                status: 'Menunggu Semakan'
            }]);

            if (insertError) throw insertError;
            alert("Permohonan berjaya dihantar!");
            vehicleForm.reset();
            
            if(currentUser) localStorage.removeItem('vms_draft_' + currentUser.id);
            
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
    div.innerHTML = "<p style='padding: 20px; color:#64748b; text-align:center;'>Memuatkan data... ⏳</p>";

    // 1. Tarik permohonan yang perlu tindakan (Menunggu Semakan & Lulus)
    const { data: tempahan, error } = await supabaseClient.from('tempahan').select('*').in('status', ['Menunggu Semakan', 'Lulus']).order('id', {ascending: false});
    if (error) return div.innerHTML = "Ralat: " + error.message;
    if (!tempahan || tempahan.length === 0) return div.innerHTML = "<p style='padding: 20px; color:#64748b; text-align:center;'>Tiada permohonan baharu.</p>";

    cacheUrusetia = tempahan; 
    
    // 2. Tarik data Pemandu & Kenderaan
    const { data: kenderaanList } = await supabaseClient.from('kenderaan').select('*');
    const { data: pemanduList } = await supabaseClient.from('pemandu').select('*');

    // 3. Tarik senarai TUGASAN AKTIF (Selesai Diagih) untuk sistem semak pertindihan (clash)
    const { data: tugasanAktif } = await supabaseClient.from('tempahan')
        .select('nama_pemandu, id_kenderaan, tarikh_pergi, masa_bertolak, tarikh_balik, masa_balik')
        .eq('status', 'Selesai Diagih');

    let html = `<table class="sistem-table" style="min-width: 900px; width: 100%;">
        <thead>
            <tr><th>No. Rujukan</th><th>Pemohon & Lokasi</th><th>Tarikh Perjalanan</th><th>Status</th><th>Tindakan Urusetia</th></tr>
        </thead>
        <tbody>`;
    
    tempahan.forEach((t, index) => {
        const noRujukan = `VMS-${t.id.toString().padStart(4, '0')}`;

        // Sistem kira masa permohonan INI untuk dibandingkan
        const semasaMula = new Date(`${t.tarikh_pergi}T${t.masa_bertolak || '00:00:00'}`);
        const semasaTamat = new Date(`${t.tarikh_balik}T${t.masa_balik || '23:59:00'}`);

        html += `<tr>
            <td><strong>${noRujukan}</strong></td>
            <td><strong>${t.nama_pemohon}</strong><br><small>${t.destinasi || t.lokasi}</small></td>
            <td>
                <strong style="color:#334155;">${t.tarikh_pergi}</strong><br>
                <small>${t.masa_bertolak || '-'}</small>
            </td>
            <td><span style="background:#fef3c7; color:#d97706; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700;">${t.status}</span></td>
            <td style="text-align:center;">
                <button class="btn btn-light" onclick="paparButiran(${index})" style="margin-bottom:8px; font-size:12px; width:100%;">🔍 Butiran Penuh</button><br>
        `;

        if (t.status === 'Menunggu Semakan') {
            html += `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <button class="btn btn-primary" onclick="sahkanUrusetia(${t.id})" style="font-size:12px; width:100%;">✅ Sahkan & Hantar</button>
                    <button class="btn btn-danger" onclick="updateStatus(${t.id}, 'Tolak')" style="font-size:12px; width:100%;">❌ Tolak (Tidak Lengkap)</button>
                </div>
            `;
        } else if (t.status === 'Lulus') {
            
            // ==========================================
            // DROPDOWN PEMANDU (AUTO-FILTER)
            // ==========================================
            html += `<select id="pemandu-${t.id}" style="margin-bottom:5px; width:100%; padding:5px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px;">
                    <option value="">-- Pilih Pemandu --</option>`;
            if (pemanduList) {
                pemanduList.forEach(p => {
                    let clash = false;
                    if (tugasanAktif) {
                        for (let rekod of tugasanAktif) {
                            if (rekod.nama_pemandu === p.nama) {
                                const rekodMula = new Date(`${rekod.tarikh_pergi}T${rekod.masa_bertolak || '00:00:00'}`);
                                const rekodTamat = new Date(`${rekod.tarikh_balik}T${rekod.masa_balik || '23:59:00'}`);
                                if (semasaMula < rekodTamat && semasaTamat > rekodMula) { clash = true; break; }
                            }
                        }
                    }
                    const labelNama = p.kategori === 'Gantian' ? `${p.nama} (Gantian)` : p.nama;
                    if (clash) {
                        html += `<option value="${labelNama}" disabled style="color:#ef4444; background:#fee2e2;">⛔ ${labelNama} (Sedang Bertugas)</option>`;
                    } else {
                        html += `<option value="${labelNama}">${labelNama}</option>`;
                    }
                });
            }
            
            // ==========================================
            // DROPDOWN KENDERAAN (AUTO-FILTER)
            // ==========================================
            html += `</select><br>
                <select id="kenderaan-${t.id}" style="margin-bottom:5px; width:100%; padding:5px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px;">
                    <option value="">-- Pilih Kenderaan --</option>`;
            if (kenderaanList) {
               kenderaanList.forEach(k => {
                    let clash = false;
                    if (tugasanAktif) {
                        for (let rekod of tugasanAktif) {
                            if (rekod.id_kenderaan == k.id) {
                                const rekodMula = new Date(`${rekod.tarikh_pergi}T${rekod.masa_bertolak || '00:00:00'}`);
                                const rekodTamat = new Date(`${rekod.tarikh_balik}T${rekod.masa_balik || '23:59:00'}`);
                                if (semasaMula < rekodTamat && semasaTamat > rekodMula) { clash = true; break; }
                            }
                        }
                    }
                    const labelKategori = k.jenis_kenderaan ? `[${k.jenis_kenderaan}] ` : '';
                    if (clash) {
                        html += `<option value="${k.id}" disabled style="color:#ef4444; background:#fee2e2;">⛔ ${labelKategori}${k.model} (${k.no_plat}) (Telah Ditempah)</option>`;
                    } else {
                        html += `<option value="${k.id}">${labelKategori}${k.model} (${k.no_plat})</option>`;
                    }
                });
            }
            html += `</select><br>
                <button class="btn btn-success" onclick="agihKenderaan(${t.id})" style="font-size:12px; width:100%;">Sahkan Agihan</button>`;
        }
        html += `</td></tr>`;
    });
    div.innerHTML = html + `</tbody></table>`;
}
// ==========================================
// FUNGSI PENGESAHAN URUSETIA (BAHAGIAN B)
// ==========================================
async function sahkanUrusetia(id) {
    if(!confirm("Adakah anda pasti borang ini lengkap dan terdapat kenderaan/pemandu yang tersedia pada tarikh tersebut?")) return;
    const { error } = await supabaseClient.from('tempahan').update({ status: 'Menunggu Kelulusan' }).eq('id', id);
    if(error) alert("Ralat: " + error.message);
    else { alert("Pengesahan berjaya! Permohonan telah dihantar kepada Pelulus."); muatSenaraiUrusetia(); }
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

    document.body.style.cursor = 'wait'; 

    try {
        const t = (typeof cacheUrusetia !== 'undefined') ? cacheUrusetia.find(x => x.id === id) : null;
        if (!t) throw new Error("Maklumat tempahan tidak dijumpai dalam memori.");

        const semasaMula = new Date(`${t.tarikh_pergi}T${t.masa_bertolak || '00:00:00'}`);
        const semasaTamat = new Date(`${t.tarikh_balik}T${t.masa_balik || '23:59:00'}`);

        // Semak pertindihan masa bagi Kenderaan/Pemandu yang sama
        const { data: semakan, error: ralatSemakan } = await supabaseClient
            .from('tempahan')
            .select('id, nama_pemandu, id_kenderaan, tarikh_pergi, masa_bertolak, tarikh_balik, masa_balik')
            .eq('status', 'Selesai Diagih')
            .neq('id', id) 
            .or(`id_kenderaan.eq.${idKenderaan},nama_pemandu.eq.${namaPemandu}`); 

        if (ralatSemakan) throw ralatSemakan;

        if (semakan && semakan.length > 0) {
            for (let rekod of semakan) {
                const rekodMula = new Date(`${rekod.tarikh_pergi}T${rekod.masa_bertolak || '00:00:00'}`);
                const rekodTamat = new Date(`${rekod.tarikh_balik}T${rekod.masa_balik || '23:59:00'}`);

                if (semasaMula < rekodTamat && semasaTamat > rekodMula) {
                    let mesejBentrokan = rekod.nama_pemandu === namaPemandu 
                        ? `👨‍✈️ Pemandu (${namaPemandu}) sedang bertugas.` 
                        : `🚘 Kenderaan tersebut sedang digunakan.`;
                    
                    alert(`🛑 AGIHAN DITOLAK!\n\n${mesejBentrokan}\nSistem mendapati ia telah dijadualkan untuk tugasan lain dari:\n\n🗓️ ${rekod.tarikh_pergi} (${rekod.masa_bertolak})\nhingga\n🗓️ ${rekod.tarikh_balik} (${rekod.masa_balik})\n\nSila pilih pemandu / kenderaan yang lain.`);
                    
                    document.body.style.cursor = 'default';
                    return; 
                }
            }
        }

        const { error } = await supabaseClient.from('tempahan').update({ 
            id_kenderaan: idKenderaan, 
            nama_pemandu: namaPemandu, 
            status: 'Selesai Diagih' 
        }).eq('id', id);

        if (error) throw error;
        
        alert("✅ Mantap bos! Pemandu dan Kenderaan telah berjaya diagihkan."); 
        muatSenaraiUrusetia();
        
    } catch (error) {
        alert("Ralat sistem: " + error.message);
    }
    
    document.body.style.cursor = 'default';
}

/* VMS - PAPARAN BUTIRAN FORMAT BORANG FIZIKAL RASMI */
(function () {
    'use strict';

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

    window.paparButiran = function (index) {
        const sumberCache = (typeof cacheUrusetia !== 'undefined') ? cacheUrusetia : window.cacheUrusetia;
        const t = sumberCache && sumberCache[index];

        if (!t) {
            alert('Rekod permohonan tidak dijumpai.');
            return;
        }
       
        const noRujukan = 'VMS-' + String(t.id ?? Number(index) + 1).padStart(4, '0');       
        const tarikhDihantar = t.created_at ? new Date(t.created_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

        // Senarai Penumpang Table
        const penumpang = Array.isArray(t.senarai_penumpang) ? t.senarai_penumpang : [];
        let rowsPenumpang = '';
        if (penumpang.length > 0) {
            rowsPenumpang = penumpang.map((p, i) => `
                <tr>
                    <td style="text-align:center; width: 40px;">${i + 1}</td>
                    <td><strong>${vmsEscape(p.nama)}</strong></td>
                    <td style="text-align:center;">${vmsEscape(p.kp)}</td>
                    <td style="text-align:center;">${vmsEscape(p.telefon)}</td>
                    <td>${vmsEscape(p.bahagian)}</td>
                </tr>
            `).join('');
        } else {
            rowsPenumpang = `<tr><td colspan="5" style="text-align:center; color:#64748b; font-style:italic; padding:10px;">Tiada penumpang berdaftar (atau butiran dalam lampiran).</td></tr>`;
        }

        // Senarai Peralatan Table
        const alatan = Array.isArray(t.senarai_peralatan) ? t.senarai_peralatan : [];
        let rowsAlatan = '';
        if (alatan.length > 0) {
            rowsAlatan = alatan.map((a, i) => `
                <tr>
                    <td style="text-align:center; width: 40px;">${i + 1}</td>
                    <td><strong>${vmsEscape(a.nama)}</strong></td>
                    <td style="text-align:center;">${vmsEscape(a.kuantiti)}</td>
                    <td style="text-align:center;">${vmsEscape(a.unit)}</td>
                    <td>${vmsEscape(a.catatan)}</td>
                </tr>
            `).join('');
        } else {
            rowsAlatan = `<tr><td colspan="5" style="text-align:center; color:#64748b; font-style:italic; padding:8px;">Tiada peralatan dibawa.</td></tr>`;
        }

        // Pautan Dokumen Surat
        const failSuratHtml = t.fail_surat 
            ? `<a href="${vmsEscape(t.fail_surat)}" target="_blank" style="color:#0284c7; font-weight:700; text-decoration:underline;">📎 Buka Dokumen Lampiran (Surat Arahan)</a>`
            : `<span style="color:#94a3b8; font-style:italic;">Tiada lampiran</span>`;

        // Lencana Status
        let statusBadgeColor = '#f59e0b';
        if (t.status === 'Lulus' || t.status === 'Selesai Diagih') statusBadgeColor = '#10b981';
        else if (t.status === 'Tolak') statusBadgeColor = '#ef4444';

        const modalHtml = `
            <div class="vms-sheet-container">
                <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
                    
                    <div class="sheet-actions-bar no-print">
                        <button type="button" id="btnTutupVms" class="btn btn-outline" style="background:#fff; color:#0f172a; font-weight:600;">
                            ← Kembali ke Jadual
                        </button>
                        <div style="display:flex; gap:10px;">
                            <button type="button" onclick="window.print()" class="btn btn-primary" style="background:#0284c7; color:#fff;">
                                🖨️ Cetak / Simpan PDF
                            </button>
                        </div>
                    </div>

                    <div class="vms-sheet">
                        <!-- HEADER BORANG RASMI -->
                        <div class="sheet-header">
                            <img src="https://eazdfwzifcsfayapyshv.supabase.co/storage/v1/object/public/image/logo.png" alt="Logo" class="sheet-logo">
                            <div class="sheet-header-text">
                                <h2>Institut Kemahiran Tinggi Belia Negara Chembong</h2>
                                <p style="font-weight:600; text-transform:uppercase;">Borang Permohonan Penggunaan Kenderaan Rasmi Jabatan</p>
                                <p style="font-size:11px; color:#64748b;">Kementerian Belia dan Sukan Malaysia</p>
                            </div>
                            <div class="sheet-doc-badge">
                                No. Rujukan:
                                <strong>${vmsEscape(noRujukan)}</strong>
                                <span style="display:block; margin-top:4px;">Tarikh: ${tarikhDihantar}</span>
                            </div>
                        </div>

                        <!-- BAHAGIAN 1: MAKLUMAT PEMOHON -->
                        <div class="sheet-section-title">Bahagian 1: Maklumat Pemohon</div>
                        <table class="sheet-table-info">
                            <tr>
                                <td class="label-cell">Nama Penuh Pemohon</td>
                                <td class="val-cell"><strong>${vmsEscape(t.nama_pemohon)}</strong></td>
                                <td class="label-cell">No. Telefon</td>
                                <td class="val-cell">${vmsEscape(t.no_telefon)}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Bahagian / Cawangan</td>
                                <td class="val-cell">${vmsEscape(t.bahagian)}</td>
                                <td class="label-cell">Tujuan Permohonan</td>
                                <td class="val-cell">${vmsEscape(t.tujuan)}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Dokumen Sokongan</td>
                                <td class="val-cell" colspan="3">${failSuratHtml}</td>
                            </tr>
                        </table>

                        <!-- BAHAGIAN 2: MAKLUMAT PERJALANAN -->
                        <div class="sheet-section-title">Bahagian 2: Butiran Perjalanan & Lokasi</div>
                        <table class="sheet-table-info">
                            <tr>
                                <td class="label-cell">Destinasi / Lokasi</td>
                                <td class="val-cell" colspan="3"><strong>${vmsEscape(t.destinasi || t.lokasi)}</strong></td>
                            </tr>
                            <tr>
                                <td class="label-cell">Tarikh Bertolak</td>
                                <td class="val-cell">${vmsEscape(t.tarikh_pergi)}</td>
                                <td class="label-cell">Masa Bertolak</td>
                                <td class="val-cell">${vmsEscape(t.masa_bertolak)}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Tarikh Pulang</td>
                                <td class="val-cell">${vmsEscape(t.tarikh_balik)}</td>
                                <td class="label-cell">Masa Pulang</td>
                                <td class="val-cell">${vmsEscape(t.masa_balik)}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Keperluan Pemandu</td>
                                <td class="val-cell">${vmsEscape(t.keperluan_pemandu || 'Tunggu / Mengikut Urusan')}</td>
                                <td class="label-cell">Catatan Permohonan</td>
                                <td class="val-cell">${vmsEscape(t.catatan || '-')}</td>
                            </tr>
                        </table>

                       <!-- BAHAGIAN 3: SENARAI PENUMPANG -->
                        <div class="sheet-section-title">Bahagian 3: Senarai Penumpang (${penumpang.length} Orang)</div>
                        <table class="sheet-data-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px; text-align:center;">Bil</th>
                                    <th>Nama Penuh</th>
                                    <th style="text-align:center;">No. Kad Pengenalan</th>
                                    <th style="text-align:center;">No. Telefon</th>
                                    <th>Bahagian / Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsPenumpang}
                            </tbody>
                        </table>
                        ${t.fail_penumpang ? `<div style="padding: 8px 10px; background: #f8fafc; border: 1px solid #94a3b8; border-top: none; font-size: 12px;"><a href="${vmsEscape(t.fail_penumpang)}" target="_blank" style="color:#0284c7; font-weight:700; text-decoration:underline;">📎 Klik di sini untuk membuka Dokumen Lampiran Senarai Penumpang</a></div>` : ''}

                        <!-- BAHAGIAN 4: SENARAI PERALATAN -->
                        <div class="sheet-section-title">Bahagian 4: Peralatan / Kelengkapan Dibawa</div>
                        <table class="sheet-data-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px; text-align:center;">Bil</th>
                                    <th>Nama Peralatan</th>
                                    <th style="text-align:center; width:80px;">Kuantiti</th>
                                    <th style="text-align:center; width:80px;">Unit</th>
                                    <th>Catatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsAlatan}
                            </tbody>
                        </table>
                        ${t.fail_peralatan ? `<div style="padding: 8px 10px; background: #f8fafc; border: 1px solid #94a3b8; border-top: none; font-size: 12px;"><a href="${vmsEscape(t.fail_peralatan)}" target="_blank" style="color:#0284c7; font-weight:700; text-decoration:underline;">📎 Klik di sini untuk membuka Dokumen Lampiran Senarai Peralatan</a></div>` : ''}
                        <!-- BAHAGIAN 5: PENGESAHAN URUSETIA & KELULUSAN -->
                        <div class="sheet-section-title">Bahagian 5: Pengesahan & Kelulusan Rasmi</div>
                        <table class="sheet-table-info">
                            <tr>
                                <td class="label-cell">Status Permohonan</td>
                                <td class="val-cell">
                                    <span class="sign-status-box" style="background:${statusBadgeColor}20; color:${statusBadgeColor}; border:1px solid ${statusBadgeColor};">
                                        ${vmsEscape(t.status)}
                                    </span>
                                </td>
                                <td class="label-cell">Pemandu Ditugaskan</td>
                                <td class="val-cell"><strong>${vmsEscape(t.nama_pemandu || 'Belum Diagih')}</strong></td>
                            </tr>
                        </table>

                        <!-- PETAK TANDATANGAN RASMI -->
                        <div class="sheet-sign-box">
                            <div class="sign-card">
                                <div class="sign-card-title">1. Perakuan Pemohon</div>
                                <p style="margin: 0; color:#475569; font-size:10px;">Saya memperakui bahawa permohonan ini adalah bagi tujuan urusan rasmi kerajaan.</p>
                                <div style="height: 45px;"></div>
                                <div style="border-top: 1px dotted #94a3b8; padding-top:4px;">
                                    <strong>Nama:</strong> ${vmsEscape(t.nama_pemohon)}<br>
                                    <strong>Tarikh:</strong> ${tarikhDihantar}
                                </div>
                            </div>

                            <div class="sign-card">
                                <div class="sign-card-title">2. Pengesahan Urusetia / Pelulus</div>
                                <p style="margin: 0; color:#475569; font-size:10px;">Permohonan telah disemak ketersediaan logistik dan kelulusan rasmi.</p>
                                <div style="height: 45px;"></div>
                                <div style="border-top: 1px dotted #94a3b8; padding-top:4px;">
                                    <strong>Status:</strong> ${vmsEscape(t.status)}<br>
                                    <strong>Tarikh Disemak:</strong> ${tarikhDihantar}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;

        const isiModal = document.getElementById('isiModalUrusetia');
        const modal = document.getElementById('modalUrusetia');
        const tabUtama = document.getElementById('sistem-tab-utama');

        if (!isiModal || !modal) return;

        isiModal.innerHTML = modalHtml;

        if (tabUtama) tabUtama.classList.add('hidden');
        modal.classList.remove('hidden');
        window.scrollTo(0, 0);

        const btnTutup = document.getElementById('btnTutupVms');
        if (btnTutup) {
            btnTutup.addEventListener('click', function () {
                modal.classList.add('hidden');
                if (tabUtama) tabUtama.classList.remove('hidden');
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
                <td>
                    <strong style="color:#102a43;">${tarikhMohon}</strong><br>
                    <!-- KOD BARU: HYPERLINK NO RUJUKAN -->
                    <a onclick="paparButiran(${t.indexAsal})" style="color: #0284c7; font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 13px;" title="Klik untuk lihat borang">
                        ${noRujukan}
                    </a>
                </td>
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

                <!-- LAJUR TERAKHIR: CATATAN (Butang Butiran dibuang) -->
                <td style="color:#64748b; font-size:12px; max-width: 150px;">
                    ${t.catatan || t.tujuan || '-'}
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
        const perananSemasa = u.peranan || 'pemohon';

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
                            <option value="pemohon" ${perananSemasa === 'pemohon' ? 'selected' : ''}>Akaun Tidak Aktif</option>
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
// ==========================================
// FUNGSI COMPRESS GAMBAR (JIMAT STORAGE)
// ==========================================
async function mampatkanGambar(file) {
    // Hanya proses jika fail adalah gambar. Jika PDF/Word/Excel, pulangkan fail asal.
    if (!file || !file.type.match(/image.*/)) {
        return file; 
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                // Kira nisbah untuk kecilkan gambar
                if (width > height && width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                } else if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Tukar kepada JPEG dengan kualiti 70% (0.7)
                canvas.toBlob((blob) => {
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(newFile);
                }, 'image/jpeg', 0.7);
            };
        };
    });
}
