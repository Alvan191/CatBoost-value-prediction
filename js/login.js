const loginForm = document.querySelector("#login-form");

loginForm?.addEventListener("submit", (event) => {
	event.preventDefault();

	const username = new FormData(loginForm).get("username")?.toString().trim();
	if (!username) return;

	sessionStorage.setItem("catboost-admin", username);
	window.location.href = "dashboard.html";
});
