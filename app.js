
// const supabaseUrl = 'https://eazdfwzifcsfayapyshv.supabase.co';
// const supabaseKey = 'sb_publishable_IVJA3hCseLo_d39XX9RzMg_Nz4p8az2';


// GUNA URL & KEY BOSS SENDIRI (Dari kod asal bos)
const supabaseUrl = 'https://eazdfwzifcsfayapyshv.supabase.co';
const supabaseKey = 'sb_publishable_IVJA3hCseLo_d39XX9RzMg_Nz4p8az2';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// FUNGSI HANTAR PERMOHONAN KE SUPABASE
// ==========================================
$('#vehicleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Semak validasi form
    const form = $('#vehicleForm');
    if (!form.reportValidity()) {
        notify('Sila lengkapkan semua ruangan wajib yang ditandakan *.', 'error');
        return;
    }

    // Tukar butang jadi loading
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Sedang Menghantar...';
    submitBtn.disabled = true;

    try {
        // Ambil data dari form (guna fungsi collectForm yang dah sedia ada di HTML)
        const data = collectForm(); 
        
        // 2. Muat Naik Fail Surat Arahan ke Supabase Storage (Bucket: dokumen_sokongan)
        const fileInput = $('#letter').files[0];
        let fileUrl = null;

        if (fileInput) {
            const fileExt = fileInput.name.split('.').pop();
            const fileName = `surat_${Date.now()}.${fileExt}`; // Nama fail unik
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('dokumen_sokongan')
                .upload(fileName, fileInput);

            if (uploadError) throw uploadError;

            // Dapatkan URL awam untuk fail tersebut
            const { data: publicUrlData } = supabaseClient
                .storage
                .from('dokumen_sokongan')
                .getPublicUrl(fileName);
                
            fileUrl = publicUrlData.publicUrl;
        }

        // 3. Hantar data ke Table 'tempahan'
        // Andaikan currentUser.id dah ada dari sesi log masuk sebelum ini
        const { error: insertError } = await supabaseClient.from('tempahan').insert([{
            id_pemohon: currentUser ? currentUser.id : null, 
            nama_pemohon: data.applicantName,
            no_telefon: data.phone,
            bahagian: data.department,
            tujuan: data.purpose,
            tarikh_pergi: data.tripDate,
            masa_bertolak: data.departTime,
            masa_balik: data.returnTime,
            lokasi: data.location,
            urusan_perjalanan: data.tripPurpose,
            pemandu_tunggu: data.driverWait,
            bilangan_penumpang: data.passengerCount,
            kategori_kenderaan: data.vehicleType,
            catatan: data.extraNotes,
            fail_surat: fileUrl, // URL fail yang di-upload tadi
            senarai_penumpang: data.passengers, // Disimpan sebagai JSON Array
            senarai_peralatan: data.equipment,  // Disimpan sebagai JSON Array
            status: 'Menunggu Semakan'
        }]);

        if (insertError) throw insertError;

        // 4. Jika berjaya
        notify('Permohonan berjaya dihantar! Status: Menunggu Semakan.', 'ok');
        form.reset(); // Kosongkan borang
        localStorage.removeItem('vms_vehicle_application_draft'); // Buang draf
        
        // Boleh redirect pemohon balik ke dashboard utama di sini
        // setTimeout(() => { window.location.href = 'index.html'; }, 2000);

    } catch (err) {
        console.error(err);
        notify('Gagal menghantar permohonan: ' + err.message, 'error');
    } finally {
        // Kembalikan butang ke asal
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});
