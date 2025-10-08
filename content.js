(() => {
    // --- CONFIGURATION & CONSTANTS ---
    const CONFIG = {
        LOGIN_URL_PREFIX: "https://ekursy.put.poznan.pl/login",
        SIDEBAR_ID: "ekursy-sidebar-root",
        BURGER_ID: "ekursy-burger-btn",
        DEFAULT_SIDEBAR_WIDTH: 260,
        HEADER_SELECTOR:
            "header, .main-header, #header, .header, .site-header, #main-header, .navbar",
        LAMBDA_NAV_SELECTOR: ".lambda-nav",
        DRAWER_SELECTOR: ".drawer-toggler",
    };

    // --- STATE MANAGEMENT ---
    // Grouping all module-level state variables into a single object for clarity.
    const state = {
        prevBodyPaddingLeft: null,
        prevNavbarPaddingLeft: null,
        prevBodyTransition: null,
        prevNavbarTransition: null,
        cachedCourses: null,
        coursesPromise: null,
        burgerInjected: false,
        shrinkGuardInstalled: false,
    };

    // --- INITIALIZATION ---
    if (window.location.href.startsWith(CONFIG.LOGIN_URL_PREFIX)) {
        return;
    }

    /**
     * Module for handling interactions with chrome.storage.local.
     */
    const storage = {
        /**
         * Loads courses from local storage.
         * @returns {Promise<Array>} A promise that resolves with the array of stored courses.
         */
        loadCourses: () => {
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.get(["ekursy_courses"], (result) => {
                        resolve((result && result.ekursy_courses) || []);
                    });
                } catch (e) {
                    console.error(
                        "eKursy Sidebar: Failed to load courses from storage.",
                        e
                    );
                    resolve([]);
                }
            });
        },

        /**
         * Saves an array of courses to local storage.
         * @param {Array} courses The array of course objects to save.
         */
        saveCourses: (courses) => {
            try {
                chrome.storage.local.set({ ekursy_courses: courses });
            } catch (e) {
                console.error(
                    "eKursy Sidebar: Failed to save courses to storage.",
                    e
                );
            }
        },
    };

    /**
     * Module for creating and managing UI elements.
     */
    const ui = {
        /**
         * Creates a styled list item with a link and an icon.
         * @param {{text: string, link: string, icon: string, padding: string}} options
         * @returns {HTMLLIElement}
         */
        createLinkedLi: ({ text, link, icon, padding = "4px 0px 4px 0px" }) => {
            const li = document.createElement("li");
            li.style.padding = padding;

            const a = document.createElement("a");
            a.href = link;
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
            a.style.borderRadius = "6px";
            a.style.background = "transparent";
            a.style.border = "1px solid transparent";
            a.style.boxSizing = "border-box";

            a.addEventListener(
                "mouseenter",
                () => (a.style.color = "rgba(172, 172, 172, 1)")
            );
            a.addEventListener("mouseleave", () => (a.style.color = "#fff"));

            const iconElement = document.createElement("img");
            iconElement.src = chrome.runtime.getURL(icon);
            iconElement.alt = "";
            iconElement.style.width = "20px";
            iconElement.style.paddingTop = "4px";
            iconElement.style.height = "20px";
            iconElement.style.flexShrink = "0";
            iconElement.style.opacity = "1";
            iconElement.style.color = "white";

            const textElement = document.createElement("span");
            textElement.textContent = text;
            textElement.style.flex = "1";

            a.appendChild(iconElement);
            a.appendChild(textElement);
            li.appendChild(a);
            return li;
        },

        /**
         * Creates a styled list item for a course section.
         * @param {{sectionName: string, sectionNumber: number}} options
         * @returns {HTMLLIElement}
         */
        createSectionLi: ({ sectionName, sectionNumber }) => {
            const li = document.createElement("li");
            li.style.padding = "4px 0px 4px 2px";

            const a = document.createElement("a");
            a.href = "#section-" + sectionNumber;
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

            a.addEventListener(
                "mouseenter",
                () => (a.style.color = "rgba(172, 172, 172, 1)")
            );
            a.addEventListener("mouseleave", () => (a.style.color = "#fff"));

            const icon = document.createElement("img");
            icon.src = chrome.runtime.getURL("icons/folder.svg");
            icon.alt = "";
            icon.style.width = "20px";
            icon.style.paddingTop = "4px";
            icon.style.height = "20px";
            icon.style.flexShrink = "0";
            icon.style.opacity = "1";
            icon.style.color = "white";

            const text = document.createElement("span");
            text.textContent = sectionName;
            text.style.flex = "1";

            a.appendChild(icon);
            a.appendChild(text);
            li.appendChild(a);
            return li;
        },

        /**
         * Injects the burger button into the page header.
         */
        injectBurger: () => {
            if (
                document.getElementById(CONFIG.BURGER_ID) ||
                state.burgerInjected
            ) {
                return;
            }

            const target =
                document.getElementById("main-header") ||
                document.querySelector(CONFIG.HEADER_SELECTOR);
            if (!target) {
                console.warn(
                    "eKursy Sidebar: Could not find header element to inject burger button."
                );
                return;
            }

            const btn = document.createElement("button");
            btn.id = CONFIG.BURGER_ID;
            btn.type = "button";
            btn.title = "Toggle eKursy Sidebar";
            btn.setAttribute("aria-pressed", "false");
            btn.style.display = "inline-flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.style.width = "36px";
            btn.style.height = "36px";
            btn.style.padding = "8px";
            btn.style.border = "none";
            btn.style.background = "transparent";
            btn.style.cursor = "pointer";
            btn.style.borderRadius = "50%";
            btn.style.position = "absolute";
            btn.style.left = "15px";
            btn.style.top = "50%";
            btn.style.transform = "translateY(-50%)";

            const icon = document.createElement("img");
            icon.src = chrome.runtime.getURL("icons/burger.svg");
            icon.style.width = "100%";
            icon.style.height = "100%";

            btn.appendChild(icon);
            btn.addEventListener("click", sidebar.onToggle);
            target.prepend(btn);
            state.burgerInjected = true;
        },
    };

    /**
     * Module for direct page manipulations (padding, transitions, observers).
     */
    const page = {
        /**
         * Adjusts the padding of the body and lambda-nav to accommodate the sidebar.
         * @param {number} width The width of the sidebar.
         * @param {boolean} noAnimation If true, transitions are temporarily disabled.
         */
        adjustLayoutForSidebar: (width, noAnimation = false) => {
            const w = Number(width) || CONFIG.DEFAULT_SIDEBAR_WIDTH;
            const body = document.body;
            const navbar = document.querySelector(CONFIG.LAMBDA_NAV_SELECTOR);
            const drawer = document.querySelector(CONFIG.DRAWER_SELECTOR);
            if (drawer) {
                drawer.style.display = "none";
            }

            if (body) {
                if (state.prevBodyPaddingLeft === null) {
                    state.prevBodyPaddingLeft = body.style.paddingLeft || "";
                }
                if (noAnimation) {
                    state.prevBodyTransition = body.style.transition || "";
                    body.style.transition = "none";
                    body.style.paddingLeft = w + "px";
                    body.style.paddingTop = "100px";
                    void body.offsetHeight; // Force reflow
                    setTimeout(() => {
                        body.style.transition =
                            state.prevBodyTransition ||
                            "padding-left 0.25s ease";
                        state.prevBodyTransition = null;
                    }, 50);
                } else {
                    body.style.transition = body.style.transition
                        ? body.style.transition + ", padding-left 0.25s ease"
                        : "padding-left 0.25s ease";
                    body.style.paddingLeft = w + "px";
                    body.style.paddingTop = "100px";
                }
            }

            if (navbar) {
                if (state.prevNavbarPaddingLeft === null) {
                    state.prevNavbarPaddingLeft =
                        navbar.style.paddingLeft || "";
                }
                if (noAnimation) {
                    state.prevNavbarTransition = navbar.style.transition || "";
                    navbar.style.transition = "none";
                    navbar.style.paddingLeft = w + "px";
                    void navbar.offsetHeight; // Force reflow
                    setTimeout(() => {
                        navbar.style.transition =
                            state.prevNavbarTransition ||
                            "padding-left 0.25s ease";
                        state.prevNavbarTransition = null;
                    }, 50);
                } else {
                    navbar.style.transition = navbar.style.transition
                        ? navbar.style.transition + ", padding-left 0.25s ease"
                        : "padding-left 0.25s ease";
                    navbar.style.paddingLeft = w + "px";
                }
                navbar.style.zIndex = navbar.style.zIndex || 2147483648;
            }
        },

        /**
         * Resets the page layout to its original state.
         */
        resetLayout: () => {
            const body = document.body;
            const navbar = document.querySelector(CONFIG.LAMBDA_NAV_SELECTOR);
            if (body) {
                body.style.paddingLeft =
                    typeof state.prevBodyPaddingLeft === "string"
                        ? state.prevBodyPaddingLeft
                        : "";
            }
            if (navbar) {
                navbar.style.paddingLeft =
                    typeof state.prevNavbarPaddingLeft === "string"
                        ? state.prevNavbarPaddingLeft
                        : "";
            }
        },

        /**
         * Installs MutationObservers to ensure the header stays "shrunk".
         */
        ensureHeaderShrunk: () => {
            const headerEl =
                document.getElementById("main-header") ||
                document.querySelector(CONFIG.HEADER_SELECTOR);
            if (!headerEl) return;

            headerEl.classList.add("shrink");

            if (state.shrinkGuardInstalled) return;

            const attachObserver = (target) => {
                const mo = new MutationObserver((mutations) => {
                    mutations.forEach((m) => {
                        if (
                            m.type === "attributes" &&
                            m.attributeName === "class" &&
                            !target.classList.contains("shrink")
                        ) {
                            target.classList.add("shrink");
                        }
                    });
                });
                mo.observe(target, {
                    attributes: true,
                    attributeFilter: ["class"],
                    subtree: false,
                });
                window.__ekursy_shrink_header_mo = mo;
            };

            attachObserver(headerEl);

            const docMo = new MutationObserver(() => {
                const currentHeader =
                    document.getElementById("main-header") ||
                    document.querySelector(CONFIG.HEADER_SELECTOR);
                if (currentHeader) {
                    if (!currentHeader.classList.contains("shrink")) {
                        currentHeader.classList.add("shrink");
                    }
                    if (
                        window.__ekursy_shrink_header_mo &&
                        window.__ekursy_shrink_header_mo.target !==
                            currentHeader
                    ) {
                        try {
                            window.__ekursy_shrink_header_mo.disconnect();
                        } catch (e) {}
                        attachObserver(currentHeader);
                    }
                }
            });
            docMo.observe(document.documentElement || document.body, {
                childList: true,
                subtree: true,
            });

            state.shrinkGuardInstalled = true;
        },
    };

    /**
     * The main sidebar controller module.
     */
    const sidebar = {
        /**
         * Toggles the sidebar visibility. Main entry point from the burger button.
         */
        onToggle: () => {
            const exists = !!document.getElementById(CONFIG.SIDEBAR_ID);
            if (exists) {
                sidebar.remove();
            } else {
                sidebar.create();
            }
        },

        /**
         * Creates and injects the sidebar into the page.
         * @param {{ noAnimation: boolean }} options
         */
        create: ({ noAnimation = false } = {}) => {
            if (document.getElementById(CONFIG.SIDEBAR_ID)) return;

            const el = document.createElement("div");
            el.id = CONFIG.SIDEBAR_ID;
            el.setAttribute("data-ekursy", "1");
            el.style.position = "fixed";
            el.style.left = "0";
            el.style.right = "auto";
            el.style.width = CONFIG.DEFAULT_SIDEBAR_WIDTH + "px";
            el.style.height = "100%";
            el.style.background = "#016c8f";
            el.style.color = "#fff";
            el.style.boxShadow = "0 0 8px rgba(0,0,0,0.2)";
            el.style.zIndex = 2147483647;
            el.style.padding = "12px";

            (document.body || document.documentElement).appendChild(el);

            try {
                const headerHeight = 62.5;
                el.style.top = headerHeight + "px";
                el.style.height = `calc(100% - ${headerHeight}px)`;
                page.ensureHeaderShrunk();
            } catch (e) {
                el.style.top = "0";
                el.style.height = "100%";
            }

            if (noAnimation) {
                const style = document.createElement("style");
                style.id = "ekursy-disable-transition";
                style.textContent =
                    ".ekursy-disable-transition, .ekursy-disable-transition * { transition: none !important; animation: none !important; }";
                (document.head || document.documentElement).appendChild(style);
                document.documentElement.classList.add(
                    "ekursy-disable-transition"
                );
            }

            const scrollbarStyle = document.createElement("style");
            scrollbarStyle.setAttribute("data-ekursy-style", "scrollbar");
            scrollbarStyle.textContent = `
                #${CONFIG.SIDEBAR_ID} { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.28) transparent; }
                #${CONFIG.SIDEBAR_ID} ul[data-ekursy-courses] { padding-right: 6px; }
                #${CONFIG.SIDEBAR_ID}::-webkit-scrollbar { width: 10px; }
                #${CONFIG.SIDEBAR_ID}::-webkit-scrollbar-track { background: transparent; }
                #${CONFIG.SIDEBAR_ID}::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
                #${CONFIG.SIDEBAR_ID}::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.26); }
                #${CONFIG.SIDEBAR_ID} h4 { color: #fff; margin: 0 0 8px 0; }
            `;
            el.appendChild(scrollbarStyle);

            sidebar.renderContent();

            try {
                chrome.storage.local.get(["ekursy_sidebar_width"], (r) => {
                    const width =
                        (r && r.ekursy_sidebar_width) ||
                        CONFIG.DEFAULT_SIDEBAR_WIDTH;
                    sidebar.applyWidth(width, el, noAnimation);
                });
            } catch (e) {
                sidebar.applyWidth(
                    CONFIG.DEFAULT_SIDEBAR_WIDTH,
                    el,
                    noAnimation
                );
            }

            const burgerBtn = document.getElementById(CONFIG.BURGER_ID);
            if (burgerBtn) burgerBtn.setAttribute("aria-pressed", "true");

            if (noAnimation) {
                setTimeout(() => {
                    document.documentElement.classList.remove(
                        "ekursy-disable-transition"
                    );
                    const tempStyle = document.getElementById(
                        "ekursy-disable-transition"
                    );
                    if (tempStyle) tempStyle.remove();
                }, 80);
            }
        },

        /**
         * Renders the list of courses and links inside the sidebar.
         */
        renderContent: () => {
            const sidebarEl = document.getElementById(CONFIG.SIDEBAR_ID);
            if (!sidebarEl) return;

            const appendList = (items) => {
                const prevList = sidebarEl.querySelector(
                    "ul[data-ekursy-courses]"
                );
                if (prevList) prevList.remove();

                if (!items || !items.length) return;

                const normalized = items
                    .map((c) => ({
                        id: c.id || c.courseid || null,
                        fullname:
                            c.fullname || c.fullnamedisplay || c.name || "",
                        shortname: c.shortname || "",
                        hidden: !!c.hidden,
                    }))
                    .filter((x) => x && x.id != null);

                storage.saveCourses(normalized);
                state.cachedCourses = normalized;

                const list = document.createElement("ul");
                list.setAttribute("data-ekursy-courses", "1");
                list.style.listStyle = "none";
                list.style.padding = "0px 0 12px 0";
                list.style.margin = "0px 0";
                list.style.maxHeight = "100%";
                list.style.overflow = "auto";

                // Logic to render different content based on URL
                const href = window.location.href;
                const isCoursePage =
                    href.includes("/course/view.php") ||
                    href.includes("/grade/report/user/index.php") ||
                    href.includes("/admin/tool/lp/coursecompetencies.php");

                if (isCoursePage) {
                    const id =
                        new URL(href).searchParams.get("id") ||
                        new URL(href).searchParams.get("courseid");
                    const course = state.cachedCourses.find((c) => c.id == id);
                    if (course) {
                        list.appendChild(
                            ui.createLinkedLi({
                                text:
                                    course.fullname ||
                                    course.shortname ||
                                    String(course.id),
                                link: `https://ekursy.put.poznan.pl/course/view.php?id=${encodeURIComponent(
                                    course.id
                                )}`,
                                icon: "icons/graduation_cap.svg",
                            })
                        );
                        list.appendChild(
                            ui.createLinkedLi({
                                text: "Kompetencje",
                                link: `https://ekursy.put.poznan.pl/admin/tool/lp/coursecompetencies.php?courseid=${id}`,
                                icon: "icons/checkmark.svg",
                            })
                        );
                        list.appendChild(
                            ui.createLinkedLi({
                                text: "Oceny",
                                link: `https://ekursy.put.poznan.pl/grade/report/user/index.php?id=${id}`,
                                icon: "icons/grades.svg",
                            })
                        );

                        const sectionNumbers = getAllSectionNumbers();
                        const sections = sectionNumbers.map((n) => ({
                            number: n,
                            name: getSectionName(n),
                        }));
                        sections.forEach((section) => {
                            if (section.name === "not found") return;
                            // Section item
                            list.appendChild(
                                ui.createSectionLi({
                                    sectionName: section.name,
                                    sectionNumber: section.number,
                                })
                            );
                        });
                    }
                }

                // General links - render on all pages
                list.appendChild(
                    ui.createLinkedLi({
                        text: "Strona główna",
                        link: "https://ekursy.put.poznan.pl",
                        icon: "icons/house.svg",
                        padding: "16px 0px 8px 0px",
                    })
                );
                list.appendChild(
                    ui.createLinkedLi({
                        text: "Kokpit",
                        link: "https://ekursy.put.poznan.pl/my",
                        icon: "icons/meter.svg",
                        padding: "8px 0px 8px 0px",
                    })
                );
                list.appendChild(
                    ui.createLinkedLi({
                        text: "Kalendarz",
                        link: "https://ekursy.put.poznan.pl/calendar/view.php?view=month",
                        icon: "icons/calendar.svg",
                        padding: "8px 0px 8px 0px",
                    })
                );
                list.appendChild(
                    ui.createLinkedLi({
                        text: "Prywatne pliki",
                        link: "https://ekursy.put.poznan.pl/user/files.php",
                        icon: "icons/file.svg",
                        padding: "8px 0px 8px 0px",
                    })
                );
                list.appendChild(
                    ui.createLinkedLi({
                        text: "Moje kursy",
                        link: "https://ekursy.put.poznan.pl/my/courses.php",
                        icon: "icons/graduation_cap.svg",
                        padding: "8px 0px 8px 0px",
                    })
                );

                normalized
                    .filter((c) => !c.hidden)
                    .forEach((c) => {
                        list.appendChild(
                            ui.createLinkedLi({
                                text: c.fullname || c.shortname || String(c.id),
                                link: `https://ekursy.put.poznan.pl/course/view.php?id=${encodeURIComponent(
                                    c.id
                                )}`,
                                icon: "icons/graduation_cap.svg",
                                padding: "4px 0px 4px 2px",
                            })
                        );
                    });

                sidebarEl.appendChild(list);
            };

            if (state.cachedCourses && state.cachedCourses.length) {
                appendList(state.cachedCourses);
                return;
            }

            storage.loadCourses().then((stored) => {
                if (stored && stored.length) {
                    state.cachedCourses = stored;
                    appendList(stored);
                } else if (state.coursesPromise) {
                    state.coursesPromise
                        .then((res) => {
                            if (res && res.length) appendList(res);
                        })
                        .catch(() => {});
                }
            });
        },

        /**
         * Removes the sidebar from the page.
         */
        remove: () => {
            const el = document.getElementById(CONFIG.SIDEBAR_ID);
            if (el) el.remove();

            const burgerBtn = document.getElementById(CONFIG.BURGER_ID);
            if (burgerBtn) burgerBtn.setAttribute("aria-pressed", "false");

            page.resetLayout();
        },

        /**
         * Applies a specific width to the sidebar and adjusts the page layout accordingly.
         * @param {number} width
         * @param {HTMLElement} sidebarElement
         * @param {boolean} noAnimation
         */
        applyWidth: (width, sidebarElement, noAnimation = false) => {
            const w = Number(width) || CONFIG.DEFAULT_SIDEBAR_WIDTH;
            if (sidebarElement) {
                sidebarElement.style.width = w + "px";
            }
            page.adjustLayoutForSidebar(w, noAnimation);
        },
    };

    // --- MESSAGE LISTENER & INITIAL EXECUTION ---

    /**
     * Handles messages from the extension popup.
     * @param {object} message The incoming message.
     * @param {*} sender
     * @param {function} sendResponse
     */
    const handleMessage = (message, sender, sendResponse) => {
        switch (message.action) {
            case "refreshCourses":
                // Invalidate cache and re-render
                state.cachedCourses = null;
                sidebar.renderContent();
                break;
            case "updateSidebarWidth":
                const el = document.getElementById(CONFIG.SIDEBAR_ID);
                if (el) sidebar.applyWidth(message.width, el, false);
                break;
            case "setRemoveLambdaNav":
                const nav = document.querySelector(CONFIG.LAMBDA_NAV_SELECTOR);
                if (nav) nav.style.display = message.remove ? "none" : "";
                break;
        }
    };

    // Attach listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Initial setup on page load
    ui.injectBurger();

    // Load persisted settings
    try {
        chrome.storage.local.get(
            ["persistSidebar", "ekursy_remove_lambda_nav"],
            (result) => {
                if (result.ekursy_remove_lambda_nav) {
                    const nav = document.querySelector(
                        CONFIG.LAMBDA_NAV_SELECTOR
                    );
                    if (nav) nav.style.display = "none";
                }
                if (result.persistSidebar) {
                    sidebar.create({ noAnimation: true });
                }
            }
        );
    } catch (e) {
        console.error("eKursy Sidebar: Could not load initial settings.", e);
    }

    // --- Helper functions ---
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
})();
