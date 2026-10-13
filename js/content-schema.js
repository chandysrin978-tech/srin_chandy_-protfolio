/**
 * Content schema for the portfolio editor.
 *
 * This is the single list of everything the admin panel can change, and the
 * "default" values are exactly the text that is hard-coded in index.html.
 * The admin panel builds its forms from this file, and js/portfolio-data.js
 * uses the same keys to push saved values back into the page.
 *
 * Field types:
 *   text     -> one line, bilingual (English + Khmer)
 *   textarea -> multiple lines, bilingual
 *   list     -> a repeating list of short items, each bilingual
 *   url      -> a single link (used for href attributes), not bilingual
 *   image    -> a single image URL, stored in the "media" storage bucket
 *
 * Each bilingual field is saved as two rows in the site_settings table:
 *   <key>_en and <key>_km
 * A url/image field is saved as one row: <key>
 * A list field is saved as one row holding a JSON array of { en, km }: <key>
 *
 * You only need to touch this file if you want to make a NEW part of the
 * page editable. Everyday editing happens in admin.html.
 */
(function () {
  const groups = [
    {
      id: "hero",
      label: "Hero (top of page)",
      fields: [
        { key: "hero_eyebrow", label: "Small badge above your name", type: "text", default_en: "Portfolio 2026", default_km: "ផតហ្វូលីយ៉ូ ២០២៦" },
        { key: "hero_greeting", label: "Greeting", type: "text", default_en: "Hi, I'm", default_km: "សួស្តី ខ្ញុំឈ្មោះ" },
        { key: "hero_name", label: "Your name (highlighted)", type: "text", default_en: "Srin Chandy", default_km: "Srin Chandy" },
        {
          key: "hero_intro",
          label: "Intro paragraph",
          type: "textarea",
          default_en: "A motivated junior web developer seeking a web development internship, with hands-on practice building responsive and user-friendly web applications.",
          default_km: "ខ្ញុំជាអ្នកអភិវឌ្ឍន៍គេហទំព័រជំនាន់ថ្មី ដែលកំពុងស្វែងរកឱកាសហាត់ការផ្នែក Web Development និងមានបទពិសោធន៍អនុវត្តក្នុងការបង្កើតគេហទំព័រដែលឆ្លើយតបល្អ និងងាយស្រួលប្រើ។",
        },
        { key: "hero_badge", label: "Role badge on your photo", type: "text", default_en: "Web Development Intern", default_km: "អ្នកហាត់ការផ្នែក Web Development" },
        { key: "hero_image", label: "Hero portrait image", type: "image" },
      ],
    },
    {
      id: "about",
      label: "About section",
      fields: [
        { key: "about_eyebrow", label: "Small label", type: "text", default_en: "About Me", default_km: "អំពីខ្ញុំ" },
        {
          key: "about_title",
          label: "Heading",
          type: "text",
          default_en: "Building thoughtful web experiences with care.",
          default_km: "បង្កើតបទពិសោធន៍គេហទំព័រដែលមានគុណភាព និងយកចិត្តទុកដាក់។",
        },
        {
          key: "about_text1",
          label: "First paragraph",
          type: "textarea",
          default_en: "I am a web development student at Passerelles Numeriques Cambodia, preparing for a web development internship. My CV highlights hands-on practice with HTML, CSS, JavaScript, Node.js, MySQL, Git, Docker, AWS, and Postman.",
          default_km: "ខ្ញុំជាសិស្សផ្នែកអភិវឌ្ឍន៍គេហទំព័រនៅ Passerelles Numeriques Cambodia ហើយកំពុងត្រៀមខ្លួនសម្រាប់ឱកាសហាត់ការផ្នែក Web Development។ ប្រវត្តិរូបរបស់ខ្ញុំបង្ហាញពីបទពិសោធន៍អនុវត្តជាមួយ HTML, CSS, JavaScript, Node.js, MySQL, Git, Docker, AWS និង Postman។",
        },
        {
          key: "about_text2",
          label: "Second paragraph",
          type: "textarea",
          default_en: "I am a quick learner and strong team player who enjoys solving real problems, improving small details, and writing clean, maintainable code.",
          default_km: "ខ្ញុំរៀនបានលឿន សហការជាក្រុមបានល្អ ចូលចិត្តដោះស្រាយបញ្ហាពិត កែលម្អព័ត៌មានលម្អិតតូចៗ និងសរសេរកូដឱ្យស្អាតងាយថែទាំ។",
        },
        { key: "about_image", label: "About image", type: "image" },
      ],
    },
    {
      id: "skills",
      label: "Skills section",
      fields: [
        { key: "skills_eyebrow", label: "Small label", type: "text", default_en: "Technologies Used", default_km: "បច្ចេកវិទ្យាដែលបានប្រើ" },
        {
          key: "skills_title",
          label: "Heading",
          type: "text",
          default_en: "My web development stack, from interface to deployment.",
          default_km: "បច្ចេកវិទ្យាអភិវឌ្ឍន៍គេហទំព័ររបស់ខ្ញុំ ចាប់ពីផ្នែកប្រើប្រាស់ដល់ការដាក់ឱ្យប្រើប្រាស់។",
        },
        { key: "skills_frontend_title", label: "Front-end card title", type: "text", default_en: "Front-End", default_km: "ផ្នែកមុខ" },
        {
          key: "skills_frontend",
          label: "Front-end tags",
          type: "list",
          default_items: [
            { en: "Vue.js", km: "" },
            { en: "HTML5", km: "" },
            { en: "CSS3", km: "" },
            { en: "JavaScript", km: "" },
            { en: "Tailwind CSS", km: "" },
          ],
        },
        { key: "skills_backend_title", label: "Back-end card title", type: "text", default_en: "Back-End", default_km: "ផ្នែកក្រោយ" },
        {
          key: "skills_backend",
          label: "Back-end tags",
          type: "list",
          default_items: [
            { en: "Node.js", km: "" },
            { en: "Laravel", km: "" },
            { en: "MySQL", km: "" },
          ],
        },
        { key: "skills_tools_title", label: "Tools card title", type: "text", default_en: "Tools", default_km: "ឧបករណ៍" },
        {
          key: "skills_tools",
          label: "Tools tags",
          type: "list",
          default_items: [
            { en: "GitHub", km: "" },
            { en: "VS Code", km: "" },
            { en: "Postman", km: "" },
            { en: "Docker", km: "" },
            { en: "AWS", km: "" },
          ],
        },
        { key: "skills_strengths_title", label: "Strengths card title", type: "text", default_en: "Strengths", default_km: "ចំណុចខ្លាំង" },
        {
          key: "skills_strengths",
          label: "Strengths tags",
          type: "list",
          default_items: [
            { en: "Problem-Solving", km: "ការដោះស្រាយបញ្ហា" },
            { en: "Teamwork", km: "ការងារជាក្រុម" },
            { en: "Willingness to Learn", km: "ចង់រៀនបន្ថែម" },
            { en: "Clear Communication", km: "ការទំនាក់ទំនងច្បាស់លាស់" },
            { en: "Leadership", km: "ភាពជាអ្នកដឹកនាំ" },
          ],
        },
        { key: "tools_title", label: "How-I-build card title", type: "text", default_en: "How I Build Websites", default_km: "របៀបដែលខ្ញុំបង្កើតគេហទំព័រ" },
        {
          key: "tools_text",
          label: "How-I-build paragraph",
          type: "textarea",
          default_en: "I build responsive pages, connect them with back-end logic and databases, test APIs with Postman, manage code with Git, and keep learning through real school and personal projects.",
          default_km: "ខ្ញុំបង្កើតទំព័រដែលឆ្លើយតបល្អ ភ្ជាប់ជាមួយ logic ផ្នែកក្រោយ និង database សាកល្បង API ជាមួយ Postman គ្រប់គ្រងកូដដោយ Git ហើយបន្តរៀនតាមរយៈគម្រោងសាលា និងគម្រោងផ្ទាល់ខ្លួន។",
        },
        {
          key: "tools_list",
          label: "How-I-build chips",
          type: "list",
          default_items: [
            { en: "HTML / CSS / JavaScript", km: "" },
            { en: "Node.js / Laravel", km: "" },
            { en: "MySQL / Database", km: "" },
            { en: "Git / Docker / AWS", km: "" },
            { en: "Postman / API Testing", km: "" },
          ],
        },
      ],
    },
    {
      id: "projects",
      label: "Projects section header",
      fields: [
        { key: "projects_eyebrow", label: "Small label", type: "text", default_en: "Featured Work", default_km: "ស្នាដៃសំខាន់ៗ" },
        { key: "projects_title", label: "Heading", type: "text", default_en: "Projects I built.", default_km: "គម្រោងដែលខ្ញុំបានបង្កើត។" },
        {
          key: "projects_lead",
          label: "Intro line under the heading",
          type: "textarea",
          default_en: "These are finished or practice projects. Each card shows the project type, main tools, and links.",
          default_km: "នេះជាគម្រោងដែលបានបញ្ចប់ ឬគម្រោងហាត់អនុវត្ត។ កាតនីមួយៗបង្ហាញប្រភេទគម្រោង ឧបករណ៍សំខាន់ និងតំណភ្ជាប់។",
        },
      ],
    },
    {
      id: "resume",
      label: "Resume section header",
      fields: [
        { key: "resume_eyebrow", label: "Small label", type: "text", default_en: "Resume", default_km: "ប្រវត្តិរូប" },
        {
          key: "resume_title",
          label: "Heading",
          type: "text",
          default_en: "Experience and education timeline.",
          default_km: "បទពិសោធន៍ និងការអប់រំ។",
        },
        {
          key: "resume_lead",
          label: "Intro line under the heading",
          type: "textarea",
          default_en: "This section explains my learning path and the experience behind my work.",
          default_km: "ផ្នែកនេះពន្យល់អំពីដំណើររៀនសូត្រ និងបទពិសោធន៍នៅពីក្រោយការងាររបស់ខ្ញុំ។",
        },
      ],
    },
    {
      id: "contact",
      label: "Contact section",
      fields: [
        { key: "contact_eyebrow", label: "Small label", type: "text", default_en: "Contact", default_km: "ទំនាក់ទំនង" },
        { key: "contact_title", label: "Heading", type: "text", default_en: "Let's work together.", default_km: "តោះធ្វើការជាមួយគ្នា។" },
        {
          key: "contact_text",
          label: "Paragraph",
          type: "textarea",
          default_en: "If you have a web development internship opportunity, project idea, or collaboration in mind, I would love to hear from you.",
          default_km: "បើអ្នកមានឱកាសហាត់ការផ្នែក Web Development គំនិតគម្រោង ឬចង់សហការជាមួយខ្ញុំ ខ្ញុំរីករាយក្នុងការទទួលសារ។",
        },
        { key: "contact_email", label: "Email address shown", type: "text", default_en: "chandy.srin@student.passerellesnumeriques.org", default_km: "chandy.srin@student.passerellesnumeriques.org" },
        { key: "contact_email_href", label: "Email link (mailto:...)", type: "url", default: "mailto:chandy.srin@student.passerellesnumeriques.org" },
        { key: "contact_telegram_label", label: "Telegram card label", type: "text", default_en: "Telegram", default_km: "តេឡេក្រាម" },
        { key: "contact_telegram_handle", label: "Telegram handle", type: "text", default_en: "@dyysrin", default_km: "@dyysrin" },
        { key: "contact_telegram_href", label: "Telegram link", type: "url", default: "https://t.me/dyysrin" },
      ],
    },
    {
      id: "social",
      label: "Social links (hero icons)",
      fields: [
        { key: "social_github", label: "GitHub URL", type: "url", default: "https://github.com/" },
        { key: "social_linkedin", label: "LinkedIn URL", type: "url", default: "https://www.linkedin.com/in/chandy-srin-b1b93b3a0/" },
        { key: "social_telegram", label: "Telegram URL", type: "url", default: "https://t.me/dyysrin" },
        { key: "social_email", label: "Email link (mailto:...)", type: "url", default: "mailto:chandy.srin@student.passerellesnumeriques.org" },
      ],
    },
    {
      id: "footer",
      label: "Footer",
      fields: [
        { key: "footer_text", label: "Copyright line", type: "text", default_en: "(c) 2026 Srin Chandy. All rights reserved.", default_km: "(c) ២០២៦ Srin Chandy. រក្សាសិទ្ធិគ្រប់យ៉ាង។" },
      ],
    },
  ];

  // Flattened view of every field, in order, used by the renderer and the editor.
  const fields = [];
  groups.forEach((group) => {
    group.fields.forEach((field) => {
      fields.push(Object.assign({ group: group.id, groupLabel: group.label }, field));
    });
  });

  function getGroups() {
    return groups;
  }

  function getFields() {
    return fields;
  }

  function getField(key) {
    return fields.find((field) => field.key === key) || null;
  }

  /** Convert a list field default ([{en, km}]) into the editor's text form. */
  function itemsToText(items) {
    return (items || [])
      .map((item) => {
        const en = item && item.en ? item.en : "";
        const km = item && item.km ? item.km : "";
        return km ? `${en} | ${km}` : en;
      })
      .join("\n");
  }

  /** Convert the editor's text form back into a list field value ([{en, km}]). */
  function textToItems(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|");
        const en = (parts[0] || "").trim();
        const km = (parts.slice(1).join("|") || "").trim();
        return { en: en, km: km || en };
      });
  }

  window.PORTFOLIO_CONTENT = {
    groups,
    fields,
    getGroups,
    getFields,
    getField,
    itemsToText,
    textToItems,
  };
})();
