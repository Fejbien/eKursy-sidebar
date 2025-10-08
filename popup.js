document.addEventListener("DOMContentLoaded", async () => {
    const persistInput = document.getElementById("persist");
    const removeNavInput = document.getElementById("remove-lambda-nav");
    const sidebarWidthInput = document.getElementById("sidebar-width");
    const manageList = document.getElementById("manage-list");

    const sendMessageToTab = async (message) => {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, message);
            }
        } catch (e) {}
    };

    const setupToggle = async (element, key, action) => {
        const storage = await chrome.storage.local.get([key]);
        element.checked = !!storage[key];

        element.addEventListener("change", async () => {
            const value = element.checked;
            await chrome.storage.local.set({ [key]: value });
            await sendMessageToTab({ action: action, value: value });
        });
    };

    setupToggle(persistInput, "persistSidebar", "setPersist");
    setupToggle(
        removeNavInput,
        "ekursy_remove_lambda_nav",
        "setRemoveLambdaNav"
    );

    const { ekursy_sidebar_width } = await chrome.storage.local.get([
        "ekursy_sidebar_width",
    ]);
    sidebarWidthInput.value = parseInt(ekursy_sidebar_width, 10) || 260;

    sidebarWidthInput.addEventListener("change", async () => {
        let v = parseInt(sidebarWidthInput.value, 10);
        if (isNaN(v)) v = 260;
        v = Math.max(40, Math.min(2000, v));
        sidebarWidthInput.value = v;

        await chrome.storage.local.set({ ekursy_sidebar_width: v });
        await sendMessageToTab({ action: "updateSidebarWidth", width: v });
    });

    const renderManageList = (courses = []) => {
        manageList.innerHTML = "";
        if (!courses.length) {
            manageList.textContent = "Brak kursów do zarządzania.";
            return;
        }

        courses.forEach((course) => {
            const row = document.createElement("div");
            row.className = "item";

            const label = document.createElement("label");
            label.textContent =
                course.fullname || course.shortname || `Kurs ID: ${course.id}`;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = !!course.hidden;

            checkbox.addEventListener("change", async () => {
                const { ekursy_courses: currentCourses = [] } =
                    await chrome.storage.local.get(["ekursy_courses"]);
                const updatedCourses = currentCourses.map((c) =>
                    c.id === course.id ? { ...c, hidden: checkbox.checked } : c
                );
                await chrome.storage.local.set({
                    ekursy_courses: updatedCourses,
                });
                await sendMessageToTab({ action: "refreshCourses" });
            });

            row.appendChild(label);
            row.appendChild(checkbox);
            manageList.appendChild(row);
        });
    };

    try {
        const { ekursy_courses } = await chrome.storage.local.get([
            "ekursy_courses",
        ]);
        renderManageList(ekursy_courses);
    } catch (e) {
        manageList.textContent = "Błąd podczas ładowania kursów.";
        console.error("Error loading courses:", e);
    }
});
