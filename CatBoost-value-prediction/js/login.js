const loginForm = document.querySelector("#login-form");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector("#password-toggle");

passwordToggle?.addEventListener("click", () => {
	if (!passwordInput) return;

	const isPasswordVisible = passwordInput.type === "text";
	passwordInput.type = isPasswordVisible ? "password" : "text";
	passwordToggle.setAttribute("aria-pressed", String(!isPasswordVisible));
	passwordToggle.setAttribute(
		"aria-label",
		isPasswordVisible ? "Tampilkan password" : "Sembunyikan password"
	);
});

// =============================================
// MODE: MOCK (backend dinonaktifkan sementara)
// Aktifkan kembali saat backend sudah siap
// =============================================
const MOCK_MODE = true;
const API_BASE = "http://localhost:3000/api";

loginForm?.addEventListener("submit", async (event) => {
	event.preventDefault();

	const formData = new FormData(loginForm);
	const username = formData.get("username")?.toString().trim();
	const password = formData.get("password")?.toString();

	if (!username || !password) return;

	if (MOCK_MODE) {
		// Simpan mock user ke localStorage lalu langsung ke dashboard
		localStorage.setItem("catboost-token", "mock-token-dev");
		localStorage.setItem("catboost-user", JSON.stringify({ id: 1, username: username || "admin", role: "admin" }));
		window.location.href = "html/dashboard.html";
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password })
		});

		const data = await response.json();

		if (!response.ok) {
			alert(data.error || "Login gagal");
			return;
		}

		localStorage.setItem("catboost-token", data.token);
		localStorage.setItem("catboost-user", JSON.stringify(data.user));
		window.location.href = "html/dashboard.html";
	} catch (err) {
		console.error("Login error:", err);
		alert("Terjadi kesalahan saat login");
	}
});
