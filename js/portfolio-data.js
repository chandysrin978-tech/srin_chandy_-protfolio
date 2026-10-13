/**
 * Shared data layer for the portfolio site and the admin panel.
 *
 * When Supabase credentials are set in js/supabase-config.js the resume
 * timeline and the CV download link are loaded from Supabase. Otherwise the
 * static HTML in index.html is left untouched, so the site always works.
 *
 * Exposed as window.PortfolioData — see admin.js for the write operations.
 */
(function () {
  const CONFIG = window.PORTFOLIO_CONFIG || {};
  const TABLES = { experiences: "experiences", projects: "projects", settings: "site_settings" };
  const CV_BUCKET = "cv";
  const CV_FILE_NAME = "SrinChandy_CV.pdf";
  const DEFAULT_CV_URL = "assets/SrinChandy_CV.pdf";
  const EXPERIENCE_LIST_ID = "experience-timeline";
  const MEDIA_BUCKET = "media";
  const PROJECTS_LIST_ID = "projects-list";
  const PROJECT_IMAGE_FALLBACK = "images/about.png";

  let client = null;

  function isConfigured() {
    return Boolean(
      CONFIG.supabaseUrl &&
        CONFIG.supabaseAnonKey &&
        window.supabase &&
        typeof window.supabase.createClient === "function"
    );
  }

  function getClient() {
    if (!isConfigured()) {
      return null;
    }
    if (!client) {
      client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    }
    return client;
  }

  function requireClient() {
    const activeClient = getClient();
    if (!activeClient) {
      throw new Error("Supabase is not configured. Add your URL and anon key to js/supabase-config.js.");
    }
    return activeClient;
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  async function signIn(email, password) {
    const { data, error } = await requireClient().auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || ""),
    });
    if (error) {
      throw error;
    }
    return data.session;
  }

  async function signOut() {
    const activeClient = getClient();
    if (activeClient) {
      await activeClient.auth.signOut();
    }
  }

  async function getSession() {
    const activeClient = getClient();
    if (!activeClient) {
      return null;
    }
    const { data } = await activeClient.auth.getSession();
    return data ? data.session : null;
  }

  function onAuthChange(callback) {
    const activeClient = getClient();
    if (!activeClient || typeof callback !== "function") {
      return function () {};
    }
    const { data } = activeClient.auth.onAuthStateChange((_event, session) => callback(session));
    return function () {
      if (data && data.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }

  // -------------------------------------------------------------------------
  // Experience entries
  // -------------------------------------------------------------------------

  async function fetchExperiences() {
    const activeClient = getClient();
    if (!activeClient) {
      return null;
    }
    const { data, error } = await activeClient
      .from(TABLES.experiences)
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      throw error;
    }
    return data || [];
  }

  async function createExperience(entry) {
    const { data, error } = await requireClient()
      .from(TABLES.experiences)
      .insert(entry)
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  async function updateExperience(id, entry) {
    const { data, error } = await requireClient()
      .from(TABLES.experiences)
      .update(entry)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  async function deleteExperience(id) {
    const { error } = await requireClient().from(TABLES.experiences).delete().eq("id", id);
    if (error) {
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------

  async function fetchProjects() {
    const activeClient = getClient();
    if (!activeClient) {
      return null;
    }
    const { data, error } = await activeClient
      .from(TABLES.projects)
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      throw error;
    }
    return data || [];
  }

  async function createProject(project) {
    const { data, error } = await requireClient()
      .from(TABLES.projects)
      .insert(project)
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  async function updateProject(id, project) {
    const { data, error } = await requireClient()
      .from(TABLES.projects)
      .update(project)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  async function deleteProject(id) {
    const { error } = await requireClient().from(TABLES.projects).delete().eq("id", id);
    if (error) {
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Site settings (CV link and every editable text value)
  // -------------------------------------------------------------------------

  async function fetchSettings() {
    const activeClient = getClient();
    if (!activeClient) {
      return null;
    }
    const { data, error } = await activeClient.from(TABLES.settings).select("key, value");
    if (error) {
      throw error;
    }
    const settings = {};
    (data || []).forEach((row) => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  async function upsertSetting(key, value) {
    const { error } = await requireClient()
      .from(TABLES.settings)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      throw error;
    }
  }

  async function uploadCv(file) {
    if (!file) {
      throw new Error("Choose a PDF file first.");
    }
    const activeClient = requireClient();
    const { error } = await activeClient.storage.from(CV_BUCKET).upload(CV_FILE_NAME, file, {
      upsert: true,
      contentType: "application/pdf",
      cacheControl: "0",
    });
    if (error) {
      throw error;
    }
    const { data } = activeClient.storage.from(CV_BUCKET).getPublicUrl(CV_FILE_NAME);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    await upsertSetting("cv_url", url);
    await upsertSetting("cv_name", file.name || CV_FILE_NAME);
    await upsertSetting("cv_updated_at", new Date().toISOString());
    return { url, name: file.name || CV_FILE_NAME };
  }

  async function uploadImage(file) {
    if (!file) {
      throw new Error("Choose an image file first.");
    }
    const activeClient = requireClient();
    const safeName = String(file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const path = `uploads/${Date.now()}-${safeName}`;
    const { error } = await activeClient.storage.from(MEDIA_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
      cacheControl: "3600",
    });
    if (error) {
      throw error;
    }
    const { data } = activeClient.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // -------------------------------------------------------------------------
  // Rendering helpers (shared by the site and the admin preview)
  // -------------------------------------------------------------------------

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function buildExperienceItemHTML(entry) {
    const item = entry || {};
    const periodEn = item.period_en || "";
    const periodKm = item.period_km || periodEn;
    const titleEn = item.title_en || "";
    const titleKm = item.title_km || titleEn;
    const place = item.place || "";
    const descriptionEn = item.description_en || "";
    const descriptionKm = item.description_km || descriptionEn;

    const lines = [
      `<span data-en="${escapeHtml(periodEn)}" data-km="${escapeHtml(periodKm)}">${escapeHtml(periodEn)}</span>`,
      `<h3 data-en="${escapeHtml(titleEn)}" data-km="${escapeHtml(titleKm)}">${escapeHtml(titleEn)}</h3>`,
    ];

    if (place) {
      lines.push(`<p>${escapeHtml(place)}</p>`);
    }
    if (descriptionEn) {
      lines.push(
        `<p data-en="${escapeHtml(descriptionEn)}" data-km="${escapeHtml(descriptionKm)}">${escapeHtml(descriptionEn)}</p>`
      );
    }

    return `<div class="timeline-item">\n${lines.join("\n")}\n</div>`;
  }

  /** Re-applies the language currently stored in localStorage, if script.js is loaded. */
  function refreshLanguage() {
    if (typeof applyLanguage === "function") {
      applyLanguage(localStorage.getItem("language") || "en");
    }
  }

  /** Replaces the resume timeline with the given entries. Returns false when nothing changed. */
  function renderExperiences(entries, listId) {
    const container = document.getElementById(listId || EXPERIENCE_LIST_ID);
    if (!container || !entries || !entries.length) {
      return false;
    }
    container.innerHTML = entries.map(buildExperienceItemHTML).join("\n");
    refreshLanguage();
    return true;
  }

  function buildProjectLink(url, labelEn, labelKm, className) {
    if (!url) {
      return "";
    }
    const en = labelEn || labelKm || "Link";
    const km = labelKm || labelEn || en;
    const isAnchor = String(url).charAt(0) === "#";
    const attrs = isAnchor ? "" : ' target="_blank" rel="noopener"';
    return (
      '<a href="' +
      escapeHtml(url) +
      '"' +
      attrs +
      ' class="' +
      className +
      '" data-en="' +
      escapeHtml(en) +
      '" data-km="' +
      escapeHtml(km) +
      '">' +
      escapeHtml(en) +
      "</a>"
    );
  }

  function buildProjectCardHTML(project) {
    const item = project || {};
    const typeEn = item.type_en || "";
    const typeKm = item.type_km || typeEn;
    const title = item.title || "";
    const titleKm = item.title_km || title;
    const tools = item.tools || "";
    const descEn = item.description_en || "";
    const descKm = item.description_km || descEn;
    const image = item.image_url || PROJECT_IMAGE_FALLBACK;

    const lines = [
      `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">`,
      '<div class="project-content">',
    ];

    if (typeEn || typeKm) {
      lines.push(
        `<span class="project-type" data-en="${escapeHtml(typeEn)}" data-km="${escapeHtml(typeKm)}">${escapeHtml(
          typeEn || typeKm
        )}</span>`
      );
    }
    lines.push(`<h3 data-en="${escapeHtml(title)}" data-km="${escapeHtml(titleKm)}">${escapeHtml(title)}</h3>`);
    if (tools) {
      lines.push(`<div class="project-tools">${escapeHtml(tools)}</div>`);
    }
    if (descEn || descKm) {
      lines.push(
        `<p data-en="${escapeHtml(descEn)}" data-km="${escapeHtml(descKm)}">${escapeHtml(descEn || descKm)}</p>`
      );
    }

    const links =
      buildProjectLink(item.link1_url, item.link1_en, item.link1_km, "btn btn-small") +
      buildProjectLink(item.link2_url, item.link2_en, item.link2_km, "btn-outline");
    if (links) {
      lines.push(`<div class="project-links">${links}</div>`);
    }
    lines.push("</div>");

    const classes = "project glass-card" + (item.featured ? " featured-project" : "");
    return `<article class="${classes}">\n${lines.join("\n")}\n</article>`;
  }

  /**
   * style.css keeps .project cards and sections at opacity: 0 until script.js
   * marks them with .in-view. Cards built here are brand new nodes that the
   * first observer pass never saw, so hand them to the observer again — or mark
   * them directly when script.js is not on the page.
   */
  function revealContent(root) {
    if (typeof window.observeReveals === "function" && window.observeReveals(root)) {
      return;
    }
    (root || document).querySelectorAll(".project, section, .timeline").forEach((element) => {
      element.classList.add("in-view");
    });
  }

  /** Replaces the project cards with the saved rows. Returns false when nothing changed. */
  function renderProjects(projects) {
    const container = document.getElementById(PROJECTS_LIST_ID);
    if (!container || !projects || !projects.length) {
      return false;
    }
    container.innerHTML = projects.map(buildProjectCardHTML).join("\n");
    revealContent(container);
    refreshLanguage();
    return true;
  }

  /**
   * Applies saved site_settings values to the page, using the content schema in
   * js/content-schema.js. Bilingual fields write data-en/data-km (so the
   * language toggle keeps working); url fields write href; image fields write src.
   * Values that were never saved are skipped, leaving the built-in HTML alone.
   */
  function applyContent(settings) {
    const schema = window.PORTFOLIO_CONTENT;
    if (!schema || typeof schema.getFields !== "function" || !settings) {
      return false;
    }
    let changed = false;

    schema.getFields().forEach((field) => {
      if (field.type === "list") {
        const raw = settings[field.key];
        if (typeof raw !== "string" || !raw) {
          return;
        }
        let items;
        try {
          items = JSON.parse(raw);
        } catch (error) {
          return;
        }
        if (!Array.isArray(items) || !items.length) {
          return;
        }
        const html = items
          .map((item) => {
            const en = (item && (item.en || item.km)) || "";
            const km = (item && (item.km || item.en)) || "";
            return `<span data-en="${escapeHtml(en)}" data-km="${escapeHtml(km)}">${escapeHtml(en)}</span>`;
          })
          .join("");
        document.querySelectorAll(`[data-content-list="${field.key}"]`).forEach((container) => {
          container.innerHTML = html;
          changed = true;
        });
        return;
      }

      if (field.type === "url") {
        const value = settings[field.key];
        if (typeof value !== "string" || !value) {
          return;
        }
        document.querySelectorAll(`[data-content-href="${field.key}"]`).forEach((link) => {
          link.setAttribute("href", value);
          changed = true;
        });
        return;
      }

      if (field.type === "image") {
        const value = settings[field.key];
        if (typeof value !== "string" || !value) {
          return;
        }
        document.querySelectorAll(`[data-content-src="${field.key}"]`).forEach((image) => {
          image.setAttribute("src", value);
          changed = true;
        });
        return;
      }

      const en = settings[`${field.key}_en`];
      const km = settings[`${field.key}_km`];
      const hasEn = typeof en === "string" && en.length > 0;
      const hasKm = typeof km === "string" && km.length > 0;
      if (!hasEn && !hasKm) {
        return;
      }
      const finalEn = hasEn ? en : km;
      const finalKm = hasKm ? km : en;
      document.querySelectorAll(`[data-content="${field.key}"]`).forEach((element) => {
        element.dataset.en = finalEn;
        element.dataset.km = finalKm;
        element.textContent = finalEn;
        changed = true;
      });
    });

    if (changed) {
      refreshLanguage();
    }
    return changed;
  }

  /** Points every [data-cv-link] element at the uploaded CV, or the bundled fallback. */
  function renderCv(settings) {
    const configuredUrl = settings && settings.cv_url ? settings.cv_url : "";
    const url = configuredUrl || DEFAULT_CV_URL;

    document.querySelectorAll("[data-cv-link]").forEach((link) => {
      link.href = url;
      if (configuredUrl) {
        // Cross-origin files ignore the download attribute, so open them instead.
        link.removeAttribute("download");
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener");
      }
    });

    return url;
  }

  async function initPortfolio() {
    if (!isConfigured()) {
      return false;
    }
    try {
      const [entries, projects, settings] = await Promise.all([
        fetchExperiences(),
        fetchProjects(),
        fetchSettings(),
      ]);
      renderExperiences(entries);
      renderProjects(projects);
      renderCv(settings);
      applyContent(settings);
      return true;
    } catch (error) {
      console.warn("Could not load saved portfolio content, keeping the built-in content.", error);
      return false;
    }
  }

  window.PortfolioData = {
    TABLES,
    CV_BUCKET,
    CV_FILE_NAME,
    DEFAULT_CV_URL,
    EXPERIENCE_LIST_ID,
    MEDIA_BUCKET,
    PROJECTS_LIST_ID,
    PROJECT_IMAGE_FALLBACK,
    isConfigured,
    getClient,
    signIn,
    signOut,
    getSession,
    onAuthChange,
    fetchExperiences,
    createExperience,
    updateExperience,
    deleteExperience,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    fetchSettings,
    upsertSetting,
    uploadCv,
    uploadImage,
    escapeHtml,
    buildExperienceItemHTML,
    buildProjectCardHTML,
    renderExperiences,
    renderProjects,
    renderCv,
    applyContent,
    initPortfolio,
  };
})();
