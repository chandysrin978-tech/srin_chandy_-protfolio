/**
 * Admin panel logic: sign in, manage the resume timeline, the project cards,
 * the CV and every editable text on the site.
 * All reads/writes go through window.PortfolioData (js/portfolio-data.js).
 */
(function () {
  const Data = window.PortfolioData;

  const el = {};
  const rowsById = new Map();
  let editingId = null;
  const projectRowsById = new Map();
  let editingProjectId = null;
  let contentSettings = {};
  let dashboardReady = false;
  let activePanel = "projects";

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

  // Title shown in the top bar while a sidebar item is selected.
  const PANEL_META = {
    projects: { title: "Content Studio & Projects", icon: "fa-diagram-project" },
    experience: { title: "Experience & Timeline", icon: "fa-clock-rotate-left" },
    content: { title: "Site Content", icon: "fa-pen-to-square" },
  };

  // The sign-in and setup screens show a single centred card, so the sidebar is
  // hidden by this body class (see css/admin.css).
  function setScreen(name) {
    document.body.classList.toggle("auth-screen", name !== "dashboard");
  }

  // Stat tiles summarise whatever is currently loaded in the panel.
  function updateStats() {
    const set = (node, value) => {
      if (node) {
        node.textContent = String(value);
      }
    };
    set(el.statProjects, projectRowsById.size);
    set(el.statExperiences, rowsById.size);
    set(el.statSections, el.contentEditor ? el.contentEditor.querySelectorAll(".field-group").length : 0);
    set(el.statFields, el.contentEditor ? el.contentEditor.querySelectorAll("[data-content-key]").length : 0);
  }

  // -------------------------------------------------------------------
  // Screens
  // -------------------------------------------------------------------

  function showSetupNotice() {
    setScreen("setup");
    el.setupNotice.hidden = false;
    el.authCard.hidden = true;
    el.dashboard.hidden = true;
    el.signOut.hidden = true;
  }

  function showLogin() {
    editingId = null;
    editingProjectId = null;
    dashboardReady = false;
    rowsById.clear();
    projectRowsById.clear();
    setScreen("login");
    updateStats();
    resetProjectForm();
    el.setupNotice.hidden = true;
    el.dashboard.hidden = true;
    el.authCard.hidden = false;
    el.signOut.hidden = true;
    setStatus(el.authStatus, "", false);
  }

  async  function showDashboard(session) {
    setScreen("dashboard");
    el.setupNotice.hidden = true;
    el.authCard.hidden = true;
    el.dashboard.hidden = false;
    el.signOut.hidden = false;
    showPanel(activePanel);
    el.adminEmail.textContent = (session && session.user && session.user.email) || "admin";
    if (!dashboardReady) {
      dashboardReady = true;
      await Promise.all([loadRows(), loadCv(), loadProjects(), loadContent()]);
      // After the first load, so the default order number follows the existing rows.
      resetForm();
      resetProjectForm();
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
      empty.innerHTML =
        '<i class="fas fa-clock-rotate-left" aria-hidden="true"></i>' +
        "No experience entries yet. Use the form below to add your first one.";
      el.experienceList.appendChild(empty);
      return;
    }

    rows.forEach((row) => {
      rowsById.set(row.id, row);
      const meta = [row.period_en || "", row.place || ""].filter(Boolean).join(" - ");
      const initial = (row.title_en || "?").trim().charAt(0).toUpperCase() || "?";
      const item = document.createElement("li");
      item.className = "experience-row";
      item.innerHTML =
        '<span class="row-thumb" aria-hidden="true">' +
        Data.escapeHtml(initial) +
        "</span>" +
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

    renderExperienceSummary(rows);
    updateStats();
  }

  // Right-rail list that mirrors the timeline, plus the count badge.
  function renderExperienceSummary(rows) {
    if (el.experienceCount) {
      el.experienceCount.textContent = String(rows.length);
    }
    if (!el.experienceSummary) {
      return;
    }
    el.experienceSummary.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.innerHTML = '<i class="fas fa-inbox" aria-hidden="true"></i>No entries yet.';
      el.experienceSummary.appendChild(empty);
      return;
    }
    rows.slice(0, 4).forEach((row) => {
      const meta = [row.period_en || "", row.place || ""].filter(Boolean).join(" - ");
      const item = document.createElement("li");
      item.innerHTML =
        "<strong>" +
        Data.escapeHtml(row.title_en || "(no English title)") +
        "</strong><span>" +
        Data.escapeHtml(meta || "No period set") +
        "</span>";
      el.experienceSummary.appendChild(item);
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
  // Project cards
  // -------------------------------------------------------------------

  function renderProjectRows(rows) {
    projectRowsById.clear();
    el.projectList.innerHTML = "";

    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.innerHTML =
        '<i class="fas fa-diagram-project" aria-hidden="true"></i>' +
        "No projects yet. Use the form below to add your first card.";
      el.projectList.appendChild(empty);
      return;
    }

    rows.forEach((row) => {
      projectRowsById.set(row.id, row);
      const meta = [row.type_en || "", row.tools || ""].filter(Boolean).join(" - ");
      const thumb = row.image_url
        ? '<img class="row-thumb" src="' + Data.escapeHtml(row.image_url) + '" alt="" loading="lazy">'
        : '<span class="row-thumb" aria-hidden="true"><i class="fas fa-image"></i></span>';
      const featured = row.featured ? '<span class="badge badge-featured">Featured</span>' : "";
      const item = document.createElement("li");
      item.className = "experience-row";
      item.innerHTML =
        thumb +
        '<div class="experience-row-main">' +
        '<div class="experience-row-title">' +
        '<span class="experience-position">#' +
        Data.escapeHtml(row.position) +
        "</span>" +
        "<h3>" +
        Data.escapeHtml(row.title || "(no title)") +
        "</h3>" +
        featured +
        "</div>" +
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
      el.projectList.appendChild(item);
    });

    updateStats();
  }

  async function loadProjects() {
    setStatus(el.projectListStatus, "", false);
    try {
      const rows = (await Data.fetchProjects()) || [];
      renderProjectRows(rows);
      setStatus(el.projectListStatus, rows.length === 1 ? "1 project." : rows.length + " projects.", false);
    } catch (error) {
      renderProjectRows([]);
      setStatus(el.projectListStatus, errorMessage(error, "Could not load projects."), true);
    }
  }

  function handleProjectListClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    const row = projectRowsById.get(button.dataset.id);
    if (!row) {
      return;
    }
    if (button.dataset.action === "edit") {
      startProjectEdit(row);
    } else if (button.dataset.action === "delete") {
      removeProject(row);
    }
  }

  async function removeProject(row) {
    const label = row.title || "this project";
    if (!window.confirm('Delete "' + label + '"?')) {
      return;
    }
    setStatus(el.projectListStatus, "Deleting...", false);
    try {
      await Data.deleteProject(row.id);
      if (editingProjectId === row.id) {
        resetProjectForm();
      }
      await loadProjects();
      setStatus(el.projectListStatus, "Project deleted.", false);
    } catch (error) {
      setStatus(el.projectListStatus, errorMessage(error, "Could not delete this project."), true);
    }
  }

  function nextProjectPosition() {
    let highest = 0;
    projectRowsById.forEach((row) => {
      const value = Number(row.position);
      if (!isNaN(value) && value > highest) {
        highest = value;
      }
    });
    return highest + 1;
  }

  function resetProjectForm() {
    editingProjectId = null;
    setFieldValue("project-position", nextProjectPosition());
    setFieldValue("project-title", "");
    setFieldValue("project-title-km", "");
    setFieldValue("project-type-en", "");
    setFieldValue("project-type-km", "");
    setFieldValue("project-tools", "");
    setFieldValue("project-description-en", "");
    setFieldValue("project-description-km", "");
    setFieldValue("project-image-url", "");
    setFieldValue("project-link1-url", "");
    setFieldValue("project-link1-en", "");
    setFieldValue("project-link1-km", "");
    setFieldValue("project-link2-url", "");
    setFieldValue("project-link2-en", "");
    setFieldValue("project-link2-km", "");
    if (el.projectFeatured) {
      el.projectFeatured.checked = false;
    }
    if (el.projectImageFile) {
      el.projectImageFile.value = "";
    }
    if (el.projectFormTitle) {
      el.projectFormTitle.innerHTML = '<i class="fas fa-plus"></i> Add project';
    }
    if (el.saveProject) {
      el.saveProject.innerHTML = '<i class="fas fa-floppy-disk"></i> Save project';
    }
    if (el.cancelProjectEdit) {
      el.cancelProjectEdit.hidden = true;
    }
    setStatus(el.projectFormStatus, "", false);
  }

  function startProjectEdit(row) {
    editingProjectId = row.id;
    setFieldValue("project-position", row.position);
    setFieldValue("project-title", row.title);
    setFieldValue("project-title-km", row.title_km);
    setFieldValue("project-type-en", row.type_en);
    setFieldValue("project-type-km", row.type_km);
    setFieldValue("project-tools", row.tools);
    setFieldValue("project-description-en", row.description_en);
    setFieldValue("project-description-km", row.description_km);
    setFieldValue("project-image-url", row.image_url);
    setFieldValue("project-link1-url", row.link1_url);
    setFieldValue("project-link1-en", row.link1_en);
    setFieldValue("project-link1-km", row.link1_km);
    setFieldValue("project-link2-url", row.link2_url);
    setFieldValue("project-link2-en", row.link2_en);
    setFieldValue("project-link2-km", row.link2_km);
    if (el.projectFeatured) {
      el.projectFeatured.checked = Boolean(row.featured);
    }
    el.projectFormTitle.innerHTML = '<i class="fas fa-pen"></i> Update project';
    el.saveProject.innerHTML = '<i class="fas fa-floppy-disk"></i> Update project';
    el.cancelProjectEdit.hidden = false;
    setStatus(el.projectFormStatus, "Editing an existing project.", false);
    el.projectFormTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildProject() {
    const position = Number(fieldValue("project-position"));
    return {
      position: isNaN(position) ? nextProjectPosition() : position,
      title: fieldValue("project-title"),
      title_km: fieldValue("project-title-km"),
      type_en: fieldValue("project-type-en"),
      type_km: fieldValue("project-type-km"),
      tools: fieldValue("project-tools"),
      description_en: fieldValue("project-description-en"),
      description_km: fieldValue("project-description-km"),
      image_url: fieldValue("project-image-url"),
      link1_url: fieldValue("project-link1-url"),
      link1_en: fieldValue("project-link1-en"),
      link1_km: fieldValue("project-link1-km"),
      link2_url: fieldValue("project-link2-url"),
      link2_en: fieldValue("project-link2-en"),
      link2_km: fieldValue("project-link2-km"),
      featured: Boolean(el.projectFeatured && el.projectFeatured.checked),
    };
  }

  async function handleProjectSubmit(event) {
    event.preventDefault();
    const project = buildProject();

    if (!project.title) {
      setStatus(el.projectFormStatus, "The English title is required.", true);
      return;
    }

    setBusy(el.saveProject, true, "Saving...");
    let message = "";
    try {
      if (editingProjectId) {
        await Data.updateProject(editingProjectId, project);
        message = "Project updated.";
      } else {
        await Data.createProject(project);
        message = "Project added.";
      }
      await loadProjects();
      resetProjectForm();
      message += " Reload the portfolio to see the Projects section.";
    } catch (error) {
      setStatus(el.projectFormStatus, errorMessage(error, "Could not save this project."), true);
      setBusy(el.saveProject, false);
      return;
    }
    setBusy(el.saveProject, false);
    setStatus(el.projectFormStatus, message, false);
  }

  async function handleProjectImageUpload() {
    const file = el.projectImageFile && el.projectImageFile.files && el.projectImageFile.files[0];
    if (!file) {
      setStatus(el.projectFormStatus, "Choose an image file first.", true);
      return;
    }
    setBusy(el.uploadProjectImage, true, "Uploading...");
    setStatus(el.projectFormStatus, "", false);
    try {
      const url = await Data.uploadImage(file);
      el.projectImageUrl.value = url;
      el.projectImageFile.value = "";
      setStatus(el.projectFormStatus, "Image uploaded. Save the project to keep it.", false);
    } catch (error) {
      setStatus(el.projectFormStatus, errorMessage(error, "Could not upload the image."), true);
    } finally {
      setBusy(el.uploadProjectImage, false);
    }
  }

  // -------------------------------------------------------------------
  // Site content
  // -------------------------------------------------------------------

  function fieldDefault(field, lang) {
    return field["default_" + lang] || "";
  }

  function buildContentImageField(field) {
    const wrapper = document.createElement("div");
    wrapper.className = "field field-wide";
    wrapper.setAttribute("data-image-key", field.key);
    wrapper.innerHTML =
      '<label for="content-' +
      field.key +
      '">' +
      Data.escapeHtml(field.label) +
      "</label>" +
      '<input id="content-' +
      field.key +
      '" type="text" data-content-key="' +
      Data.escapeHtml(field.key) +
      '" data-type="image" placeholder="https://... or an uploaded URL">' +
      '<div class="file-row">' +
      '<input type="file" class="content-image-file" accept="image/*">' +
      '<button type="button" class="btn-outline content-image-upload" data-upload-key="' +
      Data.escapeHtml(field.key) +
      '"><i class="fas fa-upload"></i> Upload</button>' +
      "</div>";
    const saved = contentSettings[field.key];
    wrapper.querySelector('input[type="text"]').value = saved !== undefined ? saved : "";
    return wrapper;
  }

  function buildContentField(field) {
    if (field.type === "list") {
      const wrapper = document.createElement("div");
      wrapper.className = "field field-wide";
      wrapper.innerHTML =
        '<label for="content-' +
        field.key +
        '">' +
        Data.escapeHtml(field.label) +
        "</label>" +
        '<textarea id="content-' +
        field.key +
        '" rows="5" data-content-key="' +
        Data.escapeHtml(field.key) +
        '" data-type="list"></textarea>' +
        '<small class="field-hint">One item per line. Use "English | Khmer" to translate an item.</small>';
      let items = field.default_items || [];
      const saved = contentSettings[field.key];
      if (saved) {
        try {
          items = JSON.parse(saved);
        } catch (error) {
          items = field.default_items || [];
        }
      }
      wrapper.querySelector("textarea").value = window.PORTFOLIO_CONTENT.itemsToText(items);
      return wrapper;
    }

    if (field.type === "image") {
      return buildContentImageField(field);
    }

    if (field.type === "url") {
      const wrapper = document.createElement("div");
      wrapper.className = "field field-wide";
      wrapper.innerHTML =
        '<label for="content-' +
        field.key +
        '">' +
        Data.escapeHtml(field.label) +
        "</label>" +
        '<input id="content-' +
        field.key +
        '" type="text" data-content-key="' +
        Data.escapeHtml(field.key) +
        '" data-type="url">';
      const saved = contentSettings[field.key];
      wrapper.querySelector("input").value = saved !== undefined ? saved : field.default || "";
      return wrapper;
    }

    // text / textarea: English and Khmer sit side by side in one row.
    const wrapper = document.createElement("div");
    wrapper.className = "field field-wide lang-pair";
    const multiline = field.type === "textarea";

    ["en", "km"].forEach((lang) => {
      const saved = contentSettings[field.key + "_" + lang];
      const id = "content-" + field.key + "-" + lang;

      const cell = document.createElement("div");
      cell.className = "field";

      const label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = field.label + (lang === "en" ? " (English)" : " (Khmer)");

      const input = document.createElement(multiline ? "textarea" : "input");
      if (multiline) {
        input.rows = 3;
      } else {
        input.type = "text";
      }
      input.id = id;
      input.dataset.contentKey = field.key;
      input.dataset.lang = lang;
      input.value = saved !== undefined ? saved : fieldDefault(field, lang);

      cell.appendChild(label);
      cell.appendChild(input);
      wrapper.appendChild(cell);
    });

    return wrapper;
  }

  function renderContentEditor() {
    const schema = window.PORTFOLIO_CONTENT;
    el.contentEditor.innerHTML = "";

    if (!schema || typeof schema.getGroups !== "function") {
      setStatus(el.contentStatus, "Could not load js/content-schema.js.", true);
      return;
    }

    schema.getGroups().forEach((group, index) => {
      // Collapsible groups keep the long field list scannable; open the first one.
      const details = document.createElement("details");
      details.className = "field-group";
      details.open = index === 0;

      const summary = document.createElement("summary");
      summary.textContent = group.label;
      details.appendChild(summary);

      const grid = document.createElement("div");
      grid.className = "form-grid";
      details.appendChild(grid);

      group.fields.forEach((field) => {
        grid.appendChild(buildContentField(field));
      });

      el.contentEditor.appendChild(details);
    });

    updateStats();
  }

  async function loadContent() {
    setStatus(el.contentStatus, "", false);
    try {
      contentSettings = (await Data.fetchSettings()) || {};
    } catch (error) {
      contentSettings = {};
      setStatus(el.contentStatus, errorMessage(error, "Could not load the saved content."), true);
    }
    renderContentEditor();
  }

  async function handleContentSubmit(event) {
    event.preventDefault();
    const schema = window.PORTFOLIO_CONTENT;
    if (!schema) {
      setStatus(el.contentStatus, "Could not load js/content-schema.js.", true);
      return;
    }

    const inputs = el.contentEditor.querySelectorAll("[data-content-key]");
    setBusy(el.saveContent, true, "Saving...");
    setStatus(el.contentStatus, "", false);
    try {
      for (const input of inputs) {
        const key = input.dataset.contentKey;
        const value = input.value;
        if (input.dataset.type === "list") {
          await Data.upsertSetting(key, JSON.stringify(schema.textToItems(value)));
        } else if (input.dataset.lang) {
          await Data.upsertSetting(key + "_" + input.dataset.lang, value);
        } else if (value) {
          await Data.upsertSetting(key, value);
        }
      }
      await loadContent();
      setStatus(el.contentStatus, "Content saved. Reload the portfolio to see it.", false);
    } catch (error) {
      setStatus(el.contentStatus, errorMessage(error, "Could not save the content."), true);
    } finally {
      setBusy(el.saveContent, false);
    }
  }

  async function handleContentEditorClick(event) {
    const button = event.target.closest(".content-image-upload");
    if (!button) {
      return;
    }
    const wrapper = button.closest("[data-image-key]");
    if (!wrapper) {
      return;
    }
    const fileInput = wrapper.querySelector(".content-image-file");
    const urlInput = wrapper.querySelector("[data-content-key]");
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) {
      setStatus(el.contentStatus, "Choose an image file first.", true);
      return;
    }
    setBusy(button, true, "Uploading...");
    setStatus(el.contentStatus, "", false);
    try {
      urlInput.value = await Data.uploadImage(file);
      fileInput.value = "";
      setStatus(el.contentStatus, "Image uploaded. Press Save content to keep it.", false);
    } catch (error) {
      setStatus(el.contentStatus, errorMessage(error, "Could not upload the image."), true);
    } finally {
      setBusy(button, false);
    }
  }

  // -------------------------------------------------------------------
  // Tabs
  // Only one dashboard panel is visible at a time, so the page stays short
  // and each task (experiences, projects, CV, content) has its own screen.
  // -------------------------------------------------------------------

  function showPanel(name) {
    activePanel = name;
    document.querySelectorAll(".admin-panel").forEach((panel) => {
      panel.hidden = panel.id !== "panel-" + name;
    });
    if (el.adminTabs) {
      el.adminTabs.querySelectorAll("[data-panel]").forEach((tab) => {
        const isActive = tab.dataset.panel === name;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }
    if (el.pageTitle) {
      const meta = PANEL_META[name] || PANEL_META.projects;
      el.pageTitle.innerHTML = '<i class="fas ' + meta.icon + '"></i> ' + Data.escapeHtml(meta.title);
    }
  }

  function handleTabClick(event) {
    const tab = event.target.closest("[data-panel]");
    if (tab) {
      showPanel(tab.dataset.panel);
    }
  }

  // -------------------------------------------------------------------
  // Theme
  // Uses the same "theme" localStorage key as the portfolio, so the choice
  // carries over between admin.html and index.html.
  // -------------------------------------------------------------------

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);

    const toggle = el.themeToggle;
    if (toggle) {
      toggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      const label = isDark ? "Switch to light mode" : "Switch to dark mode";
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }
  }

  function toggleTheme() {
    const next = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(next);
    if (window.localStorage) {
      localStorage.setItem("theme", next);
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
      "theme-toggle",
      "dashboard",
      "admin-tabs",
      "admin-email",
      "page-title",
      "stat-projects",
      "stat-experiences",
      "stat-sections",
      "stat-fields",
      "experience-summary",
      "experience-count",
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
      "project-list",
      "project-list-status",
      "project-form",
      "project-form-title",
      "project-position",
      "project-title",
      "project-title-km",
      "project-type-en",
      "project-type-km",
      "project-tools",
      "project-description-en",
      "project-description-km",
      "project-image-url",
      "project-image-file",
      "upload-project-image",
      "project-link1-url",
      "project-link1-en",
      "project-link1-km",
      "project-link2-url",
      "project-link2-en",
      "project-link2-km",
      "project-featured",
      "save-project",
      "cancel-project-edit",
      "project-form-status",
      "content-form",
      "content-editor",
      "save-content",
      "reload-content",
      "content-status",
    ].forEach((id) => {
      el[id.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = byId(id);
    });
  }

  async function init() {
    cacheElements();

    // Apply the saved theme (shared with the portfolio) and wire the toggle,
    // so it works on the sign-in, setup and dashboard screens alike.
    const savedTheme = (window.localStorage && localStorage.getItem("theme")) || "light";
    applyTheme(savedTheme);
    if (el.themeToggle) {
      el.themeToggle.addEventListener("click", toggleTheme);
    }

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
    el.projectList.addEventListener("click", handleProjectListClick);
    el.projectForm.addEventListener("submit", handleProjectSubmit);
    el.cancelProjectEdit.addEventListener("click", resetProjectForm);
    el.uploadProjectImage.addEventListener("click", handleProjectImageUpload);
    el.contentForm.addEventListener("submit", handleContentSubmit);
    el.reloadContent.addEventListener("click", () => {
      setStatus(el.contentStatus, "", false);
      loadContent();
    });
    el.contentEditor.addEventListener("click", handleContentEditorClick);
    if (el.adminTabs) {
      el.adminTabs.addEventListener("click", handleTabClick);
    }

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
