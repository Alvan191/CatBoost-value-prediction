// ---- Login guard & logout (sama seperti dashboard.js) ----
const user = JSON.parse(localStorage.getItem("catboost-user") || "null");
if (!user || typeof user.username !== "string" || !user.username.trim()) {
    localStorage.removeItem("catboost-token");
    localStorage.removeItem("catboost-user");
    window.location.replace("../login.html");
} else {
    document.querySelector("#admin-name").textContent = user.username;
    document.querySelector("#profile-initial").textContent = user.username.charAt(0).toUpperCase();
}
document.querySelector("#logout-button").addEventListener("click", () => {
    localStorage.removeItem("catboost-token");
    localStorage.removeItem("catboost-user");
    window.location.replace("../login.html");
});

// ---- Pilihan dropdown ----
const KELAS = ["X", "XI", "XII"].flatMap((t) => [1, 2, 3, 4, 5].map((n) => `${t}-${n}`));
const MAPEL = [
    "Pendidikan Agama", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "Bahasa Inggris",
    "Sejarah", "Pendidikan Jasmani", "Seni Budaya", "Informatika", "Matematika Tingkat Lanjut",
    "Fisika", "Kimia", "Biologi", "Ekonomi", "Sosiologi", "Geografi", "Antropologi",
];

function isiOpsi(select, daftar) {
    select.innerHTML = daftar.map((v) => `<option value="${v}">${v}</option>`).join("");
}
const form = document.querySelector("#predict-form");
isiOpsi(form.kelas, KELAS);
isiOpsi(form.mata_pelajaran, MAPEL);

// ---- Elemen ----
const FIELD_ANGKA = ["nilai_tugas", "nilai_uts", "kehadiran", "keaktifan"];
const errorBox = document.querySelector("#form-error");
const submitBtn = document.querySelector("#submit-button");
const resultEmpty = document.querySelector("#result-empty");
const resultCard = document.querySelector("#result-card");
const historyBox = document.querySelector("#history");
const historyBody = document.querySelector("#history-body");
const riwayat = [];

document.querySelector("#fill-example").addEventListener("click", () => {
    form.nama.value = "Siswa Contoh";
    form.nilai_tugas.value = 85;
    form.nilai_uts.value = 80;
    form.kehadiran.value = 95;
    form.keaktifan.value = 80;
    form.kelas.value = "XI-1";
    form.jurusan.value = "IPA";
    form.mata_pelajaran.value = "Matematika";
    tampilkanError("");
});

function tampilkanError(pesan) {
    errorBox.hidden = !pesan;
    errorBox.textContent = pesan;
}

function validasi() {
    let pesan = "";
    for (const nama of FIELD_ANGKA) {
        const el = form[nama];
        const v = parseFloat(el.value);
        const salah = el.value.trim() === "" || Number.isNaN(v) || v < 0 || v > 100;
        el.classList.toggle("invalid", salah);
        if (salah && !pesan) pesan = "Semua nilai wajib diisi dengan angka 0-100.";
    }
    return pesan;
}

// ---- Kirim ke Flask ----
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pesan = validasi();
    tampilkanError(pesan);
    if (pesan) return;

    const payload = {
        nama: form.nama.value.trim(),
        nilai_tugas: form.nilai_tugas.value,
        nilai_uts: form.nilai_uts.value,
        kehadiran: form.kehadiran.value,
        keaktifan: form.keaktifan.value,
        kelas: form.kelas.value,
        jurusan: form.jurusan.value,
        mata_pelajaran: form.mata_pelajaran.value,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
    try {
        const res = await fetch("/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Prediksi gagal");
        tampilkanHasil(data);
    } catch (err) {
        tampilkanError(err.message === "Failed to fetch"
            ? "Tidak bisa terhubung ke server. Pastikan app.py berjalan dan buka lewat http://127.0.0.1:5000."
            : err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Prediksi nilai akhir";
    }
});

function tampilkanHasil(data) {
    const nilai = data.prediksi.toFixed(1).replace(".", ",");
    const mae = data.mae.toFixed(2).replace(".", ",");
    document.querySelector("#result-value").textContent = nilai;
    document.querySelector("#result-note").textContent =
        `Rata-rata selisih model pada data uji sekitar ±${mae} poin.`;
    resultEmpty.hidden = true;
    resultCard.hidden = false;

    riwayat.unshift({
        nama: form.nama.value.trim() || "-",
        mapel: data.input.mata_pelajaran,
        jam: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        nilai,
    });
    riwayat.length = Math.min(riwayat.length, 5);

    historyBody.replaceChildren(...riwayat.map((r) => {
        const tr = document.createElement("tr");
        for (const teks of [r.nama, r.mapel, r.jam, r.nilai]) {
            const td = document.createElement("td");
            td.textContent = teks;   // textContent: aman dari injeksi HTML
            tr.append(td);
        }
        return tr;
    }));
    historyBox.hidden = false;
}