async function adminLogin() {
    const username = document.getElementById("adminUsername").value;
    const password = document.getElementById("adminPassword").value;

    const res = await fetch("https://multi-maniacs-customs-backend.onrender.com/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem("MMC_ADMIN_TOKEN", data.token);
        window.location.href = "admin.html";
    } else {
        alert("Login failed.");
    }
}
