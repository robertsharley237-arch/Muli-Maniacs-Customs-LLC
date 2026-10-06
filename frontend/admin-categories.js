(function () {
  "use strict";

  var REQUEST_TIMEOUT_MS = 15000;
  var configuration = window.MMC_CONFIG;

  function getElement(id) {
    return document.getElementById(id);
  }

  function getAdminToken() {
    return String(
      localStorage.getItem("adminToken") ||
      localStorage.getItem("MMC_ADMIN_TOKEN") ||
      ""
    ).trim();
  }

  function clearAdminSession() {
    [
      "adminToken",
      "MMC_ADMIN_TOKEN",
      "adminUser",
      "admin_token",
      "token"
    ].forEach(function (key) {
      localStorage.removeItem(key);
    });
  }

  function redirectToLogin() {
    clearAdminSession();
    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent("admin-categories.html")
    );
  }

  function showMessage(message, isError, isSuccess) {
    var box = getElement("categories-message");
    box.textContent = String(message || "");
    box.hidden = !message;
    box.classList.toggle("error", Boolean(isError));
    box.classList.toggle("success", Boolean(isSuccess));
    box.setAttribute("role", isError ? "alert" : "status");
  }

  function setText(id, value) {
    getElement(id).textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  }

  function getApiUrl(path) {
    if (!configuration || typeof configuration.createApiUrl !== "function") {
      throw new Error("The category API configuration is unavailable.");
    }
    return configuration.createApiUrl(path);
  }

  async function requestJson(url, options) {
    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    var response;

    try {
      response = await fetch(url, Object.assign({}, options || {}, {
        signal: controller.signal
      }));
    } finally {
      window.clearTimeout(timeoutId);
    }

    var responseText;
    try {
      responseText = await response.text();
    } catch (error) {
      throw new Error("The server response could not be read.");
    }

    var data = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        throw new Error("The server returned an invalid response.");
      }
    }

    if (response.status === 401) {
      redirectToLogin();
      throw new Error("Your administrator session has expired.");
    }
    if (response.status === 403) {
      throw new Error(
        data.error || data.message ||
        "Administrator permission is required to view categories."
      );
    }
    if (!response.ok) {
      throw new Error(
        data.error || data.message ||
        "The request failed with status " + response.status + "."
      );
    }
    return data;
  }

  function createCell(text) {
    var cell = document.createElement("td");
    cell.textContent = text;
    return cell;
  }

  function createActionLink(label, href) {
    var link = document.createElement("a");
    link.className = "small-action-button";
    link.href = href;
    link.textContent = label;
    return link;
  }

  function renderCategories(categories) {
    var body = getElement("categories-table-body");
    body.replaceChildren();

    if (categories.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = createCell("No categories were returned.");
      emptyCell.colSpan = 4;
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }

    categories.forEach(function (category) {
      if (
        !category ||
        category.id === undefined ||
        typeof category.name !== "string" ||
        typeof category.slug !== "string"
      ) {
        throw new Error("A category record is missing required fields.");
      }

      var row = document.createElement("tr");
      row.appendChild(createCell(category.name));
      row.appendChild(createCell(category.slug));
      row.appendChild(createCell(category.active ? "Active" : "Inactive"));

      var actionsCell = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "category-actions";
      actions.appendChild(createActionLink("Edit", "admin-edit-category.html"));
      actions.appendChild(createActionLink("Delete", "admin-delete-category.html"));
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      body.appendChild(row);
    });
  }

  async function loadCategories() {
    var token = getAdminToken();
    var data = await requestJson(
      getApiUrl("/categories/admin/all"),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + token
        }
      }
    );

    if (!data || !Array.isArray(data.categories)) {
      throw new Error("The category list was not returned in the expected format.");
    }
    renderCategories(data.categories);
  }

  async function initialize() {
    var token = getAdminToken();
    if (!token) {
      redirectToLogin();
      return;
    }

    ["admin-logout-button", "admin-navigation-logout-button"].forEach(function (id) {
      getElement(id).addEventListener("click", redirectToLogin);
    });

    getElement("reload-categories-button").addEventListener("click", function () {
      loadCategories().then(function () {
        showMessage("Category list refreshed.", false, true);
      }).catch(function (error) {
        console.error("Categories could not be refreshed.", error);
        showMessage(error.message || "Categories could not be refreshed.", true, false);
      });
    });

    try {
      var session = await requestJson(
        getApiUrl("/admin/me"),
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token
          }
        }
      );
      var administrator = session && (session.admin || session.user);
      if (!administrator || !administrator.id || !administrator.role) {
        throw new Error("The current administrator session could not be verified.");
      }

      localStorage.setItem("adminUser", JSON.stringify(administrator));
      setText("admin-header-username", administrator.username);
      setText("admin-header-role", administrator.role.replace(/_/g, " "));
      setText("admin-username", administrator.username);
      setText("admin-role", administrator.role.replace(/_/g, " "));
      await loadCategories();
    } catch (error) {
      console.error("Category management could not be initialized.", error);
      showMessage(error.message || "Category management could not be initialized.", true, false);
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
