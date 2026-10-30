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


/* VMS - PAPARAN BUTIRAN PERMOHONAN KENDERAAN */
(function () {
    'use strict';

    function pasangGayaVMS() {
        if (document.getElementById('vms-professional-style')) return;

        const css = `
        .vms-form {
            font-family: Inter, "Segoe UI", Arial, sans-serif;
            color: #17365d;
            background: #fff;
            padding: 24px;
            border-radius: 16px;
            width: 100%;
            box-sizing: border-box;
        }
        .vms-form * { box-sizing: border-box; }

        .vms-header {
            display: flex;
            align-items: center;
            gap: 18px;
            padding: 8px 5px 22px;
            margin-bottom: 24px;
            border-bottom: 2px dashed #bfdbfe;
        }
        .vms-logo {
            width: 70px;
            height: 70px;
            min-width: 70px;
            background: linear-gradient(135deg,#1767c2,#0c3d78);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 34px;
        }
        .vms-heading { min-width: 0; }
        .vms-header h3 {
            font-size: 22px;
            font-weight: 800;
            color: #124783;
            margin: 0 0 7px;
        }
        .vms-subtitle {
            color: #647da0;
            font-size: 13px;
        }
        .vms-reference {
            margin-left: auto;
            padding: 12px 17px;
            border-radius: 12px;
            background: #eff6ff;
            color: #174c8b;
            text-align: center;
            min-width: 120px;
            font-size: 11px;
            font-weight: 700;
        }
        .vms-reference strong {
            display: block;
            font-size: 18px;
            margin-top: 4px;
        }
        .vms-section {
            border: 1px solid #dbeafe;
            border-radius: 13px;
            overflow: hidden;
            margin-bottom: 22px;
            background: white;
        }
        .vms-section-title {
            padding: 15px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: white;
            font-size: 16px;
            font-weight: 800;
            margin: 0;
        }
        .vms-blue {
            background: linear-gradient(100deg,#1767b5,#9ac5f0);
        }
        .vms-teal {
            background: linear-gradient(100deg,#087d83,#a3d8d3);
        }
        .vms-purple {
            background: linear-gradient(100deg,#6267bd,#c9c9f5);
        }
        .vms-section-icon {
            background: white;
            color: #1767b5;
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 19px;
        }
        .vms-content {
            padding: 18px;
            margin: 14px;
            background: #f8fbff;
            border: 1px solid #e0edfc;
            border-radius: 10px;
        }
        .vms-grid {
            display: grid;
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 22px;
        }
        .vms-field {
            padding-bottom: 13px;
            border-bottom: 1px solid #e1eaf5;
            min-width: 0;
        }
        .vms-field.full { grid-column: 1 / -1; }
        .vms-label {
            display: block;
            color: #527397;
            font-size: 11px;
            font-weight: 800;
            margin-bottom: 7px;
        }
        .vms-value {
            color: #153765;
            font-size: 14px;
            font-weight: 600;
            overflow-wrap: anywhere;
        }
        .vms-download {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            padding: 12px 20px;
            background: linear-gradient(135deg,#1976d2,#0755aa);
            color: white !important;
            text-decoration: none !important;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 700;
            box-shadow: 0 4px 10px rgba(25,118,210,.18);
        }
        .vms-download:hover {
            transform: translateY(-2px);
        }
        .vms-empty {
            color: #94a3b8;
            font-size: 13px;
            font-style: italic;
        }
        .vms-table-wrap {
            overflow-x: auto;
            padding: 0 14px 14px;
        }
        .vms-table {
            width: 100%;
            min-width: 560px;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13px;
            border: 1px solid #dce7f7;
            border-radius: 9px;
        }
        .vms-table th {
            background: #edf2ff;
            color: #254c83;
            font-weight: 800;
            text-align: left;
            padding: 14px 12px;
            border-bottom: 1px solid #dce7f7;
        }
        .vms-table td {
            padding: 13px 12px;
            color: #29476c;
            border-bottom: 1px solid #e7edf7;
            overflow-wrap: anywhere;
        }
        .vms-table tbody tr:nth-child(even) {
            background: #f5f8fd;
        }
        .vms-table tbody tr:last-child td {
            border-bottom: none;
        }
        .vms-table th:first-child,
        .vms-table td:first-child {
            text-align: center;
            width: 45px;
        }
        .vms-passenger-total {
            margin: 0 14px 14px;
            padding: 12px 16px;
            border-radius: 9px;
            background: #f0f1ff;
            color: #555eae;
            font-size: 13px;
            font-weight: 700;
        }
        .vms-no-passenger {
            margin: 14px;
            padding: 16px;
            background: #f8fbff;
            border: 1px solid #e0edfc;
            border-radius: 9px;
        }
        .vms-footer {
            display: flex;
            justify-content: flex-end;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            margin-top: 20px;
        }
        .vms-close {
            border: none;
            background: #64748b;
            color: white;
            padding: 11px 24px;
            border-radius: 9px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 700;
        }
        .vms-close:hover { background: #334155; }

        @media(max-width:600px) {
            .vms-form { padding: 14px; }
            .vms-header { flex-wrap: wrap; gap: 12px; }
            .vms-header h3 { font-size: 17px; }
            .vms-logo {
                width: 55px;
                height: 55px;
                min-width: 55px;
                font-size: 27px;
            }
            .vms-reference {
                margin-left: 0;
                width: 100%;
            }
            .vms-grid {
                grid-template-columns: 1fr;
                gap: 14px;
            }
            .vms-field.full { grid-column: auto; }
            .vms-content { padding: 13px; margin: 9px; }
            .vms-section-title { font-size: 14px; }
        }
        `;

        const style = document.createElement('style');
        style.id = 'vms-professional-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Keselamatan teks HTML
    function vmsEscape(value) {
        return String(value ?? '-').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    // Semak pautan surat
    function vmsSafeFileUrl(value) {
        const url = String(value ?? '').trim();
        if (!url) return null;

        try {
            const parsed = new URL(url, window.location.href);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return null;
            }
            return parsed.href;
        } catch (error) {
            return null;
        }
    }

    // FUNGSI UTAMA
    window.paparButiran = function(index) {

        const sumberCache =
            (typeof cacheUrusetia !== 'undefined')
                ? cacheUrusetia
                : window.cacheUrusetia;

        const t = sumberCache && sumberCache[index];

        if (!t) {
            alert('Rekod permohonan tidak dijumpai.');
            return;
        }

        pasangGayaVMS();

        const noRujukan = 'VMS-' +
            String(t.id ?? Number(index) + 1).padStart(4,'0');

        // SURAT RASMI
        const fileUrl = vmsSafeFileUrl(t.fail_surat);

        const failHtml = fileUrl
            ? `<a href="${vmsEscape(fileUrl)}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="vms-download">
                  📎 Muat Turun Surat Rasmi
               </a>`
            : `<span class="vms-empty">
                  ${t.fail_surat
                    ? 'Pautan fail tidak sah.'
                    : 'Tiada fail dilampirkan.'}
               </span>`;

        // SENARAI PENUMPANG
        const penumpang = Array.isArray(t.senarai_penumpang)
            ? t.senarai_penumpang
            : [];

        let htmlPenumpang = '';

        if (penumpang.length > 0) {

            htmlPenumpang = `
                <div class="vms-table-wrap">
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
                            ${penumpang.map((p,i) => `
                                <tr>
                                    <td>${i+1}</td>
                                    <td><strong>${vmsEscape(p.nama)}</strong></td>
                                    <td>${vmsEscape(p.kp)}</td>
                                    <td>${vmsEscape(p.bahagian)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="vms-passenger-total">
                    👥 Jumlah penumpang: ${penumpang.length} orang
                </div>
            `;

        } else {
            htmlPenumpang = `
                <div class="vms-no-passenger">
                    <span class="vms-empty">
                        Tiada rekod penumpang.
                    </span>
                </div>
            `;
        }

        // PAPARAN MODAL
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
                        id="btnTutupVms">
                        ✕ &nbsp; Tutup
                    </button>
                </div>

            </div>
        `;

        const isiModal = document.getElementById('isiModalUrusetia');
        const modal = document.getElementById('modalUrusetia');

        if (!isiModal || !modal) {
            console.error(
                'Elemen #isiModalUrusetia atau #modalUrusetia tidak dijumpai.'
            );
            return;
        }

        isiModal.innerHTML = modalHtml;
        modal.classList.remove('hidden');

        // TUTUP MODAL
        const btnTutup = document.getElementById('btnTutupVms');

        if (btnTutup) {
            btnTutup.addEventListener('click', function() {
                modal.classList.add('hidden');
            });
        }
    };

})();
