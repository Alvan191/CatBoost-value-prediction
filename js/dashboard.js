const API_BASE = "http://localhost:3000/api";

function getToken() {
    return localStorage.getItem("catboost-token");
}

function getUser() {
    const userStr = localStorage.getItem("catboost-user");
    return userStr ? JSON.parse(userStr) : null;
}

async function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.replace("login.html");
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            localStorage.removeItem("catboost-token");
            localStorage.removeItem("catboost-user");
            window.location.replace("login.html");
            return null;
        }

        const data = await response.json();
        return data.user;
    } catch (err) {
        console.error("Auth check error:", err);
        window.location.replace("login.html");
        return null;
    }
}

async function init() {
    const user = await checkAuth();
    if (!user) return;

    const nameLabel = document.querySelector("#admin-name");
    const profileInitial = document.querySelector("#profile-initial");
    nameLabel.textContent = user.username;
    profileInitial.textContent = user.username.charAt(0).toUpperCase();

    document.querySelector("#logout-button").addEventListener("click", () => {
        localStorage.removeItem("catboost-token");
        localStorage.removeItem("catboost-user");
        window.location.replace("login.html");
    });

    document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date());

    await loadDashboardData();
}

async function loadDashboardData() {
    const token = getToken();

    try {
        const [studentsRes, academicsRes, predictionsRes] = await Promise.all([
            fetch(`${API_BASE}/students?limit=1`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_BASE}/academics?limit=1`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_BASE}/predictions?limit=5`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        const studentsData = await studentsRes.json();
        const academicsData = await academicsRes.json();
        const predictionsData = await predictionsRes.json();

        updateSummaryCards(studentsData, academicsData);
        updatePredictionsTable(predictionsData);
    } catch (err) {
        console.error("Failed to load dashboard data:", err);
    }
}

function updateSummaryCards(studentsData, academicsData) {
    const studentsCount = document.querySelector(".students-card .metric-value");
    const academicsCount = document.querySelector(".academics-card .metric-value");

    if (studentsCount) studentsCount.innerHTML = `${studentsData.pagination?.total || 0} <span>siswa</span>`;
    if (academicsCount) academicsCount.innerHTML = `${academicsData.pagination?.total || 0} <span>rekaman</span>`;
}

function updatePredictionsTable(predictionsData) {
    const tbody = document.querySelector(".prediction-table-wrap tbody");
    if (!tbody) return;

    if (!predictionsData.data || predictionsData.data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td class="empty-state" colspan="3">
                    <span class="empty-icon" aria-hidden="true">—</span>
                    <strong>Belum ada prediksi</strong>
                    <small>Hasil prediksi akan tampil di sini setelah data tersedia.</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = predictionsData.data.map(pred => `
        <tr>
            <td>${pred.student_name || 'N/A'}</td>
            <td>${new Date(pred.created_at).toLocaleDateString('id-ID')}</td>
            <td>${pred.predicted_score}</td>
        </tr>
    `).join('');
}

init();