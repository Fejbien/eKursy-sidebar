document.addEventListener("DOMContentLoaded", () => {
    const persist = document.getElementById("persist");
    const manageList = document.getElementById("manage-list");

    chrome.storage.local.get(["persistSidebar"], (res) => {
        persist.checked = !!res.persistSidebar;
    });

    function renderManage(items) {
        try {
            manageList.innerHTML = "";
            if (!items || !items.length) {
                manageList.textContent = "No courses found.";
                return;
            }
            items.forEach((c) => {
                const row = document.createElement("div");
                row.className = "item";
                const label = document.createElement("label");
                label.textContent = c.fullname || c.shortname || String(c.id);
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = !!c.hidden;
                cb.addEventListener("change", () => {
                    try {
                        chrome.storage.local.get(["ekursy_courses"], (r) => {
                            const arr = (r && r.ekursy_courses) || [];
                            const updated = arr.map((x) =>
                                x && String(x.id) === String(c.id)
                                    ? Object.assign({}, x, {
                                          hidden: !!cb.checked,
                                      })
                                    : x
                            );
                            chrome.storage.local.set(
                                { ekursy_courses: updated },
                                () => {
                                    chrome.tabs.query(
                                        { active: true, currentWindow: true },
                                        (tabs) => {
                                            if (!tabs || !tabs.length) return;
                                            try {
                                                chrome.tabs.sendMessage(
                                                    tabs[0].id,
                                                    {
                                                        action: "refreshCourses",
                                                    }
                                                );
                                            } catch (e) {}
                                        }
                                    );
                                }
                            );
                        });
                    } catch (e) {}
                });
                row.appendChild(label);
                row.appendChild(cb);
                manageList.appendChild(row);
            });
        } catch (e) {
            manageList.textContent = "Error loading courses";
        }
    }

    try {
        chrome.storage.local.get(["ekursy_courses"], (r) => {
            const arr = (r && r.ekursy_courses) || [];
            renderManage(arr);
        });
    } catch (e) {
        manageList.textContent = "Error reading storage";
    }

    try {
        const sidebarWidthInput = document.getElementById("sidebar-width");
        if (sidebarWidthInput) {
            chrome.storage.local.get(["ekursy_sidebar_width"], (r) => {
                const w = parseInt(r && r.ekursy_sidebar_width, 10);
                if (!Number.isNaN(w)) sidebarWidthInput.value = String(w);
            });

            sidebarWidthInput.addEventListener("change", () => {
                let v = parseInt(sidebarWidthInput.value, 10);
                if (Number.isNaN(v)) v = 240;
                v = Math.max(40, Math.min(2000, v));
                sidebarWidthInput.value = String(v);
                try {
                    chrome.storage.local.set(
                        { ekursy_sidebar_width: v },
                        () => {
                            chrome.tabs.query(
                                { active: true, currentWindow: true },
                                (tabs) => {
                                    if (!tabs || !tabs.length) return;
                                    try {
                                        chrome.tabs.sendMessage(tabs[0].id, {
                                            action: "updateSidebarWidth",
                                            width: v,
                                        });
                                    } catch (e) {}
                                }
                            );
                        }
                    );
                } catch (e) {}
            });
        }
    } catch (e) {}

    try {
        const removeNav = document.getElementById("remove-lambda-nav");
        if (removeNav) {
            chrome.storage.local.get(["ekursy_remove_lambda_nav"], (r) => {
                removeNav.checked = !!r.ekursy_remove_lambda_nav;
            });
            removeNav.addEventListener("change", () => {
                try {
                    chrome.storage.local.set(
                        { ekursy_remove_lambda_nav: !!removeNav.checked },
                        () => {
                            chrome.tabs.query(
                                { active: true, currentWindow: true },
                                (tabs) => {
                                    if (!tabs || !tabs.length) return;
                                    try {
                                        chrome.tabs.sendMessage(tabs[0].id, {
                                            action: "setRemoveLambdaNav",
                                            remove: !!removeNav.checked,
                                        });
                                        if (!removeNav.checked) {
                                            try {
                                                chrome.tabs.reload(tabs[0].id);
                                            } catch (e) {}
                                        }
                                    } catch (e) {}
                                }
                            );
                        }
                    );
                } catch (e) {}
            });
        }
    } catch (e) {}

    persist.addEventListener("change", () => {
        chrome.storage.local.set({ persistSidebar: persist.checked });
    });
});
