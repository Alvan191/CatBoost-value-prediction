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

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
}).format(new Date());

async function loadDashboardData() {
    const tbody = document.querySelector(".prediction-table-wrap tbody");
    try {
        const response = await fetch("/api/predictions");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Riwayat prediksi gagal dimuat.");

        const predictions = Array.isArray(result.data) ? result.data : [];
        const predictionCount = document.querySelector("#prediction-count");
        predictionCount.replaceChildren(
            document.createTextNode(String(result.total)),
            Object.assign(document.createElement("span"), { textContent: " prediksi" })
        );
        const latestScore = document.querySelector("#latest-score");
        latestScore.replaceChildren(
            document.createTextNode(predictions.length
                ? Number(predictions[0].predicted_score).toLocaleString("id-ID", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                })
                : "--"),
            Object.assign(document.createElement("span"), { textContent: " nilai" })
        );

        tbody.replaceChildren();
        if (predictions.length === 0) {
            showTableMessage(tbody, "Belum ada prediksi tersimpan di database.");
            return;
        }

        for (const prediction of predictions) {
            const row = document.createElement("tr");
            const values = [
                prediction.student_name || "-",
                prediction.features?.mata_pelajaran || "-",
                new Date(prediction.created_at).toLocaleString("id-ID"),
                Number(prediction.predicted_score).toLocaleString("id-ID", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                }),
            ];
            for (const value of values) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.append(cell);
            }
            tbody.append(row);
        }
    } catch (error) {
        console.error("Failed to load prediction history:", error);
        showTableMessage(tbody, error.message || "Riwayat prediksi gagal dimuat.");
    }
}

function showTableMessage(tbody, message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-state";
    cell.colSpan = 4;
    cell.textContent = message;
    row.append(cell);
    tbody.replaceChildren(row);
}

loadDashboardData();
