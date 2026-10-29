import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = 'MASUKKAN_URL_SUPABASE_BOS_DI_SINI'
const supabaseKey = 'MASUKKAN_API_KEY_BOS_DI_SINI'
const supabase = createClient(supabaseUrl, supabaseKey)


// ==========================================
// 1. FUNGSI TUKAR TAB & TARIKH (UNTUK UI)
// ==========================================
window.tukarTab = function(tabName) {
    document.getElementById('tab-laporan').style.display = (tabName === 'laporan') ? 'block' : 'none';
    document.getElementById('tab-tetapan').style.display = (tabName === 'tetapan') ? 'block' : 'none';
    
    const menuLaporan = document.getElementById('menu-laporan');
    const menuTetapan = document.getElementById('menu-tetapan');
    
    if (tabName === 'laporan') {
        menuLaporan.classList.add('active');
        menuTetapan.classList.remove('active');
    } else {
        menuTetapan.classList.add('active');
        menuLaporan.classList.remove('active');
    }
};

const elTarikh = document.getElementById('tarikhSemasa');
if(elTarikh) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elTarikh.innerHTML = '◷ &nbsp; Laporan setakat: <strong>' + new Date().toLocaleDateString('ms-MY', options) + '</strong>';
}


// ==========================================
// 2. FUNGSI PENGURUSAN SOALAN (CRUD)
// ==========================================
let editSoalanId = null; 

async function paparSenaraiSoalan() {
    const tbody = document.getElementById('senaraiSoalanBody');
    if (!tbody) return;

    const { data, error } = await supabase.from('senarai_soalan').select('*').order('kategori').order('kod_soalan');

    if (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Gagal memuatkan data.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; 
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Tiada soalan direkodkan.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.kategori}</td>
            <td><strong>${item.kod_soalan}</strong></td>
            <td>${item.soalan}</td>
            <td style="white-space: nowrap;">
                <button class="action-btn btn-edit" data-id="${item.id}" data-kategori="${item.kategori}" data-kod="${item.kod_soalan}" data-soalan="${item.soalan}" style="background: #ffc107; color: #000;" title="Edit">✏️</button>
                <button class="action-btn delete btn-padam" data-id="${item.id}" style="background: #dc3545; color: white;" title="Padam">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnElement = e.currentTarget;
            editSoalanId = btnElement.getAttribute('data-id');
            
            document.getElementById('kategoriBaru').value = btnElement.getAttribute('data-kategori');
            document.getElementById('kodBaru').value = btnElement.getAttribute('data-kod');
            document.getElementById('soalanBaru').value = btnElement.getAttribute('data-soalan');
            
            const submitBtn = document.getElementById('btnSubmitSoalan');
            submitBtn.textContent = "Kemaskini";
            submitBtn.style.background = "#ffc107";
            submitBtn.style.color = "#000";
            
            document.getElementById('formTambahSoalan').scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.btn-padam').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm("Adakah anda pasti mahu memadam soalan ini?")) {
                const { error: delErr } = await supabase.from('senarai_soalan').delete().eq('id', id);
                if (!delErr) paparSenaraiSoalan(); 
            }
        });
    });
}

const formTambah = document.getElementById('formTambahSoalan');
if (formTambah) {
    formTambah.addEventListener('submit', async (e) => {
        e.preventDefault();
        const kategori = document.getElementById('kategoriBaru').value;
        const kod = document.getElementById('kodBaru').value;
        const soalan = document.getElementById('soalanBaru').value;
        const submitBtn = document.getElementById('btnSubmitSoalan');

        if (editSoalanId) {
            const { error } = await supabase.from('senarai_soalan').update({ kategori, kod_soalan: kod, soalan }).eq('id', editSoalanId);
            if (!error) {
                alert("Berjaya dikemaskini!");
                editSoalanId = null;
                submitBtn.textContent = "Simpan"; 
                submitBtn.style.background = "linear-gradient(135deg, #2187ff, #075fd1)";
                submitBtn.style.color = "white";
                formTambah.reset();
                paparSenaraiSoalan();
            }
        } else {
            const { error } = await supabase.from('senarai_soalan').insert([{ kategori, kod_soalan: kod, soalan }]);
            if (!error) {
                alert("Berjaya ditambah!");
                formTambah.reset();
                paparSenaraiSoalan();
            }
        }
    });
}


// ==========================================
// 3. FUNGSI PENGURUSAN JABATAN / BAHAGIAN
// ==========================================
async function paparSenaraiJabatan() {
    const tbody = document.getElementById('senaraiJabatanBody');
    if (!tbody) return;

    const { data, error } = await supabase.from('jabatan').select('*').order('nama');

    if (error) {
        tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Gagal memuatkan data.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Tiada rekod bahagian.</td></tr>';
        return;
    }

    data.forEach(jabatan => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${jabatan.nama}</strong></td>
            <td style="text-align: left; width: 100px;">
                <button class="action-btn delete btn-padam-jabatan" data-id="${jabatan.id}" style="background: #dc3545; color: white;" title="Padam">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-padam-jabatan').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm("Padam bahagian ini?\n(Pastikan tiada pengajar didaftarkan di bawah bahagian ini)")) {
                const { error: delErr } = await supabase.from('jabatan').delete().eq('id', id);
                if (delErr) {
                    alert("Ralat memadam! Kemungkinan masih ada pengajar di bawah bahagian ini.");
                } else {
                    paparSenaraiJabatan();
                    muatDropdownJabatanAdmin(); 
                }
            }
        });
    });
}

