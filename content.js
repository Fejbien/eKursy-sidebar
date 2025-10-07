(() => {
    if (window.location.href.startsWith("https://ekursy.put.poznan.pl/login")) {
        return;
    }

    const SIDEBAR_ID = "ekursy-sidebar-root";
    const BURGER_ID = "ekursy-burger-btn";

    const DEFAULT_SIDEBAR_WIDTH = 260;
    let __ekursy_prev_body_padding_left = null;
    let __ekursy_prev_navbar_padding_left = null;
    let __ekursy_prev_body_transition = null;
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

    function createSidebar({ noAnimation = false } = {}) {
        if (document.getElementById(SIDEBAR_ID)) return;
        const el = document.createElement("div");
        el.id = SIDEBAR_ID;
        el.setAttribute("data-ekursy", "1");
        el.style.position = "fixed";
        el.style.left = "0";
        el.style.right = "auto";
        el.style.width = DEFAULT_SIDEBAR_WIDTH + "px";
        el.style.height = "100%";
        el.style.background = "#016c8f";
        el.style.color = "#fff";
        el.style.boxShadow = "0 0 8px rgba(0,0,0,0.2)";
        el.style.zIndex = 2147483647;
        el.style.padding = "12px";

        const container = document.body || document.documentElement;
        container.appendChild(el);

        try {
            const headerHeight = 62.5;
            el.style.top = headerHeight + "px";
            el.style.height = `calc(100% - ${headerHeight}px)`;
            try {
                const headerEl =
                    document.getElementById("main-header") ||
                    document.querySelector(
                        "header, .main-header, #header, .header, .site-header, .navbar"
                    );
                if (headerEl) {
                    headerEl.classList.add("shrink");

                    try {
                        if (!window.__ekursy_shrink_guard_installed) {
                            const attachObserver = (target) => {
                                try {
                                    const mo = new MutationObserver(
                                        (mutations) => {
                                            for (const m of mutations) {
                                                if (
                                                    m.type === "attributes" &&
                                                    m.attributeName === "class"
                                                ) {
                                                    try {
                                                        if (
                                                            !target.classList.contains(
                                                                "shrink"
                                                            )
                                                        ) {
                                                            target.classList.add(
                                                                "shrink"
                                                            );
                                                        }
                                                    } catch (e) {}
                                                }
                                            }
                                        }
                                    );
                                    mo.observe(target, {
                                        attributes: true,
                                        attributeFilter: ["class"],
                                        subtree: false,
                                    });
                                    window.__ekursy_shrink_header_mo = mo;
                                } catch (e) {}
                            };

                            attachObserver(headerEl);

                            try {
                                const docMo = new MutationObserver(() => {
                                    try {
                                        const current =
                                            document.getElementById(
                                                "main-header"
                                            ) ||
                                            document.querySelector(
                                                "header, .main-header, #header, .header, .site-header, .navbar"
                                            );
                                        if (current) {
                                            if (
                                                !current.classList.contains(
                                                    "shrink"
                                                )
                                            )
                                                current.classList.add("shrink");
                                            if (
                                                window.__ekursy_shrink_header_mo &&
                                                window.__ekursy_shrink_header_mo
                                                    .target !== current
                                            ) {
                                                try {
                                                    window.__ekursy_shrink_header_mo.disconnect();
                                                } catch (e) {}
                                                attachObserver(current);
                                            }
                                        }
                                    } catch (e) {}
                                });
                                (document.documentElement || document.body)
                                    .observe ||
                                    docMo.observe(
                                        document.documentElement ||
                                            document.body,
                                        {
                                            childList: true,
                                            subtree: true,
                                        }
                                    );
                                window.__ekursy_shrink_doc_mo = docMo;
                            } catch (e) {}

                            window.__ekursy_shrink_guard_installed = true;
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        } catch (e) {
            el.style.top = "0";
            el.style.height = "100%";
        }

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
                document.documentElement.classList.add(
                    "ekursy-disable-transition"
                );
            } catch (e) {
                __ekursy_disable_style = null;
            }
        }

        try {
            const style = document.createElement("style");
            style.setAttribute("data-ekursy-style", "scrollbar");
            style.textContent = `
        #${SIDEBAR_ID} {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.28) transparent;
        }
        #${SIDEBAR_ID} ul[data-ekursy-courses] {
          padding-right: 6px;
        }
        #${SIDEBAR_ID}::-webkit-scrollbar { width: 10px; }
        #${SIDEBAR_ID}::-webkit-scrollbar-track { background: transparent; }
        #${SIDEBAR_ID}::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.18);
          border-radius: 8px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        #${SIDEBAR_ID}::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.26);
        }
        #${SIDEBAR_ID} h4 { color: #fff; margin: 0 0 8px 0; }
      `;
            try {
                el.appendChild(style);
            } catch (e) {
                (document.head || document.documentElement).appendChild(style);
            }
        } catch (e) {}

        (function renderCachedCourses() {
            try {
                const appendList = (items) => {
                    try {
                        const prev = el.querySelector(
                            "ul[data-ekursy-courses]"
                        );
                        if (prev && prev.parentNode)
                            prev.parentNode.removeChild(prev);
                        const prevPanel = el.querySelector(
                            "#ekursy-manage-panel"
                        );
                        if (prevPanel && prevPanel.parentNode)
                            prevPanel.parentNode.removeChild(prevPanel);
                        const prevBtn = el.querySelector("#ekursy-manage-btn");
                        if (prevBtn && prevBtn.parentNode)
                            prevBtn.parentNode.removeChild(prevBtn);

                        if (!items || !items.length) return;
                        const normalized = items
                            .map((c) => ({
                                id: c.id || c.courseid || null,
                                fullname:
                                    c.fullname ||
                                    c.fullnamedisplay ||
                                    c.name ||
                                    "",
                                shortname: c.shortname || "",
                                hidden: !!c.hidden,
                            }))
                            .filter((x) => x && x.id != null);
                        try {
                            chrome.storage.local.set({
                                ekursy_courses: normalized,
                            });
                        } catch (e) {}

                        __ekursy_cached_courses = normalized;

                        const list = document.createElement("ul");
                        list.setAttribute("data-ekursy-courses", "1");
                        list.style.listStyle = "none";
                        list.style.padding = "0px 0 12px 0";
                        list.style.margin = "0px 0";
                        list.style.maxHeight = "100%";
                        list.style.overflow = "auto";

                        if (
                            window.location.href.startsWith(
                                "https://ekursy.put.poznan.pl/course/view.php?id="
                            ) ||
                            window.location.href.startsWith(
                                "https://ekursy.put.poznan.pl/grade/report/user/index.php?id="
                            ) ||
                            window.location.href.startsWith(
                                "https://ekursy.put.poznan.pl/admin/tool/lp/coursecompetencies.php?courseid="
                            )
                        ) {
                            const id = new URL(
                                window.location.href
                            ).searchParams.get("id");
                            // Course name
                            const course = __ekursy_cached_courses.find(
                                (c) => c.id == id
                            );
                            const courseLi = document.createElement("li");
                            courseLi.style.padding = "4px 0px 4px 2px";
                            const courseA = document.createElement("a");
                            courseA.href =
                                "https://ekursy.put.poznan.pl/course/view.php?id=" +
                                encodeURIComponent(course.id);
                            courseA.target = "_self";
                            courseA.rel = "noopener noreferrer";
                            courseA.style.display = "flex";
                            courseA.style.alignItems = "top";
                            courseA.style.gap = "2px";
                            courseA.style.width = "100%";
                            courseA.style.fontSize = "14px";
                            courseA.style.fontWeight = "400";
                            courseA.style.textDecoration = "none";
                            courseA.style.color = "#fff";
                            courseA.style.padding = "2px 3px";
                            courseA.style.borderRadius = "6px";
                            courseA.style.background = "transparent";
                            courseA.style.border = "1px solid transparent";
                            courseA.style.boxSizing = "border-box";
                            courseA.addEventListener("mouseenter", () => {
                                courseA.style.color = "rgba(172, 172, 172, 1)";
                            });
                            courseA.addEventListener("mouseleave", () => {
                                courseA.style.color = "#fff";
                            });
                            const courseIcon = document.createElement("img");
                            courseIcon.src = chrome.runtime.getURL(
                                "icons/graduation_cap.svg"
                            );
                            courseIcon.alt = "";
                            courseIcon.style.width = "20px";
                            courseIcon.style.paddingTop = "4px";
                            courseIcon.style.height = "20px";
                            courseIcon.style.flexShrink = "0";
                            courseIcon.style.opacity = "1";
                            courseIcon.style.color = "white";
                            const text = document.createElement("span");
                            text.textContent =
                                course.fullname ||
                                course.shortname ||
                                String(course.id);
                            text.style.flex = "1";
                            courseA.appendChild(courseIcon);
                            courseA.appendChild(text);
                            courseLi.appendChild(courseA);
                            list.appendChild(courseLi);

                            // Create "Kompetencje"
                            const competencesLi = document.createElement("li");
                            competencesLi.style.padding = "4px 0px 4px 0px";
                            const competencesA = document.createElement("a");
                            competencesA.href =
                                "https://ekursy.put.poznan.pl/grade/report/user/index.php?id=" +
                                id;
                            competencesA.target = "_self";
                            competencesA.rel = "noopener noreferrer";
                            competencesA.textContent = "Kompetencje";
                            competencesA.style.display = "flex";
                            competencesA.style.alignItems = "top";
                            competencesA.style.gap = "2px";
                            competencesA.style.width = "100%";
                            competencesA.style.textDecoration = "none";
                            competencesA.style.color = "#fff";
                            competencesA.style.background =
                                "rgba(255,255,255,0.00)";
                            competencesA.style.padding = "0px 0px";
                            competencesA.style.boxSizing = "border-box";
                            competencesA.style.fontSize = "14px";
                            competencesA.style.fontWeight = "400";
                            competencesA.addEventListener("mouseenter", () => {
                                competencesA.style.color =
                                    "rgba(172, 172, 172, 1)";
                            });
                            competencesA.addEventListener("mouseleave", () => {
                                competencesA.style.color = "#fff";
                            });
                            const competencesIcon =
                                document.createElement("img");
                            competencesIcon.src = chrome.runtime.getURL(
                                "icons/checkmark.svg"
                            );
                            competencesIcon.alt = "";
                            competencesIcon.style.width = "20px";
                            competencesIcon.style.paddingTop = "4px";
                            competencesIcon.style.height = "20px";
                            competencesIcon.style.flexShrink = "0";
                            competencesIcon.style.opacity = "1";
                            competencesA.prepend(competencesIcon);
                            competencesLi.appendChild(competencesA);
                            list.appendChild(competencesLi);

                            // Create "Oceny"
                            const gradesLi = document.createElement("li");
                            gradesLi.style.padding = "4px 0px 4px 0px";
                            const gradesA = document.createElement("a");
                            gradesA.href =
                                "https://ekursy.put.poznan.pl/grade/report/user/index.php?id=" +
                                id;
                            gradesA.target = "_self";
                            gradesA.rel = "noopener noreferrer";
                            gradesA.textContent = "Oceny";
                            gradesA.style.display = "flex";
                            gradesA.style.alignItems = "top";
                            gradesA.style.gap = "2px";
                            gradesA.style.width = "100%";
                            gradesA.style.textDecoration = "none";
                            gradesA.style.color = "#fff";
                            gradesA.style.background = "rgba(255,255,255,0.00)";
                            gradesA.style.padding = "0px 0px";
                            gradesA.style.boxSizing = "border-box";
                            gradesA.style.fontSize = "14px";
                            gradesA.style.fontWeight = "400";
                            gradesA.addEventListener("mouseenter", () => {
                                gradesA.style.color = "rgba(172, 172, 172, 1)";
                            });
                            gradesA.addEventListener("mouseleave", () => {
                                gradesA.style.color = "#fff";
                            });
                            const gradesIcon = document.createElement("img");
                            gradesIcon.src =
                                chrome.runtime.getURL("icons/grades.svg");
                            gradesIcon.alt = "";
                            gradesIcon.style.width = "20px";
                            gradesIcon.style.paddingTop = "4px";
                            gradesIcon.style.height = "20px";
                            gradesIcon.style.flexShrink = "0";
                            gradesIcon.style.opacity = "1";
                            gradesA.prepend(gradesIcon);
                            gradesLi.appendChild(gradesA);
                            list.appendChild(gradesLi);

                            const sectionNumbers = getAllSectionNumbers();
                            const sections = sectionNumbers.map((n) => ({
                                number: n,
                                name: getSectionName(n),
                            }));
                            console.log(sections);
                            sections.forEach((section) => {
                                if (section.name === "not found") return;
                                // Section item
                                const li = document.createElement("li");
                                li.style.padding = "4px 0px 4px 2px";
                                const a = document.createElement("a");
                                a.href = "#section-" + section.number;
                                a.target = "_self";
                                a.rel = "noopener noreferrer";
                                a.style.display = "flex";
                                a.style.alignItems = "top";
                                a.style.gap = "2px";
                                a.style.width = "100%";
                                a.style.fontSize = "14px";
                                a.style.fontWeight = "400";
                                a.style.textDecoration = "none";
                                a.style.color = "#fff";
                                a.style.padding = "2px 3px";
                                a.style.borderRadius = "6px";
                                a.style.background = "transparent";
                                a.style.border = "1px solid transparent";
                                a.style.boxSizing = "border-box";
                                a.addEventListener("mouseenter", () => {
                                    a.style.color = "rgba(172, 172, 172, 1)";
                                });
                                a.addEventListener("mouseleave", () => {
                                    a.style.color = "#fff";
                                });
                                const icon = document.createElement("img");
                                icon.src =
                                    chrome.runtime.getURL("icons/folder.svg");
                                icon.alt = "";
                                icon.style.width = "20px";
                                icon.style.paddingTop = "4px";
                                icon.style.height = "20px";
                                icon.style.flexShrink = "0";
                                icon.style.opacity = "1";
                                icon.style.color = "white";

                                const text = document.createElement("span");
                                text.textContent = section.name;
                                text.style.flex = "1";

                                a.appendChild(icon);
                                a.appendChild(text);
                                li.appendChild(a);
                                list.appendChild(li);
                            });
                        }

                        // Create "Strona główna""
                        const mainPageLi = document.createElement("li");
                        mainPageLi.style.padding = "16px 0px 8px 0px";
                        const mainPageA = document.createElement("a");
                        mainPageA.href = "https://ekursy.put.poznan.pl";
                        mainPageA.target = "_self";
                        mainPageA.rel = "noopener noreferrer";
                        mainPageA.textContent = "Strona główna";
                        mainPageA.style.display = "flex";
                        mainPageA.style.alignItems = "top";
                        mainPageA.style.gap = "2px";
                        mainPageA.style.width = "100%";
                        mainPageA.style.textDecoration = "none";
                        mainPageA.style.color = "#fff";
                        mainPageA.style.background = "rgba(255,255,255,0.00)";
                        mainPageA.style.padding = "0px 0px";
                        mainPageA.style.boxSizing = "border-box";
                        mainPageA.style.fontSize = "14px";
                        mainPageA.style.fontWeight = "400";
                        mainPageA.addEventListener("mouseenter", () => {
                            mainPageA.style.color = "rgba(172, 172, 172, 1)";
                        });
                        mainPageA.addEventListener("mouseleave", () => {
                            mainPageA.style.color = "#fff";
                        });
                        const mainPageIcon = document.createElement("img");
                        mainPageIcon.src =
                            chrome.runtime.getURL("icons/house.svg");
                        mainPageIcon.alt = "";
                        mainPageIcon.style.width = "20px";
                        mainPageIcon.style.paddingTop = "4px";
                        mainPageIcon.style.height = "20px";
                        mainPageIcon.style.flexShrink = "0";
                        mainPageIcon.style.opacity = "1";
                        mainPageA.prepend(mainPageIcon);
                        mainPageLi.appendChild(mainPageA);
                        list.appendChild(mainPageLi);

                        // Create "Kokpit"
                        const cockpitLi = document.createElement("li");
                        cockpitLi.style.padding = "8px 0px 8px 0px";
                        const cockpitA = document.createElement("a");
                        cockpitA.href = "https://ekursy.put.poznan.pl/my";
                        cockpitA.target = "_self";
                        cockpitA.rel = "noopener noreferrer";
                        cockpitA.textContent = "Kokpit";
                        cockpitA.style.display = "flex";
                        cockpitA.style.alignItems = "top";
                        cockpitA.style.gap = "2px";
                        cockpitA.style.width = "100%";
                        cockpitA.style.textDecoration = "none";
                        cockpitA.style.color = "#fff";
                        cockpitA.style.background = "rgba(255,255,255,0.00)";
                        cockpitA.style.padding = "0px 0px";
                        cockpitA.style.boxSizing = "border-box";
                        cockpitA.style.fontSize = "14px";
                        cockpitA.style.fontWeight = "400";
                        cockpitA.addEventListener("mouseenter", () => {
                            cockpitA.style.color = "rgba(172, 172, 172, 1)";
                        });
                        cockpitA.addEventListener("mouseleave", () => {
                            cockpitA.style.color = "#fff";
                        });
                        const cockpitIcon = document.createElement("img");
                        cockpitIcon.src =
                            chrome.runtime.getURL("icons/meter.svg");
                        cockpitIcon.alt = "";
                        cockpitIcon.style.width = "20px";
                        cockpitIcon.style.paddingTop = "4px";
                        cockpitIcon.style.height = "20px";
                        cockpitIcon.style.flexShrink = "0";
                        cockpitIcon.style.opacity = "1";
                        cockpitA.prepend(cockpitIcon);
                        cockpitLi.appendChild(cockpitA);
                        list.appendChild(cockpitLi);

                        // Create "Kalendarz"
                        const calendarLi = document.createElement("li");
                        calendarLi.style.padding = "8px 0px 8px 0px";
                        const calendarA = document.createElement("a");
                        calendarA.href =
                            "https://ekursy.put.poznan.pl/calendar/view.php?view=month";
                        calendarA.target = "_self";
                        calendarA.rel = "noopener noreferrer";
                        calendarA.textContent = "Kalendarz";
                        calendarA.style.display = "flex";
                        calendarA.style.alignItems = "top";
                        calendarA.style.gap = "2px";
                        calendarA.style.width = "100%";
                        calendarA.style.textDecoration = "none";
                        calendarA.style.color = "#fff";
                        calendarA.style.background = "rgba(255,255,255,0.00)";
                        calendarA.style.padding = "0px 0px";
                        calendarA.style.boxSizing = "border-box";
                        calendarA.style.fontSize = "14px";
                        calendarA.style.fontWeight = "400";
                        calendarA.addEventListener("mouseenter", () => {
                            calendarA.style.color = "rgba(172, 172, 172, 1)";
                        });
                        calendarA.addEventListener("mouseleave", () => {
                            calendarA.style.color = "#fff";
                        });
                        const calendarIcon = document.createElement("img");
                        calendarIcon.src =
                            chrome.runtime.getURL("icons/calendar.svg");
                        calendarIcon.alt = "";
                        calendarIcon.style.width = "20px";
                        calendarIcon.style.paddingTop = "4px";
                        calendarIcon.style.height = "20px";
                        calendarIcon.style.flexShrink = "0";
                        calendarIcon.style.opacity = "1";
                        calendarA.prepend(calendarIcon);
                        calendarLi.appendChild(calendarA);
                        list.appendChild(calendarLi);

                        // Create "Prywatne pliki"
                        const filesLi = document.createElement("li");
                        filesLi.style.padding = "8px 0px 8px 0px";
                        const filesA = document.createElement("a");
                        filesA.href =
                            "https://ekursy.put.poznan.pl/user/files.php";
                        filesA.target = "_self";
                        filesA.rel = "noopener noreferrer";
                        filesA.textContent = "Prywatne pliki";
                        filesA.textContent = "Prywatne pliki";
                        filesA.style.display = "flex";
                        filesA.style.alignItems = "top";
                        filesA.style.gap = "2px";
                        filesA.style.width = "100%";
                        filesA.style.textDecoration = "none";
                        filesA.style.color = "#fff";
                        filesA.style.background = "rgba(255,255,255,0.00)";
                        filesA.style.padding = "0px 0px";
                        filesA.style.boxSizing = "border-box";
                        filesA.style.fontSize = "14px";
                        filesA.style.fontWeight = "400";
                        filesA.addEventListener("mouseenter", () => {
                            filesA.style.color = "rgba(172, 172, 172, 1)";
                        });
                        filesA.addEventListener("mouseleave", () => {
                            filesA.style.color = "#fff";
                        });
                        const filesIcon = document.createElement("img");
                        filesIcon.src = chrome.runtime.getURL("icons/file.svg");
                        filesIcon.alt = "";
                        filesIcon.style.width = "20px";
                        filesIcon.style.paddingTop = "4px";
                        filesIcon.style.height = "20px";
                        filesIcon.style.flexShrink = "0";
                        filesIcon.style.opacity = "1";
                        filesA.prepend(filesIcon);
                        filesLi.appendChild(filesA);
                        list.appendChild(filesLi);

                        // Create "Moje kursy"
                        const myCoursesLi = document.createElement("li");
                        myCoursesLi.style.padding = "8px 0px 8px 0px";
                        const myCoursesSpan = document.createElement("span");
                        myCoursesSpan.textContent = "Moje kursy";
                        myCoursesSpan.style.display = "flex";
                        myCoursesSpan.style.alignItems = "top";
                        myCoursesSpan.style.gap = "2px";
                        myCoursesSpan.style.width = "100%";
                        myCoursesSpan.style.textDecoration = "none";
                        myCoursesSpan.style.color = "#fff";
                        myCoursesSpan.style.background =
                            "rgba(255,255,255,0.00)";
                        myCoursesSpan.style.padding = "0px 0px";
                        myCoursesSpan.style.boxSizing = "border-box";
                        myCoursesSpan.style.fontSize = "14px";
                        myCoursesSpan.style.fontWeight = "400";
                        myCoursesSpan.style.cursor = "default";
                        const icon = document.createElement("img");
                        icon.src = chrome.runtime.getURL(
                            "icons/graduation_cap.svg"
                        );
                        icon.alt = "";
                        icon.style.width = "20px";
                        icon.style.paddingTop = "4px";
                        icon.style.height = "20px";
                        icon.style.flexShrink = "0";
                        icon.style.opacity = "1";
                        myCoursesSpan.prepend(icon);
                        myCoursesLi.appendChild(myCoursesSpan);
                        list.appendChild(myCoursesLi);

                        normalized
                            .filter((c) => !c.hidden)
                            .forEach((c) => {
                                // Course item
                                const li = document.createElement("li");
                                li.style.padding = "4px 0px 4px 2px";

                                const a = document.createElement("a");
                                a.href =
                                    "https://ekursy.put.poznan.pl/course/view.php?id=" +
                                    encodeURIComponent(c.id);
                                a.target = "_self";
                                a.rel = "noopener noreferrer";
                                a.style.display = "flex";
                                a.style.alignItems = "top";
                                a.style.gap = "2px";
                                a.style.width = "100%";
                                a.style.fontSize = "14px";
                                a.style.fontWeight = "400";
                                a.style.textDecoration = "none";
                                a.style.color = "#fff";
                                a.style.padding = "2px 3px";
                                a.style.borderRadius = "6px";
                                a.style.background = "transparent";
                                a.style.border = "1px solid transparent";
                                a.style.boxSizing = "border-box";

                                a.addEventListener("mouseenter", () => {
                                    a.style.color = "rgba(172, 172, 172, 1)";
                                });
                                a.addEventListener("mouseleave", () => {
                                    a.style.color = "#fff";
                                });

                                const icon = document.createElement("img");
                                icon.src = chrome.runtime.getURL(
                                    "icons/graduation_cap.svg"
                                );
                                icon.alt = "";
                                icon.style.width = "20px";
                                icon.style.paddingTop = "4px";
                                icon.style.height = "20px";
                                icon.style.flexShrink = "0";
                                icon.style.opacity = "1";
                                icon.style.color = "white";
                                const text = document.createElement("span");
                                text.textContent =
                                    c.fullname || c.shortname || String(c.id);
                                text.style.flex = "1";
                                a.appendChild(icon);
                                a.appendChild(text);
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
                    const stored =
                        (r && r.ekursy_sidebar_width) || DEFAULT_SIDEBAR_WIDTH;
                    const w = Number(stored) || DEFAULT_SIDEBAR_WIDTH;
                    applyWidthToSidebar(w, el, noAnimation);
                } catch (e) {
                    try {
                        applyWidthToSidebar(
                            DEFAULT_SIDEBAR_WIDTH,
                            el,
                            noAnimation
                        );
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
                    __ekursy_prev_body_padding_left =
                        body.style.paddingLeft || "";
                if (noAnimation) {
                    __ekursy_prev_body_transition = body.style.transition || "";
                    body.style.transition = "none";
                    body.style.paddingLeft = DEFAULT_SIDEBAR_WIDTH + "px";
                    void body.offsetHeight;
                    setTimeout(() => {
                        body.style.transition =
                            __ekursy_prev_body_transition ||
                            "padding-left 0.25s ease";
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

        if (noAnimation) {
            setTimeout(() => {
                try {
                    document.documentElement.classList.remove(
                        "ekursy-disable-transition"
                    );
                    const s = document.getElementById(
                        "ekursy-disable-transition"
                    );
                    if (s) s.remove();
                } catch (e) {}
            }, 80);
        }
    }

    function applyWidthToSidebar(width, el, noAnimation = false) {
        const w = Number(width) || DEFAULT_SIDEBAR_WIDTH;
        try {
            if (el) el.style.width = w + "px";
        } catch (e) {}

        try {
            const body = document.body;
            if (body) {
                if (__ekursy_prev_body_padding_left === null)
                    __ekursy_prev_body_padding_left =
                        body.style.paddingLeft || "";
                if (noAnimation) {
                    __ekursy_prev_body_transition = body.style.transition || "";
                    body.style.transition = "none";
                    body.style.paddingLeft = w + "px";
                    void body.offsetHeight;
                    setTimeout(() => {
                        body.style.transition =
                            __ekursy_prev_body_transition ||
                            "padding-left 0.25s ease";
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

        try {
            const navbar = document.querySelector(".lambda-nav");
            if (navbar) {
                if (__ekursy_prev_navbar_padding_left === null)
                    __ekursy_prev_navbar_padding_left =
                        navbar.style.paddingLeft || "";
                if (noAnimation) {
                    __ekursy_prev_navbar_transition =
                        navbar.style.transition || "";
                    navbar.style.transition = "none";
                    navbar.style.paddingLeft = w + "px";
                    void navbar.offsetHeight;
                    setTimeout(() => {
                        navbar.style.transition =
                            __ekursy_prev_navbar_transition ||
                            "padding-left 0.25s ease";
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

        try {
            const navbar = document.querySelector(".lambda-nav");
            if (navbar) {
                if (typeof __ekursy_prev_navbar_padding_left === "string") {
                    navbar.style.paddingLeft =
                        __ekursy_prev_navbar_padding_left;
                } else {
                    navbar.style.paddingLeft = "";
                }
            }
        } catch (e) {}
    }

    function onToggle() {
        const exists = !!document.getElementById(SIDEBAR_ID);
        if (exists) removeSidebar();
        else createSidebar();
    }

    function injectBurger() {
        if (
            document.getElementById(BURGER_ID) ||
            window.__ekursy_burger_injected
        )
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
        btn.style.color = "white";
        btn.style.borderRadius = "6px";
        btn.style.transition = "background 0.15s";
        btn.innerHTML = '<span style="pointer-events:none">☰</span>';

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            onToggle();
        });

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
    function getAllSectionNumbers() {
        const sectionLis = document.querySelectorAll("li[id^='section-']");
        return Array.from(sectionLis)
            .map((li) => {
                const match = li.id.match(/^section-(\d+)$/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter((n) => n !== null);
    }

    function getSectionName(sectionNumber) {
        const sectionLi = document.querySelector(`#section-${sectionNumber}`);
        if (!sectionLi) return null;
        const sectionNameH3 = sectionLi.querySelector("h3.sectionname");
        if (!sectionNameH3) return "not found";
        return sectionNameH3.textContent.trim();
    }

    function removeDrawerButtons() {
        try {
            const drawer = document.getElementsByClassName("drawer");
            Array.from(drawer).forEach((d) => {
                try {
                    if (d && d.parentNode) d.parentNode.removeChild(d);
                } catch (e) {}
            });

            const els = document.querySelectorAll(
                'button[data-toggler="drawers"]'
            );
            els.forEach((el) => {
                try {
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                } catch (e) {}
            });

            if (!window.__ekursy_drawers_guard_installed) {
                try {
                    const mo = new MutationObserver((mutations) => {
                        for (const m of mutations) {
                            if (
                                m.type === "childList" &&
                                m.addedNodes &&
                                m.addedNodes.length
                            ) {
                                for (const n of m.addedNodes) {
                                    try {
                                        if (n && n.nodeType === 1) {
                                            const node =
                                                /** @type {Element} */ (n);
                                            if (
                                                node.matches &&
                                                node.matches(
                                                    'button[data-toggler="drawers"]'
                                                )
                                            ) {
                                                try {
                                                    if (node.parentNode)
                                                        node.parentNode.removeChild(
                                                            node
                                                        );
                                                } catch (e) {}
                                                continue;
                                            }
                                            try {
                                                const found =
                                                    node.querySelectorAll &&
                                                    node.querySelectorAll(
                                                        'button[data-toggler="drawers"]'
                                                    );
                                                if (found && found.length) {
                                                    found.forEach((f) => {
                                                        try {
                                                            if (
                                                                f &&
                                                                f.parentNode
                                                            )
                                                                f.parentNode.removeChild(
                                                                    f
                                                                );
                                                        } catch (e) {}
                                                    });
                                                }
                                            } catch (e) {}
                                        }
                                    } catch (e) {}
                                }
                            }
                        }
                    });
                    mo.observe(document.documentElement || document.body, {
                        childList: true,
                        subtree: true,
                    });
                    window.__ekursy_drawers_guard_mo = mo;
                    window.__ekursy_drawers_guard_installed = true;
                } catch (e) {}
            }
        } catch (e) {}
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
                                    !!sidebarEl.getAttribute(
                                        "data-ekursy-noanim"
                                    );
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
            if (msg.action === "setRemoveLambdaNav") {
                try {
                    if (msg.remove) {
                        const nav = document.querySelector(".lambda-nav");
                        if (nav && nav.parentNode)
                            nav.parentNode.removeChild(nav);
                    }
                } catch (e) {}
            }
        });
        window.__ekursy_sidebar_listening = true;
    }

    try {
        chrome.storage.local.get(["persistSidebar"], (res) => {
            const hasKey =
                res &&
                Object.prototype.hasOwnProperty.call(res, "persistSidebar");
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
                                fullname:
                                    c.fullname ||
                                    c.fullnamedisplay ||
                                    c.name ||
                                    "",
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
                        try {
                            chrome.storage.local.get(
                                ["ekursy_remove_lambda_nav"],
                                (rr) => {
                                    const removeNav = !!(
                                        rr && rr.ekursy_remove_lambda_nav
                                    );
                                    if (removeNav) {
                                        try {
                                            const nav =
                                                document.querySelector(
                                                    ".lambda-nav"
                                                );
                                            if (nav && nav.parentNode)
                                                nav.parentNode.removeChild(nav);
                                        } catch (e) {}
                                    }
                                }
                            );
                        } catch (e) {}
                        try {
                            removeDrawerButtons();
                        } catch (e) {}
                        if (persist) createSidebar({ noAnimation: true });
                    },
                    { once: true }
                );
            } else {
                injectBurger();
                startPrefetch();
                try {
                    chrome.storage.local.get(
                        ["ekursy_remove_lambda_nav"],
                        (rr) => {
                            const removeNav = !!(
                                rr && rr.ekursy_remove_lambda_nav
                            );
                            if (removeNav) {
                                try {
                                    const nav =
                                        document.querySelector(".lambda-nav");
                                    if (nav && nav.parentNode)
                                        nav.parentNode.removeChild(nav);
                                } catch (e) {}
                            }
                        }
                    );
                } catch (e) {}
                try {
                    removeDrawerButtons();
                } catch (e) {}
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
