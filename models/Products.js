async function loadCategories() {
  const res = await fetch("https://multi-maniacs-customs-backend.onrender.com/categories/all");
  const categories = await res.json();

  const filter = document.getElementById("categoryFilter");
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.name;
    opt.textContent = cat.name;
    filter.appendChild(opt);
  });
}

async function loadProducts(category = "") {
  const res = await fetch("https://multi-maniacs-customs-backend.onrender.com/products/all");
  const products = await res.json();

  const container = document.getElementById("product-list");
  container.innerHTML = "";

  products
    .filter(p => !category || p.category === category)
    .forEach(p => {
      const div = document.createElement("div");
      div.classList.add("product-card");

      div.innerHTML = `
        <img src="${p.imageUrl || 'default.jpg'}">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <p>$${p.price}</p>
        <button onclick="addToCart('${p.name}', ${p.price})">Add to Cart</button>
      `;

      container.appendChild(div);
    });
}

document.getElementById("categoryFilter").addEventListener("change", e => {
  loadProducts(e.target.value);
});

loadCategories();
loadProducts();
