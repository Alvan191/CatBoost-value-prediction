const loginForm = document.querySelector("#login-form");
const API_BASE = "http://localhost:3000/api";

loginForm?.addEventListener("submit", async (event) => {
	event.preventDefault();

	const formData = new FormData(loginForm);
	const username = formData.get("username")?.toString().trim();
	const password = formData.get("password")?.toString();

	if (!username || !password) return;

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
		window.location.href = "dashboard.html";
	} catch (err) {
		console.error("Login error:", err);
		alert("Terjadi kesalahan saat login");
	}
});
