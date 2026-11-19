const adminName = sessionStorage.getItem("catboost-admin");

if (!adminName) {
    window.location.replace("login.html");
} else {
    const nameLabel = document.querySelector("#admin-name");
    const profileInitial = document.querySelector("#profile-initial");
    nameLabel.textContent = adminName;
    profileInitial.textContent = adminName.charAt(0).toUpperCase();
}

document.querySelector("#logout-button").addEventListener("click", () => {
    sessionStorage.removeItem("catboost-admin");
    window.location.replace("login.html");
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
}).format(new Date());