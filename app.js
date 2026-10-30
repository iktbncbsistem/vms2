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
        if (data.peranan === 'pemohon') {
            document.getElementById('dashboard-pemohon').classList.remove('hidden');
            document.getElementById('applicantName').value = data.nama;
            muatSejarahPemohon();
        } 
        
        else if (data.peranan === 'urusetia') {
            document.getElementById('dashboard-urusetia').classList.remove('hidden');
            muatSenaraiUrusetia();
        } else if (data.peranan === 'pelulus') {
            document.getElementById('dashboard-pelulus').classList.remove('hidden');
            muatSenaraiPelulus();
        }
    } else {
        alert("Profil anda tiada dalam pangkalan data. Sila hubungi Admin.");
    }
}

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
                tarikh_balik: document.getElementById('tripDate').value,
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
// FUNGSI PAPAR BUTIRAN POP-UP (PREMIUM FORM)
// ==========================================
function paparButiran(index) {
    const t = cacheUrusetia[index];
    
    // Butang Muat Turun Surat
    const failHtml = t.fail_surat 
        ? `<a href="${t.fail_surat}" target="_blank" style="background:var(--primary); color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-size:12px; display:inline-block; font-weight:600;">📎 Muat Turun Surat Rasmi</a>` 
        : '<span style="color:#94a3b8; font-size:12px; font-style:italic;">Tiada fail dilampirkan</span>';
    
    // Tukar JSON Penumpang kepada Jadual HTML yang kemas
    let htmlPenumpang = '';
    if (t.senarai_penumpang && t.senarai_penumpang.length > 0) {
        htmlPenumpang = `
            <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px; background:white;">
                <thead>
                    <tr style="background:#e2e8f0; text-align:left; color:#334155;">
                        <th style="padding:8px 12px; border:1px solid #cbd5e1; width:40px; text-align:center;">Bil</th>
                        <th style="padding:8px 12px; border:1px solid #cbd5e1;">Nama Penumpang</th>
                        <th style="padding:8px 12px; border:1px solid #cbd5e1;">No. K/P</th>
                        <th style="padding:8px 12px; border:1px solid #cbd5e1;">Bahagian</th>
                    </tr>
                </thead>
                <tbody>
        `;
        t.senarai_penumpang.forEach((p, i) => {
            htmlPenumpang += `
                <tr>
                    <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:center;">${i+1}</td>
                    <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:500;">${p.nama || '-'}</td>
                    <td style="padding:8px 12px; border:1px solid #cbd5e1;">${p.kp || '-'}</td>
                    <td style="padding:8px 12px; border:1px solid #cbd5e1;">${p.bahagian || '-'}</td>
                </tr>`;
        });
        htmlPenumpang += `</tbody></table>`;
    } else {
        htmlPenumpang = `<p style="color:#64748b; font-size:13px; font-style:italic; padding:10px 0;">Tiada rekod penumpang.</p>`;
    }

    // Reka Bentuk Borang Premium
    const modalHtml = `
        <div style="font-family: 'Inter', sans-serif; color: #334155;">
            
            <!-- HEADER BORANG -->
            <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:2px dashed #cbd5e1;">
                <h4 style="margin:0; color:#102a43; font-size:18px; text-transform:uppercase; letter-spacing:0.5px;">Borang Permohonan Kenderaan</h4>
                <span style="background:#f1f5f9; border:1px solid #cbd5e1; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; color:#475569; display:inline-block; margin-top:10px;">
                    NO. RUJUKAN: VMS-${t.id.toString().padStart(4, '0')}
                </span>
            </div>

            <!-- SEKSYEN A -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin-bottom:15px;">
                <h5 style="margin:0 0 12px 0; color:#1767c2; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:8px;">A. MAKLUMAT PEMOHON</h5>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; font-size:13px;">
                    <div><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:3px;">NAMA PEMOHON</strong> <span style="font-weight:600;">${t.nama_pemohon}</span></div>
                    <div><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:3px;">NO. TELEFON</strong> ${t.no_telefon}</div>
                    <div><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:3px;">BAHAGIAN / CAWANGAN</strong> ${t.bahagian || '-'}</div>
                    <div><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:3px;">TUJUAN PERMOHONAN</strong> ${t.tujuan || '-'}</div>
                    <div style="grid-column: span 2; margin-top:5px;"><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:6px;">SURAT ARAHAN TUGAS RASMI</strong> ${failHtml}</div>
                </div>
            </div>

            <!-- SEKSYEN B -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin-bottom:15px;">
                <h5 style="margin:0 0 12px 0; color:#1767c2; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:8px;">B. JADUAL PERJALANAN</h5>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; font-size:13px;">
                    <div style="grid-column: span 2;"><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:3px;">DESTINASI / LOKASI</strong> <span style="font-weight:600;">${t.destinasi || t.lokasi}</span></div>
                    <div><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:3px;">TARIKH PERJALANAN</strong> ${t.tarikh_pergi}</div>
                    <div><strong style="color:#64748b; font-size:11px; display:block; margin-bottom:3px;">MASA PERJALANAN</strong> ${t.masa_bertolak || '-'} hingga ${t.masa_balik || '-'}</div>
                </div>
            </div>

            <!-- SEKSYEN C -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:18px;">
                <h5 style="margin:0 0 8px 0; color:#1767c2; font-size:14px;">C. SENARAI PENUMPANG</h5>
                ${htmlPenumpang}
            </div>

        </div>
    `;
    
    document.getElementById('isiModalUrusetia').innerHTML = modalHtml;
    document.getElementById('modalUrusetia').classList.remove('hidden');
}