const formJabatan = document.getElementById('formTambahJabatan');
if (formJabatan) {
    formJabatan.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('namaJabatanBaru').value;

        const { error } = await supabase.from('jabatan').insert([{ nama }]);
        if (!error) {
            alert("Bahagian berjaya ditambah!");
            formJabatan.reset();
            paparSenaraiJabatan();
            muatDropdownJabatanAdmin(); 
        } else {
            alert("Ralat menambah bahagian!");
        }
    });
}


// ==========================================
// 4. FUNGSI PENGURUSAN PENGAJAR
// ==========================================
async function muatDropdownJabatanAdmin() {
    const selectJabatan = document.getElementById('jabatanPengajarBaru');
    if (!selectJabatan) return;

    const { data, error } = await supabase.from('jabatan').select('*').order('nama');
    if (!error) {
        selectJabatan.innerHTML = '<option value="">-- Pilih Bahagian --</option>';
        data.forEach(j => { selectJabatan.innerHTML += `<option value="${j.id}">${j.nama}</option>`; });
    }
}

async function paparSenaraiPengajar() {
    const tbody = document.getElementById('senaraiPengajarBody');
    if (!tbody) return;

    const { data: dataJabatan } = await supabase.from('jabatan').select('*');
    const { data: dataPengajar, error } = await supabase.from('pengajar').select('*').order('jabatan_id');

    if (error) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Gagal memuatkan data.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    if (dataPengajar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Tiada rekod pengajar.</td></tr>';
        return;
    }

    dataPengajar.forEach(pengajar => {
        const jabatan = dataJabatan.find(j => j.id === pengajar.jabatan_id);
        const namaJabatan = jabatan ? jabatan.nama : 'Tiada Jabatan';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${namaJabatan}</td>
            <td><strong>${pengajar.nama}</strong></td>
            <td style="text-align: left;">
                <button class="action-btn delete btn-padam-pengajar" data-id="${pengajar.id}" style="background: #dc3545; color: white;" title="Padam">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-padam-pengajar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm("Padam nama pengajar ini?")) {
                const { error: delErr } = await supabase.from('pengajar').delete().eq('id', id);
                if (!delErr) paparSenaraiPengajar();
            }
        });
    });
}

const formPengajar = document.getElementById('formTambahPengajar');
if (formPengajar) {
    formPengajar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const jabatan_id = document.getElementById('jabatanPengajarBaru').value;
        const nama = document.getElementById('namaPengajarBaru').value;

        const { error } = await supabase.from('pengajar').insert([{ jabatan_id, nama }]);
        if (!error) {
            alert("Pengajar berjaya ditambah!");
            formPengajar.reset();
            paparSenaraiPengajar();
        } else {
            alert("Ralat menambah pengajar!");
        }
    });
}


// ==========================================
// 5. ENJIN DASHBOARD (STATISTIK & CADANGAN)
// ==========================================
async function muatEnjinDashboard() {
    try {
        const { count: countSoalan } = await supabase.from('senarai_soalan').select('*', { count: 'exact', head: true });
        if (countSoalan !== null) document.getElementById('stat-soalan').textContent = countSoalan;

        const { count: countPengajar } = await supabase.from('pengajar').select('*', { count: 'exact', head: true });
        if (countPengajar !== null) document.getElementById('stat-pengajar').textContent = countPengajar;

        const { count: countJabatan } = await supabase.from('jabatan').select('*', { count: 'exact', head: true });
        if (countJabatan !== null) document.getElementById('stat-jabatan').textContent = countJabatan;

        const { count: countTiket } = await supabase.from('tiket_maklumbalas').select('*', { count: 'exact', head: true });
        if (countTiket !== null) document.getElementById('stat-maklumbalas').textContent = countTiket;

        const { data: dataSkor } = await supabase.from('jawapan_skala').select('skor');
        if (dataSkor && dataSkor.length > 0) {
            const jumlahSkor = dataSkor.reduce((hasil, item) => hasil + item.skor, 0);
            const purata = (jumlahSkor / dataSkor.length).toFixed(1);
            document.getElementById('stat-skor').innerHTML = `${purata} <small style="font-size:13px">/ 5</small>`;
        } else {
            document.getElementById('stat-skor').innerHTML = `0.0 <small style="font-size:13px">/ 5</small>`;
        }

        const { data: dataCadangan, error: errCadangan } = await supabase
            .from('jawapan_cadangan')
            .select('teks_cadangan, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        const bekasCadangan = document.getElementById('senaraiCadangan');
        if (!errCadangan && dataCadangan.length > 0) {
            bekasCadangan.innerHTML = ''; 
            const iconWarna = ['g', 'o', 'p', 'r', '']; 
            
            dataCadangan.forEach((item, index) => {
                const tarikh = new Date(item.created_at).toLocaleDateString('ms-MY');
                const warna = iconWarna[index % iconWarna.length];
                bekasCadangan.innerHTML += `
                    <div class="suggestion">
                        <div class="quote ${warna}">“</div>
                        <div class="suggestion-text">${item.teks_cadangan}</div>
                        <div class="suggestion-meta"><span class="tag">Pelajar</span> ${tarikh}</div>
                    </div>
                `;
            });
        } else {
            bekasCadangan.innerHTML = '<p class="empty-state">Belum ada cadangan direkodkan.</p>';
        }

    } catch (error) {
        console.error("Ralat memuatkan enjin dashboard:", error);
    }
}

// ==========================================
// 6. JALANKAN SEMUA FUNGSI BILA PAGE DIBUKA
// ==========================================
paparSenaraiSoalan();
paparSenaraiJabatan();
muatDropdownJabatanAdmin();
paparSenaraiPengajar();
muatEnjinDashboard();
