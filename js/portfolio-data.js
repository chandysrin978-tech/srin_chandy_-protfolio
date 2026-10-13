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
  const TABLES = { experiences: "experiences", settings: "site_settings" };
  const CV_BUCKET = "cv";
  const CV_FILE_NAME = "SrinChandy_CV.pdf";
  const DEFAULT_CV_URL = "assets/SrinChandy_CV.pdf";
  const EXPERIENCE_LIST_ID = "experience-timeline";

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
  // Site settings (CV link and other small values)
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
      const [entries, settings] = await Promise.all([fetchExperiences(), fetchSettings()]);
      renderExperiences(entries);
      renderCv(settings);
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
    fetchSettings,
    upsertSetting,
    uploadCv,
    escapeHtml,
    buildExperienceItemHTML,
    renderExperiences,
    renderCv,
    initPortfolio,
  };
})();
