/**
 * Admin panel logic: sign in, manage experience entries, upload a new CV.
 * All reads/writes go through window.PortfolioData (js/portfolio-data.js).
 */
(function () {
  const Data = window.PortfolioData;

  const el = {};
  const rowsById = new Map();
  let editingId = null;
  let dashboardReady = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(node, message, isError) {
    if (!node) {
      return;
    }
    node.textContent = message || "";
    node.classList.toggle("error", Boolean(isError));
    node.classList.toggle("success", Boolean(message) && !isError);
  }

  function setBusy(button, busy, label) {
    if (!button) {
      return;
    }
    if (busy) {
      button.dataset.label = button.dataset.label || button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + Data.escapeHtml(label || "Working...");
    } else {
      button.disabled = false;
      if (button.dataset.label) {
        button.innerHTML = button.dataset.label;
      }
    }
  }

  function errorMessage(error, fallback) {
    if (error && error.message) {
      return error.message;
    }
    return fallback;
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  // -------------------------------------------------------------------
  // Screens
  // -------------------------------------------------------------------

  function showSetupNotice() {
    el.setupNotice.hidden = false;
    el.authCard.hidden = true;
    el.dashboard.hidden = true;
    el.signOut.hidden = true;
  }

  function showLogin() {
    editingId = null;
    dashboardReady = false;
    rowsById.clear();
    el.setupNotice.hidden = true;
    el.dashboard.hidden = true;
    el.authCard.hidden = false;
    el.signOut.hidden = true;
    setStatus(el.authStatus, "", false);
  }

  async function showDashboard(session) {
    el.setupNotice.hidden = true;
    el.authCard.hidden = true;
    el.dashboard.hidden = false;
    el.signOut.hidden = false;
    el.adminEmail.textContent = (session && session.user && session.user.email) || "admin";
    if (!dashboardReady) {
      dashboardReady = true;
      await Promise.all([loadRows(), loadCv()]);
      // After the first load, so the default order number follows the existing rows.
      resetForm();
    }
  }

  // -------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------

  async function handleLogin(event) {
    event.preventDefault();
    const email = el.loginEmail.value.trim();
    const password = el.loginPassword.value;

    if (!email || !password) {
      setStatus(el.authStatus, "Enter your email and password.", true);
      return;
    }

    setBusy(el.loginButton, true, "Signing in...");
    setStatus(el.authStatus, "", false);
    try {
      const session = await Data.signIn(email, password);
      el.loginForm.reset();
      await showDashboard(session);
    } catch (error) {
      setStatus(el.authStatus, errorMessage(error, "Sign in failed. Check your email and password."), true);
    } finally {
      setBusy(el.loginButton, false);
    }
  }

  async function handleSignOut() {
    setBusy(el.signOut, true, "Signing out...");
    try {
      await Data.signOut();
    } catch (error) {
      setStatus(el.listStatus, errorMessage(error, "Could not sign out."), true);
    } finally {
      setBusy(el.signOut, false);
      showLogin();
    }
  }

  // -------------------------------------------------------------------
  // Experience list
  // -------------------------------------------------------------------

  function renderRows(rows) {
    rowsById.clear();
    el.experienceList.innerHTML = "";

    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = "No experience entries yet. Use the form below to add your first one.";
      el.experienceList.appendChild(empty);
      return;
    }

    rows.forEach((row) => {
      rowsById.set(row.id, row);
      const meta = [row.period_en || "", row.place || ""].filter(Boolean).join(" - ");
      const item = document.createElement("li");
      item.className = "experience-row";
      item.innerHTML =
        '<div class="experience-row-main">' +
        '<span class="experience-position">#' +
        Data.escapeHtml(row.position) +
        "</span>" +
        "<h3>" +
        Data.escapeHtml(row.title_en || "(no English title)") +
        "</h3>" +
        "<p>" +
        Data.escapeHtml(meta) +
        "</p>" +
        "</div>" +
        '<div class="experience-row-actions">' +
        '<button class="btn-outline" type="button" data-action="edit" data-id="' +
        Data.escapeHtml(row.id) +
        '">Edit</button>' +
        '<button class="btn-outline danger" type="button" data-action="delete" data-id="' +
        Data.escapeHtml(row.id) +
        '">Delete</button>' +
        "</div>";
      el.experienceList.appendChild(item);
    });
  }

  async function loadRows() {
    setStatus(el.listStatus, "", false);
    try {
      const rows = (await Data.fetchExperiences()) || [];
      renderRows(rows);
      setStatus(el.listStatus, rows.length === 1 ? "1 entry." : rows.length + " entries.", false);
    } catch (error) {
      renderRows([]);
      setStatus(el.listStatus, errorMessage(error, "Could not load experience entries."), true);
    }
  }

  function handleListClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    const row = rowsById.get(button.dataset.id);
    if (!row) {
      return;
    }
    if (button.dataset.action === "edit") {
      startEdit(row);
    } else if (button.dataset.action === "delete") {
      removeRow(row);
    }
  }

  async function removeRow(row) {
    const label = row.title_en || "this entry";
    if (!window.confirm('Delete "' + label + '"?')) {
      return;
    }
    setStatus(el.listStatus, "Deleting...", false);
    try {
      await Data.deleteExperience(row.id);
      if (editingId === row.id) {
        resetForm();
      }
      await loadRows();
      setStatus(el.listStatus, "Entry deleted.", false);
    } catch (error) {
      setStatus(el.listStatus, errorMessage(error, "Could not delete this entry."), true);
    }
  }

  // -------------------------------------------------------------------
  // Add / edit form
  // -------------------------------------------------------------------

  function nextPosition() {
    let highest = 0;
    rowsById.forEach((row) => {
      const value = Number(row.position);
      if (!isNaN(value) && value > highest) {
        highest = value;
      }
    });
    return highest + 1;
  }

  function setFieldValue(id, value) {
    const field = byId(id);
    if (field) {
      field.value = value === null || value === undefined ? "" : value;
    }
  }

  function resetForm() {
    editingId = null;
    setFieldValue("field-position", nextPosition());
    setFieldValue("field-period-en", "");
    setFieldValue("field-period-km", "");
    setFieldValue("field-title-en", "");
    setFieldValue("field-title-km", "");
    setFieldValue("field-place", "");
    setFieldValue("field-description-en", "");
    setFieldValue("field-description-km", "");
    el.formTitle.innerHTML = '<i class="fas fa-pen"></i> Add experience';
    el.saveExperience.innerHTML = '<i class="fas fa-floppy-disk"></i> Save experience';
    el.cancelEdit.hidden = true;
    setStatus(el.formStatus, "", false);
  }

  function startEdit(row) {
    editingId = row.id;
    setFieldValue("field-position", row.position);
    setFieldValue("field-period-en", row.period_en);
    setFieldValue("field-period-km", row.period_km);
    setFieldValue("field-title-en", row.title_en);
    setFieldValue("field-title-km", row.title_km);
    setFieldValue("field-place", row.place);
    setFieldValue("field-description-en", row.description_en);
    setFieldValue("field-description-km", row.description_km);
    el.formTitle.innerHTML = '<i class="fas fa-pen"></i> Update experience';
    el.saveExperience.innerHTML = '<i class="fas fa-floppy-disk"></i> Update experience';
    el.cancelEdit.hidden = false;
    setStatus(el.formStatus, "Editing an existing entry.", false);
    el.formTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fieldValue(id) {
    const field = byId(id);
    return field ? field.value.trim() : "";
  }

  function buildEntry() {
    const position = Number(fieldValue("field-position"));
    return {
      position: isNaN(position) ? nextPosition() : position,
      period_en: fieldValue("field-period-en"),
      period_km: fieldValue("field-period-km"),
      title_en: fieldValue("field-title-en"),
      title_km: fieldValue("field-title-km"),
      place: fieldValue("field-place"),
      description_en: fieldValue("field-description-en"),
      description_km: fieldValue("field-description-km"),
    };
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    const entry = buildEntry();

    if (!entry.title_en || !entry.period_en) {
      setStatus(el.formStatus, "The English title and English period are required.", true);
      return;
    }

    setBusy(el.saveExperience, true, "Saving...");
    let message = "";
    try {
      if (editingId) {
        await Data.updateExperience(editingId, entry);
        message = "Experience updated.";
      } else {
        await Data.createExperience(entry);
        message = "Experience added. Reload the portfolio to see it in the timeline.";
      }
      await loadRows();
      resetForm();
    } catch (error) {
      setStatus(el.formStatus, errorMessage(error, "Could not save this entry."), true);
      setBusy(el.saveExperience, false);
      return;
    }
    setBusy(el.saveExperience, false);
    setStatus(el.formStatus, message, false);
  }

  // -------------------------------------------------------------------
  // CV upload
  // -------------------------------------------------------------------

  async function loadCv() {
    try {
      const settings = (await Data.fetchSettings()) || {};
      const url = settings.cv_url || Data.DEFAULT_CV_URL;
      el.cvCurrentLink.href = url;
      el.cvCurrentLink.textContent = settings.cv_name || url.split("/").pop();

      if (settings.cv_updated_at) {
        el.cvUpdated.hidden = false;
        el.cvUpdated.textContent = "Last updated: " + formatDate(settings.cv_updated_at);
      } else {
        el.cvUpdated.hidden = true;
        el.cvUpdated.textContent = "";
      }
      return settings;
    } catch (error) {
      setStatus(el.cvStatus, errorMessage(error, "Could not load the current CV details."), true);
      return {};
    }
  }

  async function handleCvUpload() {
    const file = el.cvFile.files && el.cvFile.files[0];
    if (!file) {
      setStatus(el.cvStatus, "Choose a PDF file first.", true);
      return;
    }
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setStatus(el.cvStatus, "Only PDF files can be uploaded.", true);
      return;
    }

    const settings = (await Data.fetchSettings()) || {};
    if (settings.cv_url && !window.confirm("Replace the CV file that is currently on the site?")) {
      return;
    }

    setBusy(el.cvUpload, true, "Uploading...");
    setStatus(el.cvStatus, "", false);
    try {
      const result = await Data.uploadCv(file);
      el.cvFile.value = "";
      await loadCv();
      setStatus(el.cvStatus, "CV updated to " + result.name + ". Reload the portfolio to check it.", false);
    } catch (error) {
      setStatus(el.cvStatus, errorMessage(error, "Could not upload the CV."), true);
    } finally {
      setBusy(el.cvUpload, false);
    }
  }

  // -------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------

  function cacheElements() {
    [
      "setup-notice",
      "auth-card",
      "auth-status",
      "login-form",
      "login-email",
      "login-password",
      "login-button",
      "sign-out",
      "dashboard",
      "admin-email",
      "cv-file",
      "cv-upload",
      "cv-status",
      "cv-current-link",
      "cv-updated",
      "experience-list",
      "list-status",
      "form-title",
      "experience-form",
      "save-experience",
      "cancel-edit",
      "form-status",
    ].forEach((id) => {
      el[id.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = byId(id);
    });
  }

  async function init() {
    if (window.localStorage && localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark-mode");
    }

    cacheElements();

    if (!Data || typeof Data.isConfigured !== "function" || !Data.isConfigured()) {
      showSetupNotice();
      return;
    }

    el.loginForm.addEventListener("submit", handleLogin);
    el.signOut.addEventListener("click", handleSignOut);
    el.experienceList.addEventListener("click", handleListClick);
    el.experienceForm.addEventListener("submit", handleFormSubmit);
    el.cancelEdit.addEventListener("click", resetForm);
    el.cvUpload.addEventListener("click", handleCvUpload);

    const session = await Data.getSession();
    if (session) {
      await showDashboard(session);
    } else {
      showLogin();
    }

    // Keep the UI honest if the session expires in another tab.
    Data.onAuthChange((nextSession) => {
      if (!nextSession && dashboardReady) {
        showLogin();
        setStatus(el.authStatus, "Your session ended. Please sign in again.", true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
