(() => {
  const SIDEBAR_ID = "ekursy-sidebar-root";
  const BURGER_ID = "ekursy-burger-btn";

  const DEFAULT_SIDEBAR_WIDTH = 240;
  let __ekursy_prev_body_padding_left = null;
  let __ekursy_prev_header_padding_left = null;
  let __ekursy_prev_navbar_padding_left = null;
  let __ekursy_prev_burger_display = null;
  let __ekursy_prev_body_transition = null;
  let __ekursy_prev_header_transition = null;
  let __ekursy_prev_navbar_transition = null;

  let __ekursy_cached_courses = null;
  let __ekursy_courses_promise = null;
  let __ekursy_prefetched = false;

  function loadStoredCourses() {
    return new Promise((res) => {
      try {
        chrome.storage.local.get(["ekursy_courses"], (r) =>
          res((r && r.ekursy_courses) || [])
        );
      } catch (e) {
        res([]);
      }
    });
  }

  function saveStoredCourses(arr) {
    try {
      chrome.storage.local.set({ ekursy_courses: arr });
    } catch (e) {}
  }

  async function mergeWithStored(prefetched) {
    // prefetched: [{id,fullname,shortname}]
    try {
      const stored = await loadStoredCourses();
      const byId = new Map();
      (stored || []).forEach((s) => {
        if (s && s.id != null) byId.set(String(s.id), s);
      });
      const merged = (prefetched || []).map((p) => {
        const key_1 = String(p.id);
        const prev = byId.get(key_1);
        return {
          id: p.id,
          fullname: p.fullname,
          shortname: p.shortname,
          hidden: !!(prev && prev.hidden),
        };
      });

      (stored || []).forEach((s_1) => {
        if (
          s_1 &&
          s_1.id != null &&
          !merged.find((x) => String(x.id) === String(s_1.id))
        ) {
          merged.push({
            id: s_1.id,
            fullname: s_1.fullname || "",
            shortname: s_1.shortname || "",
            hidden: !!s_1.hidden,
          });
        }
      });
      saveStoredCourses(merged);
      return merged;
    } catch {
      return prefetched || [];
    }
  }

  function updateCourseHidden(id, hidden) {
    const key = String(id);
    __ekursy_cached_courses = (__ekursy_cached_courses || []).map((c) =>
      c && String(c.id) === key ? Object.assign({}, c, { hidden: !!hidden }) : c
    );
    // persist
    saveStoredCourses(__ekursy_cached_courses || []);
  }

  function createSidebar({ noAnimation = false } = {}) {
    if (document.getElementById(SIDEBAR_ID)) return;
    const el = document.createElement("div");
    el.id = SIDEBAR_ID;
    el.setAttribute("data-ekursy", "1");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.right = "auto";
    el.style.width = DEFAULT_SIDEBAR_WIDTH + "px";
    el.style.height = "100%";
    el.style.background = "#fff";
    el.style.boxShadow = "0 0 8px rgba(0,0,0,0.2)";
    el.style.zIndex = 2147483647;
    el.style.padding = "12px";
    el.innerHTML = "<h4>eKursy Sidebar</h4>";

    const container = document.body || document.documentElement;
    container.appendChild(el);

    let __ekursy_disable_style = null;
    if (noAnimation) {
      try {
        if (!document.getElementById("ekursy-disable-transition")) {
          __ekursy_disable_style = document.createElement("style");
          __ekursy_disable_style.id = "ekursy-disable-transition";
          __ekursy_disable_style.textContent =
            ".ekursy-disable-transition, .ekursy-disable-transition * { transition: none !important; animation: none !important; }";
          (document.head || document.documentElement).appendChild(
            __ekursy_disable_style
          );
        } else {
          __ekursy_disable_style = document.getElementById(
            "ekursy-disable-transition"
          );
        }
        document.documentElement.classList.add("ekursy-disable-transition");
      } catch (e) {
        __ekursy_disable_style = null;
      }
    }

    try {
      const innerBtn = document.createElement("button");
      innerBtn.id = "ekursy-burger-inside";
      innerBtn.type = "button";
      innerBtn.title = "Close";
      innerBtn.style.position = "absolute";
      innerBtn.style.top = "8px";
      innerBtn.style.right = "8px";
      innerBtn.style.width = "36px";
      innerBtn.style.height = "36px";
      innerBtn.style.border = "none";
      innerBtn.style.background = "transparent";
      innerBtn.style.cursor = "pointer";
      innerBtn.style.fontSize = "20px";
      innerBtn.style.lineHeight = "1";
      innerBtn.style.borderRadius = "6px";
      innerBtn.innerHTML = '<span style="pointer-events:none">☰</span>';
      innerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        onToggle();
      });
      el.style.position = el.style.position || "fixed";
      el.style.boxSizing = "border-box";
      el.appendChild(innerBtn);
    } catch (e) {}

    (function renderCachedCourses() {
      try {
        const appendList = (items) => {
          try {
            const prev = el.querySelector("ul[data-ekursy-courses]");
            if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
            const prevPanel = el.querySelector("#ekursy-manage-panel");
            if (prevPanel && prevPanel.parentNode)
              prevPanel.parentNode.removeChild(prevPanel);
            const prevBtn = el.querySelector("#ekursy-manage-btn");
            if (prevBtn && prevBtn.parentNode)
              prevBtn.parentNode.removeChild(prevBtn);

            if (!items || !items.length) return;
            const normalized = items
              .map((c) => ({
                id: c.id || c.courseid || null,
                fullname: c.fullname || c.fullnamedisplay || c.name || "",
                shortname: c.shortname || "",
                hidden: !!c.hidden,
              }))
              .filter((x) => x && x.id != null);
            try {
              chrome.storage.local.set({ ekursy_courses: normalized });
            } catch (e) {}
            __ekursy_cached_courses = normalized;

            const list = document.createElement("ul");
            list.setAttribute("data-ekursy-courses", "1");
            list.style.listStyle = "none";
            list.style.padding = "6px 0 12px 0";
            list.style.margin = "6px 0";
            list.style.maxHeight = "100%";
            list.style.overflow = "auto";

            normalized
              .filter((c) => !c.hidden)
              .forEach((c) => {
                const li = document.createElement("li");
                li.style.padding = "6px 4px";
                li.style.borderBottom = "1px solid #eee";

                const a = document.createElement("a");
                a.href =
                  "https://ekursy.put.poznan.pl/course/view.php?id=" +
                  encodeURIComponent(c.id);
                a.target = "_self";
                a.rel = "noopener noreferrer";
                a.textContent = c.fullname || c.shortname || String(c.id);
                a.style.display = "inline-block";
                a.style.width = "100%";
                a.style.textDecoration = "none";
                a.style.color = "#111";
                a.style.padding = "6px 8px";
                a.style.borderRadius = "6px";
                a.style.background = "transparent";
                a.style.border = "1px solid transparent";
                a.style.boxSizing = "border-box";
                a.addEventListener("mouseenter", () => {
                  a.style.background = "rgba(0,0,0,0.03)";
                  a.style.borderColor = "#e6e6e6";
                });
                a.addEventListener("mouseleave", () => {
                  a.style.background = "transparent";
                  a.style.borderColor = "transparent";
                });

                li.appendChild(a);
                list.appendChild(li);
              });
            el.appendChild(list);
          } catch (e) {}
        };

        if (__ekursy_cached_courses && __ekursy_cached_courses.length) {
          appendList(__ekursy_cached_courses);
          return;
        }

        try {
          chrome.storage.local.get(["ekursy_courses"], (r) => {
            const stored = (r && r.ekursy_courses) || null;
            if (stored && Array.isArray(stored) && stored.length) {
              __ekursy_cached_courses = stored;
              appendList(stored);
              return;
            }
            if (__ekursy_courses_promise) {
              __ekursy_courses_promise
                .then((res) => {
                  if (res && res.length) appendList(res);
                })
                .catch(() => {});
            }
          });
        } catch (e) {
          if (__ekursy_courses_promise) {
            __ekursy_courses_promise
              .then((res) => {
                if (res && res.length) appendList(res);
              })
              .catch(() => {});
          }
        }
      } catch (e) {}
    })();

    try {
      chrome.storage.local.get(["ekursy_sidebar_width"], (r) => {
        try {
          const stored = (r && r.ekursy_sidebar_width) || DEFAULT_SIDEBAR_WIDTH;
          const w = Number(stored) || DEFAULT_SIDEBAR_WIDTH;
          applyWidthToSidebar(w, el, noAnimation);
        } catch (e) {
          try {
            applyWidthToSidebar(DEFAULT_SIDEBAR_WIDTH, el, noAnimation);
          } catch (er) {}
        }
      });
    } catch (e) {
      try {
        applyWidthToSidebar(DEFAULT_SIDEBAR_WIDTH, el, noAnimation);
      } catch (er) {}
    }

    const b = document.getElementById(BURGER_ID);
    if (b) b.setAttribute("aria-pressed", "true");

    try {
      const body = document.body;
      if (body) {
        if (__ekursy_prev_body_padding_left === null)
          __ekursy_prev_body_padding_left = body.style.paddingLeft || "";
        if (noAnimation) {
          __ekursy_prev_body_transition = body.style.transition || "";
          body.style.transition = "none";
          body.style.paddingLeft = DEFAULT_SIDEBAR_WIDTH + "px";
          void body.offsetHeight;
          setTimeout(() => {
            body.style.transition =
              __ekursy_prev_body_transition || "padding-left 0.25s ease";
            __ekursy_prev_body_transition = null;
          }, 50);
        } else {
          body.style.transition = body.style.transition
            ? body.style.transition + ", padding-left 0.25s ease"
            : "padding-left 0.25s ease";
          body.style.paddingLeft = DEFAULT_SIDEBAR_WIDTH + "px";
        }
      }
    } catch (e) {}

    try {
      const header =
        document.getElementById("main-header") ||
        document.querySelector(
          "header, .main-header, #header, .header, .site-header, .navbar"
        );
      if (header) {
        if (__ekursy_prev_header_padding_left === null)
          __ekursy_prev_header_padding_left = header.style.paddingLeft || "";
        if (noAnimation) {
          __ekursy_prev_header_transition = header.style.transition || "";
          header.style.transition = "none";
          header.style.paddingLeft = DEFAULT_SIDEBAR_WIDTH + "px";
          void header.offsetHeight;
          setTimeout(() => {
            header.style.transition =
              __ekursy_prev_header_transition || "padding-left 0.25s ease";
            __ekursy_prev_header_transition = null;
          }, 50);
        } else {
          header.style.transition = header.style.transition
            ? header.style.transition + ", padding-left 0.25s ease"
            : "padding-left 0.25s ease";
          header.style.paddingLeft = DEFAULT_SIDEBAR_WIDTH + "px";
        }
        header.style.zIndex = header.style.zIndex || 2147483648;
      }
    } catch (e) {}

    try {
      const navbar = document.querySelector(".lambda-nav");
      if (navbar) {
        if (__ekursy_prev_navbar_padding_left === null)
          __ekursy_prev_navbar_padding_left = navbar.style.paddingLeft || "";
        if (noAnimation) {
          __ekursy_prev_navbar_transition = navbar.style.transition || "";
          navbar.style.transition = "none";
          navbar.style.paddingLeft = DEFAULT_SIDEBAR_WIDTH + "px";
          void navbar.offsetHeight;
          setTimeout(() => {
            navbar.style.transition =
              __ekursy_prev_navbar_transition || "padding-left 0.25s ease";
            __ekursy_prev_navbar_transition = null;
          }, 50);
        } else {
          navbar.style.transition = navbar.style.transition
            ? navbar.style.transition + ", padding-left 0.25s ease"
            : "padding-left 0.25s ease";
          navbar.style.paddingLeft = DEFAULT_SIDEBAR_WIDTH + "px";
        }
        navbar.style.zIndex = navbar.style.zIndex || 2147483648;
      }
    } catch (e) {}

    try {
      const headerBurger = document.getElementById(BURGER_ID);
      if (headerBurger) {
        __ekursy_prev_burger_display = headerBurger.style.display || "";
        headerBurger.style.display = "none";
        headerBurger.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}

    if (noAnimation) {
      setTimeout(() => {
        try {
          document.documentElement.classList.remove(
            "ekursy-disable-transition"
          );
          const s = document.getElementById("ekursy-disable-transition");
          if (s) s.remove();
        } catch (e) {
          /* ignore */
        }
      }, 80);
    }
  }

  function applyWidthToSidebar(width, el, noAnimation = false) {
    const w = Number(width) || DEFAULT_SIDEBAR_WIDTH;
    try {
      if (el) el.style.width = w + "px";
    } catch (e) {}

    // Body
    try {
      const body = document.body;
      if (body) {
        if (__ekursy_prev_body_padding_left === null)
          __ekursy_prev_body_padding_left = body.style.paddingLeft || "";
        if (noAnimation) {
          __ekursy_prev_body_transition = body.style.transition || "";
          body.style.transition = "none";
          body.style.paddingLeft = w + "px";
          void body.offsetHeight;
          setTimeout(() => {
            body.style.transition =
              __ekursy_prev_body_transition || "padding-left 0.25s ease";
            __ekursy_prev_body_transition = null;
          }, 50);
        } else {
          body.style.transition = body.style.transition
            ? body.style.transition + ", padding-left 0.25s ease"
            : "padding-left 0.25s ease";
          body.style.paddingLeft = w + "px";
        }
      }
    } catch (e) {}

    // Header
    try {
      const header =
        document.getElementById("main-header") ||
        document.querySelector(
          "header, .main-header, #header, .header, .site-header, .navbar"
        );
      if (header) {
        if (__ekursy_prev_header_padding_left === null)
          __ekursy_prev_header_padding_left = header.style.paddingLeft || "";
        if (noAnimation) {
          __ekursy_prev_header_transition = header.style.transition || "";
          header.style.transition = "none";
          header.style.paddingLeft = w + "px";
          void header.offsetHeight;
          setTimeout(() => {
            header.style.transition =
              __ekursy_prev_header_transition || "padding-left 0.25s ease";
            __ekursy_prev_header_transition = null;
          }, 50);
        } else {
          header.style.transition = header.style.transition
            ? header.style.transition + ", padding-left 0.25s ease"
            : "padding-left 0.25s ease";
          header.style.paddingLeft = w + "px";
        }
        header.style.zIndex = header.style.zIndex || 2147483648;
      }
    } catch (e) {}

    // Navbar
    try {
      const navbar = document.querySelector(".lambda-nav");
      if (navbar) {
        if (__ekursy_prev_navbar_padding_left === null)
          __ekursy_prev_navbar_padding_left = navbar.style.paddingLeft || "";
        if (noAnimation) {
          __ekursy_prev_navbar_transition = navbar.style.transition || "";
          navbar.style.transition = "none";
          navbar.style.paddingLeft = w + "px";
          void navbar.offsetHeight;
          setTimeout(() => {
            navbar.style.transition =
              __ekursy_prev_navbar_transition || "padding-left 0.25s ease";
            __ekursy_prev_navbar_transition = null;
          }, 50);
        } else {
          navbar.style.transition = navbar.style.transition
            ? navbar.style.transition + ", padding-left 0.25s ease"
            : "padding-left 0.25s ease";
          navbar.style.paddingLeft = w + "px";
        }
        navbar.style.zIndex = navbar.style.zIndex || 2147483648;
      }
    } catch (e) {}
  }

  function removeSidebar() {
    const el = document.getElementById(SIDEBAR_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);

    const b = document.getElementById(BURGER_ID);
    if (b) b.setAttribute("aria-pressed", "false");

    try {
      const body = document.body;
      if (body) {
        if (typeof __ekursy_prev_body_padding_left === "string") {
          body.style.paddingLeft = __ekursy_prev_body_padding_left;
        } else {
          body.style.paddingLeft = "";
        }
      }
    } catch (e) {}

    // Restore header padding-left
    try {
      const header =
        document.getElementById("main-header") ||
        document.querySelector(
          "header, .main-header, #header, .header, .site-header, .navbar"
        );
      if (header) {
        if (typeof __ekursy_prev_header_padding_left === "string") {
          header.style.paddingLeft = __ekursy_prev_header_padding_left;
        } else {
          header.style.paddingLeft = "";
        }
      }
    } catch (e) {}

    // Restore navbar padding-left
    try {
      const navbar = document.querySelector(".lambda-nav");
      if (navbar) {
        if (typeof __ekursy_prev_navbar_padding_left === "string") {
          navbar.style.paddingLeft = __ekursy_prev_navbar_padding_left;
        } else {
          navbar.style.paddingLeft = "";
        }
      }
    } catch (e) {}

    // Restore header burger display
    try {
      const headerBurger = document.getElementById(BURGER_ID);
      if (headerBurger) {
        if (typeof __ekursy_prev_burger_display === "string") {
          headerBurger.style.display = __ekursy_prev_burger_display;
        } else {
          headerBurger.style.display = "";
        }
        headerBurger.removeAttribute("aria-hidden");
      }
    } catch (e) {}
  }

  function onToggle() {
    const exists = !!document.getElementById(SIDEBAR_ID);
    if (exists) removeSidebar();
    else createSidebar();
  }

  function injectBurger() {
    if (document.getElementById(BURGER_ID) || window.__ekursy_burger_injected)
      return;

    let target = document.getElementById("main-header");
    if (!target)
      target = document.querySelector(
        "header, .main-header, #header, .header, .site-header, .navbar"
      );

    const btn = document.createElement("button");
    btn.id = BURGER_ID;
    btn.type = "button";
    btn.title = "Toggle eKursy Sidebar";
    btn.setAttribute("aria-pressed", "false");
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.width = "36px";
    btn.style.height = "36px";
    btn.style.padding = "6px";
    btn.style.marginRight = "8px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "20px";
    btn.style.lineHeight = "1";
    btn.style.color = "inherit";
    btn.style.borderRadius = "6px";
    btn.style.transition = "background 0.15s";
    btn.innerHTML = '<span style="pointer-events:none">☰</span>';

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onToggle();
    });

    // Hover style
    btn.addEventListener(
      "mouseenter",
      () => (btn.style.background = "rgba(0,0,0,0.06)")
    );
    btn.addEventListener(
      "mouseleave",
      () => (btn.style.background = "transparent")
    );

    if (target) {
      try {
        target.insertBefore(btn, target.firstChild);
      } catch (e) {
        target.appendChild(btn);
      }
    } else {
      btn.style.position = "fixed";
      btn.style.left = "12px";
      btn.style.top = "12px";
      btn.style.zIndex = 2147483647;
      document.body.appendChild(btn);
    }

    window.__ekursy_burger_injected = true;
  }

  if (!window.__ekursy_sidebar_listening) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || !msg.action) return;
      if (msg.action === "toggleSidebar") onToggle();
      if (msg.action === "refreshCourses") {
        loadStoredCourses()
          .then((stored) => {
            __ekursy_cached_courses = stored || [];
            const sidebarEl = document.getElementById(SIDEBAR_ID);
            if (sidebarEl) {
              try {
                const hadNoAnim =
                  !!sidebarEl.getAttribute("data-ekursy-noanim");
                removeSidebar();
                createSidebar({ noAnimation: hadNoAnim });
              } catch (e) {}
            }
          })
          .catch(() => {});
      }
      if (msg.action === "updateSidebarWidth") {
        try {
          const w = Number(msg.width) || DEFAULT_SIDEBAR_WIDTH;
          const sidebarEl = document.getElementById(SIDEBAR_ID);
          if (sidebarEl) {
            applyWidthToSidebar(w, sidebarEl, false);
          }
        } catch (e) {}
      }
    });
    window.__ekursy_sidebar_listening = true;
  }

  try {
    chrome.storage.local.get(["persistSidebar"], (res) => {
      const hasKey =
        res && Object.prototype.hasOwnProperty.call(res, "persistSidebar");
      const persist = hasKey ? !!res.persistSidebar : true;

      if (!hasKey) {
        try {
          chrome.storage.local.set({ persistSidebar: true });
        } catch (e) {}
      }

      const startPrefetch = () => {
        if (__ekursy_prefetched) return;
        __ekursy_prefetched = true;
        __ekursy_courses_promise = (async () => {
          try {
            const resp = await fetchCourses().catch(() => null);
            const items = extractCourseList(resp) || [];
            const lean = items
              .map((c) => ({
                id: c.id || c.courseid || null,
                fullname: c.fullname || c.fullnamedisplay || c.name || "",
                shortname: c.shortname || "",
              }))
              .filter((x) => x && x.id != null);
            const merged = await mergeWithStored(lean);
            __ekursy_cached_courses = merged;
            return merged;
          } catch (e) {
            return [];
          }
        })();
      };

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            injectBurger();
            startPrefetch();
            if (persist) createSidebar({ noAnimation: true });
          },
          { once: true }
        );
      } else {
        injectBurger();
        startPrefetch();
        if (persist) createSidebar({ noAnimation: true });
      }
    });
  } catch (e) {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          injectBurger();
          createSidebar({ noAnimation: true });
        },
        { once: true }
      );
    } else {
      injectBurger();
      createSidebar({ noAnimation: true });
    }
  }

  async function findSessKey() {
    try {
      const resp = await fetch(window.location.href, {
        credentials: "same-origin",
        cache: "no-cache",
      });
      if (resp && resp.ok) {
        const html = await resp.text();
        let m = html.match(/"sesskey"\s*:\s*"([^"]+)"/);
        if (m) return m[1];
      }
    } catch (e) {
      console.error("Error fetching page for sesskey", e);
    }

    return null;
  }

  async function fetchCourses() {
    const sesskey = await findSessKey();
    const url =
      "/lib/ajax/service.php?sesskey=" +
      encodeURIComponent(sesskey || "") +
      "&info=core_course_get_enrolled_courses_by_timeline_classification";
    const bodyString =
      '[{"index":0,"methodname":"core_course_get_enrolled_courses_by_timeline_classification","args":{"offset":0,"limit":0,"classification":"all","sort":"fullname","customfieldname":"","customfieldvalue":"","requiredfields":["id","fullname","shortname","showcoursecategory","showshortname","visible","enddate"]}}]';

    try {
      const resp = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/javascript, */*; q=0.01",
        },
        body: bodyString,
      });
      if (!resp.ok) throw new Error("Bad response");
      const data = await resp.json();
      return data;
    } catch (e) {
      return null;
    }
  }

  function extractCourseList(resp) {
    if (!resp) return [];
    if (Array.isArray(resp)) {
      if (
        resp.length &&
        resp[0] &&
        resp[0].data &&
        Array.isArray(resp[0].data.courses)
      )
        return resp[0].data.courses;
      if (
        resp.length &&
        typeof resp[0] === "object" &&
        (resp[0].fullname || resp[0].shortname || resp[0].id)
      )
        return resp;
    }

    if (resp && resp.data && Array.isArray(resp.data.courses))
      return resp.data.courses;

    if (resp && resp.data && Array.isArray(resp.data)) return resp.data;

    for (const k of Object.keys(resp)) {
      if (Array.isArray(resp[k])) return resp[k];
    }
    return [];
  }
})();
