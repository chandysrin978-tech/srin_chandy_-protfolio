function toggleTheme() {
  const body = document.body;
  const themeToggle = document.querySelector(".theme-toggle");

  body.classList.toggle("dark-mode");

  if (body.classList.contains("dark-mode")) {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem("theme", "dark");
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem("theme", "light");
  }
}

function toggleMenu() {
  document.querySelector("nav ul").classList.toggle("active");
  document.querySelector(".hamburger").classList.toggle("active");
}

function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let currentLanguage = localStorage.getItem("language") || "en";

function applyLanguage(language) {
  currentLanguage = language;
  document.documentElement.lang = language === "km" ? "km" : "en";

  document.querySelectorAll("[data-en][data-km]").forEach((element) => {
    element.textContent = element.dataset[language];
  });

  document.querySelectorAll("[data-placeholder-en][data-placeholder-km]").forEach((element) => {
    element.placeholder = element.dataset[`placeholder${language === "km" ? "Km" : "En"}`];
  });

  const languageToggle = document.querySelector(".language-toggle");
  if (languageToggle) {
    languageToggle.textContent = language === "en" ? "ភាសាខ្មែរ" : "English";
  }

  localStorage.setItem("language", language);
}

function toggleLanguage() {
  applyLanguage(currentLanguage === "en" ? "km" : "en");
}

function sendContactMessage(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const note = form.querySelector(".form-note");
  const formData = new FormData(form);
  const rawName = formData.get("name").trim();
  const rawEmail = formData.get("email").trim();
  const rawMessage = formData.get("message").trim();
  const name = encodeURIComponent(rawName);
  const email = encodeURIComponent(rawEmail);
  const message = encodeURIComponent(rawMessage);
  const subject = encodeURIComponent(`Portfolio message from ${rawName}`);
  const body = `Name: ${name}%0AEmail: ${email}%0A%0A${message}`;

  note.textContent = currentLanguage === "km" ? "កំពុងបើកកម្មវិធីអ៊ីមែលរបស់អ្នក..." : "Opening your email app...";
  window.location.href = `mailto:chandy.srin@student.passerellesnumeriques.org?subject=${subject}&body=${body}`;

  setTimeout(() => {
    note.textContent = currentLanguage === "km" ? "អរគុណ។ សាររបស់អ្នករួចរាល់សម្រាប់ផ្ញើ។" : "Thank you. Your message is ready to send.";
    form.reset();
  }, 600);
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  const themeToggle = document.querySelector(".theme-toggle");
  const loader = document.querySelector(".loader");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  applyLanguage(currentLanguage);

  // Load the resume timeline and CV link saved from the admin panel.
  // Without Supabase credentials this keeps the built-in content in index.html.
  if (window.PortfolioData) {
    PortfolioData.initPortfolio();
  }

  setTimeout(() => {
    loader.classList.add("hide");
    document.body.classList.remove("loading");
  }, 1400);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -80px 0px" }
  );

  document
    .querySelectorAll("section, .skill-category, .project, .resume-profile, .timeline, .contact-form")
    .forEach((element) => observer.observe(element));

  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelector("nav ul").classList.remove("active");
      document.querySelector(".hamburger").classList.remove("active");
    });
  });

  initCustomCursor();
});

function initCustomCursor() {
  const dot = document.querySelector(".cursor-dot");
  const outline = document.querySelector(".cursor-outline");

  if (!dot || !outline || window.matchMedia("(max-width: 1024px)").matches) {
    return;
  }

  window.addEventListener("mousemove", (event) => {
    dot.style.left = `${event.clientX}px`;
    dot.style.top = `${event.clientY}px`;
    outline.style.left = `${event.clientX}px`;
    outline.style.top = `${event.clientY}px`;
  });

  document.querySelectorAll("a, button, input, textarea").forEach((element) => {
    element.addEventListener("mouseenter", () => outline.classList.add("hovering"));
    element.addEventListener("mouseleave", () => outline.classList.remove("hovering"));
  });
}

document.addEventListener("click", (event) => {
  const nav = document.querySelector(".nav-container");
  const navList = document.querySelector("nav ul");
  const hamburger = document.querySelector(".hamburger");

  if (nav && !nav.contains(event.target) && navList.classList.contains("active")) {
    navList.classList.remove("active");
    hamburger.classList.remove("active");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelector("nav ul").classList.remove("active");
    document.querySelector(".hamburger").classList.remove("active");
  }
});

window.addEventListener("scroll", () => {
  const scrollProgress = document.querySelector(".scroll-progress");
  const backToTopBtn = document.getElementById("back-to-top");
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;

  scrollProgress.style.width = `${progress}%`;

  if (window.scrollY > 300) {
    backToTopBtn.classList.add("show");
  } else {
    backToTopBtn.classList.remove("show");
  }

  const sections = document.querySelectorAll("main section");
  const navLinks = document.querySelectorAll("nav a[href^='#']");
  let current = "home";

  sections.forEach((section) => {
    if (window.scrollY >= section.offsetTop - 180) {
      current = section.id;
    }
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
  });
});
