(function () {
  "use strict";

  var REQUEST_TIMEOUT_MS = 15000;
  var administrators = [];
  var currentAdministrator = null;
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
      encodeURIComponent("admin-users.html")
    );
  }

  function showMessage(message, type) {
    var box = getElement("users-message");
    box.textContent = String(message || "");
    box.classList.remove(
      "users-error",
      "users-success",
      "users-information"
    );
    box.hidden = !message;

    if (!message) {
      box.removeAttribute("role");
      return;
    }

    if (type === "success") {
      box.classList.add("users-success");
      box.setAttribute("role", "status");
    } else if (type === "information") {
      box.classList.add("users-information");
      box.setAttribute("role", "status");
    } else {
      box.classList.add("users-error");
      box.setAttribute("role", "alert");
    }
  }

  function setText(id, value) {
    getElement(id).textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  }

  function formatRole(role) {
    return String(role || "admin")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function getResponseMessage(data, fallback) {
    if (data && typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (data && typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
    return fallback;
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
      throw new Error(getResponseMessage(
        data,
        "Super administrator permission is required."
      ));
    }

    if (!response.ok) {
      throw new Error(getResponseMessage(
        data,
        "The request failed with status " + response.status + "."
      ));
    }

    return data;
  }

  function getHeaders(includeJson) {
    var headers = {
      Accept: "application/json",
      Authorization: "Bearer " + getAdminToken()
    };
    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  function getApiUrl(path) {
    if (!configuration || typeof configuration.createApiUrl !== "function") {
      throw new Error("The administrator API configuration is unavailable.");
    }
    return configuration.createApiUrl(path);
  }

  function formatDate(value) {
    if (!value) {
      return "Never";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unavailable";
    }
    return date.toLocaleString();
  }

  function createCell(text) {
    var cell = document.createElement("td");
    cell.textContent = text;
    return cell;
  }

  function createRoleSelect(administrator) {
    var select = document.createElement("select");
    select.setAttribute("aria-label", "Role for " + administrator.username);

    [
      ["admin", "Administrator"],
      ["super_admin", "Super administrator"]
    ].forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      option.selected = administrator.role === entry[0];
      select.appendChild(option);
    });

    if (String(administrator.id) === String(currentAdministrator.id)) {
      select.disabled = true;
    }
    return select;
  }

  function createAccessSelect(administrator) {
    var select = document.createElement("select");
    select.setAttribute("aria-label", "Access status for " + administrator.username);
    [
      [true, "Active"],
      [false, "Inactive"]
    ].forEach(function (entry) {
      var option = document.createElement("option");
      option.value = String(entry[0]);
      option.textContent = entry[1];
      option.selected = administrator.active === entry[0];
      select.appendChild(option);
    });

    if (String(administrator.id) === String(currentAdministrator.id)) {
      select.disabled = true;
    }
    return select;
  }

  function createActionButton(text, action, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.dataset.action = action;
    button.className = className || "small-action-button";
    return button;
  }

  function renderAdministrators() {
    var body = getElement("users-table-body");
    var selector = getElement("reset-user-id");
    body.replaceChildren();
    selector.replaceChildren();

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select an administrator";
    selector.appendChild(placeholder);

    if (administrators.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = createCell("No administrators were returned.");
      emptyCell.colSpan = 5;
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }

    administrators.forEach(function (administrator) {
      var row = document.createElement("tr");
      row.className = "user-row";
      row.dataset.id = administrator.id;
      row.appendChild(createCell(administrator.username));

      var roleCell = document.createElement("td");
      roleCell.appendChild(createRoleSelect(administrator));
      row.appendChild(roleCell);

      var accessCell = document.createElement("td");
      var accessSelect = createAccessSelect(administrator);
      accessSelect.className = "user-status";
      accessCell.appendChild(accessSelect);
      row.appendChild(accessCell);

      row.appendChild(createCell(formatDate(administrator.lastLoginAt)));

      var actionsCell = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "user-actions";
      actions.appendChild(createActionButton("Save", "save"));
      actions.appendChild(createActionButton("Reset password", "select-password"));

      var deleteButton = createActionButton(
        "Delete",
        "delete",
        "small-action-button logout-action-button"
      );
      deleteButton.disabled =
        String(administrator.id) === String(currentAdministrator.id);
      actions.appendChild(deleteButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      body.appendChild(row);

      var option = document.createElement("option");
      option.value = administrator.id;
      option.textContent = administrator.username;
      selector.appendChild(option);
    });
  }

  async function loadAdministrators() {
    var data = await requestJson(
      getApiUrl(configuration.adminApi.users),
      { method: "GET", headers: getHeaders(false) }
    );

    if (!data || !Array.isArray(data.admins)) {
      throw new Error("The administrator list was not returned in the expected format.");
    }
    administrators = data.admins;
    renderAdministrators();
  }

  async function verifySession() {
    if (!getAdminToken()) {
      redirectToLogin();
      return false;
    }

    var data = await requestJson(
      getApiUrl(configuration.adminApi.session),
      { method: "GET", headers: getHeaders(false) }
    );
    var administrator = data && (data.admin || data.user);
    if (!administrator || !administrator.id || !administrator.role) {
      throw new Error("The current administrator session could not be verified.");
    }

    currentAdministrator = administrator;
    localStorage.setItem("adminUser", JSON.stringify(administrator));
    setText("admin-header-username", administrator.username);
    setText("admin-header-role", formatRole(administrator.role));
    setText("admin-username", administrator.username);
    setText("admin-role", formatRole(administrator.role));

    if (administrator.role !== "super_admin") {
      showMessage(
        "Only super administrators can manage administrator accounts.",
        "information"
      );
      return false;
    }

    getElement("users-management").hidden = false;
    return true;
  }

  function validatePassword(password) {
    if (
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return "Passwords must be at least 12 characters and include lowercase, uppercase, number, and special characters.";
    }
    return "";
  }

  async function handleCreate(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var formData = new FormData(form);
    var username = String(formData.get("username") || "").trim();
    var password = String(formData.get("password") || "");
    var role = String(formData.get("role") || "admin");

    if (!/^[a-zA-Z0-9._-]{3,100}$/.test(username)) {
      showMessage(
        "Usernames must be 3 to 100 characters and contain only letters, numbers, periods, underscores, or hyphens.",
        "error"
      );
      return;
    }

    var passwordError = validatePassword(password);
    if (passwordError) {
      showMessage(passwordError, "error");
      return;
    }

    var submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      var data = await requestJson(
        getApiUrl("/admin/register"),
        {
          method: "POST",
          headers: getHeaders(true),
          body: JSON.stringify({ username: username, password: password, role: role })
        }
      );
      form.reset();
      await loadAdministrators();
      showMessage(getResponseMessage(data, "Administrator created successfully."), "success");
    } catch (error) {
      console.error("Administrator account could not be created.", error);
      showMessage(error.message || "Administrator account could not be created.", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var formData = new FormData(form);
    var administratorId = String(formData.get("administratorId") || "");
    var password = String(formData.get("newPassword") || "");
    if (!administratorId) {
      showMessage("Select an administrator before resetting a password.", "error");
      return;
    }

    var passwordError = validatePassword(password);
    if (passwordError) {
      showMessage(passwordError, "error");
      return;
    }

    var submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      var url = configuration.createAdminUserApiUrl(administratorId) + "/password";
      var data = await requestJson(url, {
        method: "PATCH",
        headers: getHeaders(true),
        body: JSON.stringify({ newPassword: password })
      });
      form.reset();
      showMessage(getResponseMessage(data, "Administrator password reset successfully."), "success");
    } catch (error) {
      console.error("Administrator password could not be reset.", error);
      showMessage(error.message || "Administrator password could not be reset.", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  async function saveAdministrator(row, button) {
    var administratorId = row.dataset.id;
    var role = row.querySelector('td:nth-child(2) select').value;
    var active = row.querySelector('td:nth-child(3) select').value === "true";
    button.disabled = true;

    try {
      var url = configuration.createAdminUserApiUrl(administratorId);
      var data = await requestJson(url, {
        method: "PUT",
        headers: getHeaders(true),
        body: JSON.stringify({ role: role, active: active })
      });
      await loadAdministrators();
      showMessage(getResponseMessage(data, "Administrator updated successfully."), "success");
    } catch (error) {
      console.error("Administrator account could not be updated.", error);
      showMessage(error.message || "Administrator account could not be updated.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function deleteAdministrator(row, button) {
    var administratorId = row.dataset.id;
    var administrator = administrators.find(function (item) {
      return String(item.id) === administratorId;
    });
    if (!administrator) {
      showMessage("The selected administrator is no longer in the list. Refresh and try again.", "error");
      return;
    }
    if (!window.confirm("Permanently delete administrator \"" + administrator.username + "\"?")) {
      return;
    }

    button.disabled = true;
    try {
      var data = await requestJson(
        configuration.createAdminUserApiUrl(administratorId),
        { method: "DELETE", headers: getHeaders(false) }
      );
      await loadAdministrators();
      showMessage(getResponseMessage(data, "Administrator deleted successfully."), "success");
    } catch (error) {
      console.error("Administrator account could not be deleted.", error);
      showMessage(error.message || "Administrator account could not be deleted.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function handleTableAction(event) {
    var button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    var row = button.closest("tr[data-id]");
    if (!row) {
      return;
    }

    if (button.dataset.action === "save") {
      await saveAdministrator(row, button);
    } else if (button.dataset.action === "delete") {
      await deleteAdministrator(row, button);
    } else if (button.dataset.action === "select-password") {
      getElement("reset-user-id").value = row.dataset.id;
      getElement("password-heading").scrollIntoView({ behavior: "smooth" });
      getElement("reset-password-form").elements.newPassword.focus();
    }
  }

  function connectLogoutButtons() {
    ["admin-logout-button", "admin-navigation-logout-button"].forEach(function (id) {
      var button = getElement(id);
      button.addEventListener("click", redirectToLogin);
    });
  }

  async function initialize() {
    connectLogoutButtons();
    getElement("create-user-form").addEventListener("submit", handleCreate);
    getElement("reset-password-form").addEventListener("submit", handleResetPassword);
    getElement("users-table-body").addEventListener("click", function (event) {
      handleTableAction(event).catch(function (error) {
        console.error("Administrator action failed.", error);
        showMessage(error.message || "The administrator action failed.", "error");
      });
    });
    getElement("reload-users-button").addEventListener("click", function () {
      loadAdministrators().then(function () {
        showMessage("Administrator list refreshed.", "success");
      }).catch(function (error) {
        console.error("Administrator list could not be refreshed.", error);
        showMessage(error.message || "Administrator list could not be refreshed.", "error");
      });
    });

    try {
      if (await verifySession()) {
        await loadAdministrators();
      }
    } catch (error) {
      console.error("Administrator management could not be initialized.", error);
      showMessage(error.message || "Administrator management could not be initialized.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
