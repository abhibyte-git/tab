// --- State Management ---
let internalClockDatetime = new Date();
let activeTargetCalendarDateKey = null;
let editingShortcutTargetIndex = null;
let activeCategoryTab = 'social';

let cachedAccentHexColor = "#149FE8";

// --- Clock & Layout Customization State ---
let clockSettings = {
    showClock: true,
    showDate: true,
    use12Hour: false,
    showSeconds: false,
    clockSize: 3.8
};

let layoutSettings = {
    contentWidth: 780,
    shortcutSize: 54,
    shortcutSpacing: 10,
    borderRadius: 22,
    shortcutRadius: 14,
    position: 'center'
};

let minimalDarkSettings = {
    bgBrightness: 100,
    cardBrightness: 100,
    borderIntensity: 100,
    shadowIntensity: 100,
    animationsEnabled: true
};

let effectsSettings = {
    glassEnabled: true,
    blurIntensity: 26,
    transparency: 45,
    borderOpacity: 14,
    shadowIntensity: 100,
    glowIntensity: 100,
    animationsEnabled: true,
    animationSpeed: 'normal',
    hoverEnabled: true,
    borderRadius: 40
};

const defaultShortcutConfiguration = [
    // Social Group
    { title: 'YouTube', url: 'https://youtube.com', category: 'social' },
    { title: 'Reddit', url: 'https://reddit.com', category: 'social' },
    { title: 'GitHub', url: 'https://github.com', category: 'social' },
    { title: 'Twitter', url: 'https://x.com', category: 'social' },
    // AI Group
    { title: 'Gemini', url: 'https://gemini.google.com', category: 'ai' },
    { title: 'ChatGPT', url: 'https://chatgpt.com', category: 'ai' },
    { title: 'Claude', url: 'https://claude.ai', category: 'ai' },
    { title: 'DeepSeek', url: 'https://deepseek.com', category: 'ai' }
];

const searchEngineMatrixConfig = {
    brave: { uri: "https://search.brave.com/search", prompt: "Search Brave...", icon: "fa-solid fa-shield-halved", label: "Brave" },
    google: { uri: "https://www.google.com/search", prompt: "Search Google...", icon: "fa-brands fa-google", label: "Google" },
    ddg: { uri: "https://duckduckgo.com/", prompt: "Search DuckDuckGo...", icon: "fa-solid fa-magnifying-glass", label: "DuckDuckGo" },
    github: { uri: "https://github.com/search", prompt: "Search Repositories...", icon: "fa-brands fa-github", label: "GitHub" }
};

let clientShortcutPool = (JSON.parse(localStorage.getItem('ws_shortcuts_v2')) || defaultShortcutConfiguration).filter(item => item.category !== 'recent');
let clientPlannerNotesPool = JSON.parse(localStorage.getItem('ws_planner_notes')) || {};
let currentSearchEngineKey = null;

function hexToRgb(hexColor) {
    const normalized = hexColor.replace('#', '');
    const expanded = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
    const integer = parseInt(expanded, 16);
    return { r: (integer >> 16) & 255, g: (integer >> 8) & 255, b: integer & 255 };
}

function rgbToHex(red, green, blue) {
    return `#${[red, green, blue].map((comp) => comp.toString(16).padStart(2, '0')).join('')}`;
}

function buildAccentGradient(accentSolidValue) {
    const { r, g, b } = hexToRgb(accentSolidValue);
    const darkened = rgbToHex(Math.max(0, Math.round(r * 0.72)), Math.max(0, Math.round(g * 0.72)), Math.max(0, Math.round(b * 0.72)));
    return `linear-gradient(135deg, ${accentSolidValue} 0%, ${darkened} 100%)`;
}

let isApplyingAccentTheme = false;

function applyStoredTheme(accentSolidValue, processedGradientSyntaxString, persist = true) {
    if (isApplyingAccentTheme) return;
    isApplyingAccentTheme = true;
    try {
        cachedAccentHexColor = accentSolidValue;
        const { r, g, b } = hexToRgb(accentSolidValue);
        document.documentElement.style.setProperty('--accent', accentSolidValue);
        document.documentElement.style.setProperty('--accent-color', accentSolidValue);
        document.documentElement.style.setProperty('--accent-gradient', processedGradientSyntaxString);
        document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
        document.documentElement.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.15)`);
        document.documentElement.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.35)`);

        const colorPicker = document.getElementById('theme-color-picker');
        if (colorPicker && colorPicker.value.toLowerCase() !== accentSolidValue.toLowerCase()) {
            colorPicker.value = accentSolidValue;
        }

        if (persist) {
            localStorage.setItem('ws_theme_accent', accentSolidValue);
            localStorage.setItem('ws_theme_gradient', processedGradientSyntaxString);
        }
    } finally {
        isApplyingAccentTheme = false;
    }
}

function initializeThemeFromStorage() {
    const storedAccent = localStorage.getItem('ws_theme_accent') || "#149FE8";
    const storedGradient = localStorage.getItem('ws_theme_gradient') || "linear-gradient(135deg, #149FE8 0%, #0A6FA8 100%)";
    applyStoredTheme(storedAccent, storedGradient, false);

    const activeMode = localStorage.getItem('ws_theme_mode') || 'dark';
    document.body.setAttribute('data-theme', activeMode);
    updateThemeToggleIcon(activeMode);
}

function toggleLightDarkTheme() {
    const currentMode = document.body.getAttribute('data-theme');
    const nextMode = currentMode === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', nextMode);
    localStorage.setItem('ws_theme_mode', nextMode);
    updateThemeToggleIcon(nextMode);
}

function updateThemeToggleIcon(mode) {
    const iconNode = document.getElementById('theme-toggle-node').querySelector('i');
    if (mode === 'light') {
        iconNode.className = 'fa-solid fa-sun';
    } else {
        iconNode.className = 'fa-solid fa-moon';
    }
}

function populateSearchEngineSelector() {
    const dropdownElement = document.getElementById('engine-custom-dropdown');
    dropdownElement.innerHTML = '';
    Object.entries(searchEngineMatrixConfig).forEach(([engineKey, engineConfig]) => {
        const rowOptionNode = document.createElement('div');
        rowOptionNode.className = 'engine-option' + (currentSearchEngineKey === engineKey ? ' active' : '');
        rowOptionNode.dataset.engine = engineKey;
        rowOptionNode.innerHTML = `<i class="${engineConfig.icon}"></i><span>${engineConfig.label}</span>`;
        rowOptionNode.addEventListener('click', (ev) => {
            ev.stopPropagation();
            shiftSearchEngine(engineKey);
            closeEngineDropdown();
        });
        dropdownElement.appendChild(rowOptionNode);
    });
}

function toggleEngineDropdown(ev) {
    ev.stopPropagation();
    const activeMenuElement = document.getElementById('engine-custom-dropdown');
    activeMenuElement.style.display = activeMenuElement.style.display === 'flex' ? 'none' : 'flex';
}

function closeEngineDropdown() {
    document.getElementById('engine-custom-dropdown').style.display = 'none';
}

// --- Core Clock & Chronological Subsystem ---
function executeChronographCycle() {
    const runtimeObject = new Date();
    let hours = runtimeObject.getHours();
    let minutes = runtimeObject.getMinutes();
    let seconds = runtimeObject.getSeconds();

    let ampm = '';
    if (clockSettings.use12Hour) {
        ampm = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
    }

    const formattedHours = (hours < 10 && !clockSettings.use12Hour) ? '0' + hours : hours;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;

    let timeString = `${formattedHours}:${formattedMinutes}`;
    if (clockSettings.showSeconds) {
        timeString += `:${formattedSeconds}`;
    }
    timeString += ampm;

    const clockEl = document.getElementById('clock-node');
    if (clockEl) clockEl.textContent = timeString;

    const dateEl = document.getElementById('date-node');
    if (dateEl) {
        dateEl.textContent = runtimeObject.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    const rawHours = runtimeObject.getHours();
    let contextualGreetingText = "System runtime active";
    if (rawHours < 12) contextualGreetingText = "Good morning..";
    else if (rawHours < 18) contextualGreetingText = "Good afternoon..";
    else contextualGreetingText = "Good evening..";

    const greetingEl = document.getElementById('greeting-node');
    if (greetingEl) greetingEl.textContent = contextualGreetingText;
}
setInterval(executeChronographCycle, 1000);
executeChronographCycle();

// --- Search Router Mechanics ---
function shiftSearchEngine(chosenEngineKey) {
    if (!chosenEngineKey) return clearSearchEngineSelection();
    const routerTargetConfig = searchEngineMatrixConfig[chosenEngineKey];
    if (!routerTargetConfig) return;

    currentSearchEngineKey = chosenEngineKey;
    localStorage.setItem('ws_search_engine', chosenEngineKey);

    document.getElementById('search-router-form').action = routerTargetConfig.uri;
    document.getElementById('search-input-field').placeholder = routerTargetConfig.prompt;
    document.getElementById('engine-icon-element').innerHTML = `<i class="${routerTargetConfig.icon}"></i>`;
    document.querySelectorAll('.engine-option').forEach(opt => {
        if (opt.dataset.engine === chosenEngineKey) opt.classList.add('active');
        else opt.classList.remove('active');
    });
    updateSearchInteractability();
}

function clearSearchEngineSelection() {
    currentSearchEngineKey = null;
    localStorage.removeItem('ws_search_engine');
    document.getElementById('search-router-form').action = '';
    document.getElementById('search-input-field').placeholder = 'Choose search engine...';
    document.getElementById('engine-icon-element').innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>`;
    updateSearchInteractability();
}

function updateSearchInteractability() {
    const actionBtn = document.querySelector('.search-action-btn');
    const inputField = document.getElementById('search-input-field');
    if (!currentSearchEngineKey) {
        actionBtn.disabled = true;
        inputField.placeholder = 'Choose search engine...';
    } else {
        actionBtn.disabled = false;
    }
}

// --- URL Icon Detection Handler ---
function handleUrlIconDetection(value) {
    const previewContainer = document.getElementById('form-icon-preview');
    let cleanDomain = value.trim().replace(/^(https?:\/\/)?(www\.)?/i, "").split('/')[0];

    if (cleanDomain.length > 2 && cleanDomain.includes('.')) {
        previewContainer.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=64&domain=${cleanDomain}" onerror="resetPreviewIcon()">`;
    } else {
        resetPreviewIcon();
    }
}

function resetPreviewIcon() {
    document.getElementById('form-icon-preview').innerHTML = `<i class="fa-solid fa-globe" style="color: var(--text-muted)"></i>`;
}

// --- Category Switching Controller ---
function switchActiveCategoryTab(categoryKey) {
    activeCategoryTab = categoryKey;

    document.querySelectorAll('.nav-pill-button').forEach(btn => btn.classList.remove('active-pill'));
    const targetTab = document.getElementById(`tab-${categoryKey}`);
    if (targetTab) targetTab.classList.add('active-pill');

    const addBtn = document.getElementById('add-shortcut-btn');
    if (addBtn) addBtn.style.display = 'grid';

    clearAndRepopulateShortcutsGrid();
}

// --- Tile Shortcuts Pipeline Subsystem ---
function clearAndRepopulateShortcutsGrid() {
    const rootContainer = document.getElementById('shortcut-grid-root');
    const expansionTriggerButton = rootContainer.querySelector('.tile-add-trigger');
    rootContainer.querySelectorAll('.tile-link').forEach(el => el.remove());

    // Filter active category
    const filteredPool = clientShortcutPool.map((item, originalIndex) => ({ ...item, originalIndex }))
        .filter(item => (item.category || 'social') === activeCategoryTab);

    filteredPool.forEach((shortcutInstance) => {
        const dynamicAnchorNode = document.createElement('a');
        dynamicAnchorNode.href = shortcutInstance.url;
        dynamicAnchorNode.className = 'tile-link';
        dynamicAnchorNode.title = shortcutInstance.title + " (Right-click to edit)";
        dynamicAnchorNode.draggable = true;
        dynamicAnchorNode.dataset.index = shortcutInstance.originalIndex;

        const baseCleanDomain = shortcutInstance.url.replace(/^(https?:\/\/)?(www\.)?/i, "").split('/')[0];
        const vectorFaviconElement = document.createElement('img');
        vectorFaviconElement.src = `https://www.google.com/s2/favicons?sz=64&domain=${baseCleanDomain}`;
        vectorFaviconElement.onerror = () => {
            vectorFaviconElement.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E";
        };

        const contextualDeletionWidget = document.createElement('button');
        contextualDeletionWidget.className = 'tile-delete-trigger';
        contextualDeletionWidget.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        contextualDeletionWidget.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            purgeShortcutAssetIndex(shortcutInstance.originalIndex);
        });

        dynamicAnchorNode.appendChild(vectorFaviconElement);
        dynamicAnchorNode.appendChild(contextualDeletionWidget);

        dynamicAnchorNode.addEventListener('dragstart', handleDragStart);
        dynamicAnchorNode.addEventListener('dragover', handleDragOver);
        dynamicAnchorNode.addEventListener('drop', handleDrop);
        dynamicAnchorNode.addEventListener('dragend', handleDragEnd);

        dynamicAnchorNode.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            triggerShortcutInlineEditMode(shortcutInstance.originalIndex);
        });

        rootContainer.insertBefore(dynamicAnchorNode, expansionTriggerButton);
    });
}

let dragSourceElementIndex = null;

function handleDragStart(e) {
    this.classList.add('dragging');
    dragSourceElementIndex = this.dataset.index;
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    const sourceIndex = parseInt(dragSourceElementIndex, 10);
    const targetIndex = parseInt(this.dataset.index, 10);
    if (!isNaN(sourceIndex) && !isNaN(targetIndex) && sourceIndex !== targetIndex) {
        const [movedItem] = clientShortcutPool.splice(sourceIndex, 1);
        clientShortcutPool.splice(targetIndex, 0, movedItem);

        localStorage.setItem('ws_shortcuts_v2', JSON.stringify(clientShortcutPool));
        clearAndRepopulateShortcutsGrid();
    }
    return false;
}

function handleDragEnd() {
    this.classList.remove('dragging');
}

function toggleShortcutForm() {
    editingShortcutTargetIndex = null;
    document.getElementById('shortcut-form-title-text').innerHTML = `<i class="fa-solid fa-link"></i> Connect New Destination Anchor`;
    document.getElementById('form-shortcut-submit-btn').textContent = "Build Link";

    const visualFormContainer = document.getElementById('shortcut-form-panel');
    const targetVisibilityState = visualFormContainer.style.display === 'flex';
    visualFormContainer.style.display = targetVisibilityState ? 'none' : 'flex';
    if (!targetVisibilityState) {
        document.getElementById('form-shortcut-title').value = '';
        document.getElementById('form-shortcut-uri').value = '';
        document.getElementById('form-shortcut-title').focus();
        resetPreviewIcon();
    }
}

function triggerShortcutInlineEditMode(targetIdx) {
    editingShortcutTargetIndex = targetIdx;
    const record = clientShortcutPool[targetIdx];

    document.getElementById('shortcut-form-title-text').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Shortcut properties`;
    document.getElementById('form-shortcut-submit-btn').textContent = "Update Asset";

    document.getElementById('form-shortcut-title').value = record.title;
    document.getElementById('form-shortcut-uri').value = record.url;
    handleUrlIconDetection(record.url);

    const formPanel = document.getElementById('shortcut-form-panel');
    formPanel.style.display = 'flex';
    document.getElementById('form-shortcut-title').focus();
}

function commitShortcutAsset() {
    const targetedLabelInput = document.getElementById('form-shortcut-title');
    const targetedUriInput = document.getElementById('form-shortcut-uri');
    const prospectiveLabel = targetedLabelInput.value.trim();
    let prospectiveUri = targetedUriInput.value.trim();

    if (!prospectiveLabel || !prospectiveUri) return;
    if (!/^https?:\/\//i.test(prospectiveUri)) prospectiveUri = 'https://' + prospectiveUri;

    if (editingShortcutTargetIndex !== null) {
        clientShortcutPool[editingShortcutTargetIndex] = {
            title: prospectiveLabel,
            url: prospectiveUri,
            category: clientShortcutPool[editingShortcutTargetIndex].category || activeCategoryTab
        };
    } else {
        clientShortcutPool.push({ title: prospectiveLabel, url: prospectiveUri, category: activeCategoryTab });
    }

    localStorage.setItem('ws_shortcuts_v2', JSON.stringify(clientShortcutPool));

    targetedLabelInput.value = '';
    targetedUriInput.value = '';

    document.getElementById('shortcut-form-panel').style.display = 'none';
    editingShortcutTargetIndex = null;

    clearAndRepopulateShortcutsGrid();
}

function purgeShortcutAssetIndex(targetArrayPosition) {
    clientShortcutPool.splice(targetArrayPosition, 1);
    localStorage.setItem('ws_shortcuts_v2', JSON.stringify(clientShortcutPool));
    clearAndRepopulateShortcutsGrid();
}

// --- Structural Planner System Engine ---
function generateStructuredCalendarGrid() {
    const renderingYearContext = internalClockDatetime.getFullYear();
    const renderingMonthContext = internalClockDatetime.getMonth();
    const accurateCurrentTimeObject = new Date();

    const analyticalStringNamesArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('calendar-header-label').textContent = `${analyticalStringNamesArray[renderingMonthContext]} ${renderingYearContext}`;

    const renderGridContainer = document.getElementById('calendar-render-grid');
    renderGridContainer.innerHTML = '';

    const alphaWeekdaySymbolicIdentifiers = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    alphaWeekdaySymbolicIdentifiers.forEach(char => {
        const labelCell = document.createElement('div');
        labelCell.className = 'mesh-hdr-label';
        labelCell.textContent = char;
        renderGridContainer.appendChild(labelCell);
    });

    const startingPosition = new Date(renderingYearContext, renderingMonthContext, 1).getDay();
    const daysCount = new Date(renderingYearContext, renderingMonthContext + 1, 0).getDate();

    for (let pad = 0; pad < startingPosition; pad++) {
        renderGridContainer.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysCount; day++) {
        const cell = document.createElement('div');
        cell.className = 'mesh-cell';
        cell.textContent = day;
        const dateKey = `${renderingYearContext}-${String(renderingMonthContext + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (renderingYearContext === accurateCurrentTimeObject.getFullYear() && renderingMonthContext === accurateCurrentTimeObject.getMonth() && day === accurateCurrentTimeObject.getDate()) {
            cell.classList.add('active-today');
        }
        if (clientPlannerNotesPool[dateKey]) {
            cell.classList.add('has-note');
        }

        cell.addEventListener('click', () => launchSchedulerContextPanel(dateKey, cell));
        renderGridContainer.appendChild(cell);
    }
}

function shiftCalendarMonth(dir) {
    internalClockDatetime.setMonth(internalClockDatetime.getMonth() + dir);
    closeSchedulerPanel();
    generateStructuredCalendarGrid();
}

function launchSchedulerContextPanel(dateKey, sourceCell) {
    document.querySelectorAll('.mesh-cell').forEach(c => c.classList.remove('targeted'));
    sourceCell.classList.add('targeted');

    activeTargetCalendarDateKey = dateKey;
    const panel = document.getElementById('calendar-scheduler-panel');
    const input = document.getElementById('form-note-payload');

    document.getElementById('scheduler-panel-title').textContent = `Agenda Node: ${dateKey}`;
    input.value = clientPlannerNotesPool[dateKey] || '';
    panel.style.display = 'flex';
    input.focus();
}

function commitCalendarNote() {
    if (!activeTargetCalendarDateKey) return;
    const value = document.getElementById('form-note-payload').value.trim();

    if (value === '') {
        delete clientPlannerNotesPool[activeTargetCalendarDateKey];
    } else {
        clientPlannerNotesPool[activeTargetCalendarDateKey] = value;
    }

    localStorage.setItem('ws_planner_notes', JSON.stringify(clientPlannerNotesPool));
    generateStructuredCalendarGrid();
    closeSchedulerPanel();
}

function closeSchedulerPanel() {
    document.getElementById('calendar-scheduler-panel').style.display = 'none';
    document.querySelectorAll('.mesh-cell').forEach(c => c.classList.remove('targeted'));
    activeTargetCalendarDateKey = null;
}

// --- Customization Management Subsystem ---
function initializeCustomizationSettings() {
    const savedClock = localStorage.getItem('ws_clock_settings');
    if (savedClock) {
        try {
            clockSettings = { ...clockSettings, ...JSON.parse(savedClock) };
        } catch (e) {
            console.error('Failed to parse ws_clock_settings', e);
        }
    }

    const savedLayout = localStorage.getItem('ws_layout_settings');
    if (savedLayout) {
        try {
            layoutSettings = { ...layoutSettings, ...JSON.parse(savedLayout) };
        } catch (e) {
            console.error('Failed to parse ws_layout_settings', e);
        }
    }

    const savedEffects = localStorage.getItem('ws_effects_settings');
    if (savedEffects) {
        try {
            effectsSettings = { ...effectsSettings, ...JSON.parse(savedEffects) };
        } catch (e) {
            console.error('Failed to parse ws_effects_settings', e);
        }
    }

    const savedMinimalDark = localStorage.getItem('ws_minimal_dark_settings');
    if (savedMinimalDark) {
        try {
            minimalDarkSettings = { ...minimalDarkSettings, ...JSON.parse(savedMinimalDark) };
        } catch (e) {
            console.error('Failed to parse ws_minimal_dark_settings', e);
        }
    }

    applyClockSettings();
    applyLayoutSettings();
    applyEffectsSettings();
    applyMinimalDarkSettings();
    syncCustomizationUI();
}

function syncCustomizationUI() {
    // Clock UI elements
    const clockShowEl = document.getElementById('setting-clock-show');
    if (clockShowEl) clockShowEl.checked = clockSettings.showClock;

    const dateShowEl = document.getElementById('setting-date-show');
    if (dateShowEl) dateShowEl.checked = clockSettings.showDate;

    const clockSecEl = document.getElementById('setting-clock-seconds');
    if (clockSecEl) clockSecEl.checked = clockSettings.showSeconds;

    const clockSizeEl = document.getElementById('setting-clock-size');
    if (clockSizeEl) clockSizeEl.value = clockSettings.clockSize;

    const clockSizeBadge = document.getElementById('badge-clock-size');
    if (clockSizeBadge) clockSizeBadge.textContent = `${clockSettings.clockSize}rem`;

    const fmt12Btn = document.getElementById('fmt-12h-btn');
    const fmt24Btn = document.getElementById('fmt-24h-btn');
    if (fmt12Btn && fmt24Btn) {
        if (clockSettings.use12Hour) {
            fmt12Btn.classList.add('active');
            fmt24Btn.classList.remove('active');
        } else {
            fmt24Btn.classList.add('active');
            fmt12Btn.classList.remove('active');
        }
    }

    // Layout UI elements
    const widthEl = document.getElementById('setting-layout-width');
    if (widthEl) widthEl.value = layoutSettings.contentWidth;
    const widthBadge = document.getElementById('badge-layout-width');
    if (widthBadge) widthBadge.textContent = `${layoutSettings.contentWidth}px`;

    const sizeEl = document.getElementById('setting-layout-shortcut-size');
    if (sizeEl) sizeEl.value = layoutSettings.shortcutSize;
    const sizeBadge = document.getElementById('badge-layout-shortcut-size');
    if (sizeBadge) sizeBadge.textContent = `${layoutSettings.shortcutSize}px`;

    const spacingEl = document.getElementById('setting-layout-spacing');
    if (spacingEl) spacingEl.value = layoutSettings.shortcutSpacing;
    const spacingBadge = document.getElementById('badge-layout-spacing');
    if (spacingBadge) spacingBadge.textContent = `${layoutSettings.shortcutSpacing}px`;

    const radiusEl = document.getElementById('setting-layout-radius');
    if (radiusEl) radiusEl.value = layoutSettings.borderRadius;
    const radiusBadge = document.getElementById('badge-layout-radius');
    if (radiusBadge) radiusBadge.textContent = `${layoutSettings.borderRadius}px`;

    const scRadiusEl = document.getElementById('setting-layout-shortcut-radius');
    if (scRadiusEl) scRadiusEl.value = layoutSettings.shortcutRadius !== undefined ? layoutSettings.shortcutRadius : 14;
    const scRadiusBadge = document.getElementById('badge-layout-shortcut-radius');
    if (scRadiusBadge) scRadiusBadge.textContent = `${layoutSettings.shortcutRadius !== undefined ? layoutSettings.shortcutRadius : 14}px`;

    const posBtns = ['center', 'top', 'left', 'right'];
    posBtns.forEach(p => {
        const btn = document.getElementById(`pos-${p}-btn`);
        if (btn) {
            if (layoutSettings.position === p) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    // Glass / UI Effects UI elements
    const glassEnableEl = document.getElementById('setting-glass-enable');
    if (glassEnableEl) glassEnableEl.checked = effectsSettings.glassEnabled;

    const blurEl = document.getElementById('setting-glass-blur');
    if (blurEl) blurEl.value = effectsSettings.blurIntensity;
    const blurBadge = document.getElementById('badge-glass-blur');
    if (blurBadge) blurBadge.textContent = `${effectsSettings.blurIntensity}px`;

    const transpEl = document.getElementById('setting-glass-transparency');
    if (transpEl) transpEl.value = effectsSettings.transparency;
    const transpBadge = document.getElementById('badge-glass-transparency');
    if (transpBadge) transpBadge.textContent = `${effectsSettings.transparency}%`;

    const bOpacityEl = document.getElementById('setting-glass-border-opacity');
    if (bOpacityEl) bOpacityEl.value = effectsSettings.borderOpacity;
    const bOpacityBadge = document.getElementById('badge-glass-border-opacity');
    if (bOpacityBadge) bOpacityBadge.textContent = `${effectsSettings.borderOpacity}%`;

    const shadowEl = document.getElementById('setting-glass-shadow');
    if (shadowEl) shadowEl.value = effectsSettings.shadowIntensity;
    const shadowBadge = document.getElementById('badge-glass-shadow');
    if (shadowBadge) shadowBadge.textContent = `${effectsSettings.shadowIntensity}%`;

    const glowEl = document.getElementById('setting-glass-glow');
    if (glowEl) glowEl.value = effectsSettings.glowIntensity;
    const glowBadge = document.getElementById('badge-glass-glow');
    if (glowBadge) glowBadge.textContent = `${effectsSettings.glowIntensity}%`;

    const animEnableEl = document.getElementById('setting-anim-enable');
    if (animEnableEl) animEnableEl.checked = effectsSettings.animationsEnabled;

    const animSpeedBtns = ['slow', 'normal', 'fast'];
    animSpeedBtns.forEach(sp => {
        const btn = document.getElementById(`anim-${sp}-btn`);
        if (btn) {
            if (effectsSettings.animationSpeed === sp) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    const hoverEnableEl = document.getElementById('setting-hover-enable');
    if (hoverEnableEl) hoverEnableEl.checked = effectsSettings.hoverEnabled;

    const effRadiusEl = document.getElementById('setting-effects-radius');
    if (effRadiusEl) effRadiusEl.value = effectsSettings.borderRadius;
    const effRadiusBadge = document.getElementById('badge-effects-radius');
    if (effRadiusBadge) effRadiusBadge.textContent = `${effectsSettings.borderRadius}px`;

    // Minimal Dark UI elements
    const bgBrightEl = document.getElementById('setting-theme-bg-brightness');
    if (bgBrightEl) bgBrightEl.value = minimalDarkSettings.bgBrightness;
    const bgBrightBadge = document.getElementById('badge-theme-bg-brightness');
    if (bgBrightBadge) bgBrightBadge.textContent = `${minimalDarkSettings.bgBrightness}%`;

    const cardBrightEl = document.getElementById('setting-theme-card-brightness');
    if (cardBrightEl) cardBrightEl.value = minimalDarkSettings.cardBrightness;
    const cardBrightBadge = document.getElementById('badge-theme-card-brightness');
    if (cardBrightBadge) cardBrightBadge.textContent = `${minimalDarkSettings.cardBrightness}%`;

    const borderIntEl = document.getElementById('setting-theme-border-intensity');
    if (borderIntEl) borderIntEl.value = minimalDarkSettings.borderIntensity;
    const borderIntBadge = document.getElementById('badge-theme-border-intensity');
    if (borderIntBadge) borderIntBadge.textContent = `${minimalDarkSettings.borderIntensity}%`;

    const shadowIntEl = document.getElementById('setting-theme-shadow-intensity');
    if (shadowIntEl) shadowIntEl.value = minimalDarkSettings.shadowIntensity;
    const shadowIntBadge = document.getElementById('badge-theme-shadow-intensity');
    if (shadowIntBadge) shadowIntBadge.textContent = `${minimalDarkSettings.shadowIntensity}%`;

    // Theme tab radius slider reads from layoutSettings (single source of truth)
    const themeRadEl = document.getElementById('setting-theme-radius');
    if (themeRadEl) themeRadEl.value = layoutSettings.borderRadius;
    const themeRadBadge = document.getElementById('badge-theme-radius');
    if (themeRadBadge) themeRadBadge.textContent = `${layoutSettings.borderRadius}px`;

    const themeAnimEl = document.getElementById('setting-theme-anim');
    if (themeAnimEl) themeAnimEl.checked = minimalDarkSettings.animationsEnabled;
}

function updateClockSetting(key, value) {
    clockSettings[key] = value;
    localStorage.setItem('ws_clock_settings', JSON.stringify(clockSettings));
    applyClockSettings();
}

function updateLayoutSetting(key, value) {
    layoutSettings[key] = value;
    localStorage.setItem('ws_layout_settings', JSON.stringify(layoutSettings));
    applyLayoutSettings();
}

function applyClockSettings() {
    const clockNode = document.getElementById('clock-node');
    const dateNode = document.getElementById('date-node');

    if (clockNode) {
        clockNode.style.display = clockSettings.showClock ? 'block' : 'none';
    }
    if (dateNode) {
        dateNode.style.display = clockSettings.showDate ? 'block' : 'none';
    }

    document.documentElement.style.setProperty('--clock-font-size', `${clockSettings.clockSize}rem`);
    executeChronographCycle();
    syncCustomizationUI();
}

function applyLayoutSettings() {
    document.documentElement.style.setProperty('--content-max-width', `${layoutSettings.contentWidth}px`);
    document.documentElement.style.setProperty('--shortcut-tile-size', `${layoutSettings.shortcutSize}px`);
    document.documentElement.style.setProperty('--shortcut-gap', `${layoutSettings.shortcutSpacing}px`);
    document.documentElement.style.setProperty('--card-border-radius', `${layoutSettings.borderRadius}px`);
    document.documentElement.style.setProperty('--shortcut-border-radius', `${layoutSettings.shortcutRadius !== undefined ? layoutSettings.shortcutRadius : 14}px`);

    const container = document.querySelector('.center-dashboard-container');
    if (container) {
        container.classList.remove('pos-center', 'pos-top', 'pos-left', 'pos-right');
        if (layoutSettings.position !== 'center') {
            container.classList.add(`pos-${layoutSettings.position}`);
        }
    }
    syncCustomizationUI();
}

function updateEffectsSetting(key, value) {
    effectsSettings[key] = value;
    localStorage.setItem('ws_effects_settings', JSON.stringify(effectsSettings));
    applyEffectsSettings();
}

function applyEffectsSettings() {
    // Glass Enable / Disable
    if (!effectsSettings.glassEnabled) {
        document.body.classList.add('glass-disabled');
    } else {
        document.body.classList.remove('glass-disabled');
    }

    // Blur Intensity (0px to 30px)
    document.documentElement.style.setProperty('--blur-strength', `${effectsSettings.blurIntensity}px`);

    // Background Transparency (0% to 100%)
    const bgAlpha = ((100 - effectsSettings.transparency) / 100 * 0.9 + 0.05).toFixed(2);
    document.documentElement.style.setProperty('--glass-bg-alpha', bgAlpha);

    // Border Opacity (0% to 100%)
    const borderAlpha = ((effectsSettings.borderOpacity / 100) * 0.5).toFixed(2);
    document.documentElement.style.setProperty('--glass-border-alpha', borderAlpha);

    // Shadow & Glow Intensity
    document.documentElement.style.setProperty('--shadow-scale', (effectsSettings.shadowIntensity / 100).toFixed(2));
    document.documentElement.style.setProperty('--glow-scale', (effectsSettings.glowIntensity / 100).toFixed(2));

    // Animations Enable / Disable
    if (!effectsSettings.animationsEnabled) {
        document.body.classList.add('animations-disabled');
    } else {
        document.body.classList.remove('animations-disabled');
    }

    // Animation Speed
    const speedMap = { slow: 1.8, normal: 1, fast: 0.5 };
    const factor = speedMap[effectsSettings.animationSpeed] || 1;
    document.documentElement.style.setProperty('--anim-duration-factor', factor);

    // Hover Effects Enable / Disable
    if (!effectsSettings.hoverEnabled) {
        document.body.classList.add('hover-disabled');
    } else {
        document.body.classList.remove('hover-disabled');
    }

    // Border Radius
    document.documentElement.style.setProperty('--card-border-radius', `${effectsSettings.borderRadius}px`);
    layoutSettings.borderRadius = effectsSettings.borderRadius;

    syncCustomizationUI();
}

function resetEffectsToDefault() {
    effectsSettings = {
        glassEnabled: true,
        blurIntensity: 26,
        transparency: 45,
        borderOpacity: 14,
        shadowIntensity: 100,
        glowIntensity: 100,
        animationsEnabled: true,
        animationSpeed: 'normal',
        hoverEnabled: true,
        borderRadius: 14
    };
    localStorage.removeItem('ws_effects_settings');
    applyEffectsSettings();
}

function updateMinimalDarkSetting(key, value) {
    minimalDarkSettings[key] = value;
    localStorage.setItem('ws_minimal_dark_settings', JSON.stringify(minimalDarkSettings));
    applyMinimalDarkSettings();
}

function applyMinimalDarkSettings() {
    document.documentElement.style.setProperty('--bg-brightness', (minimalDarkSettings.bgBrightness / 100).toFixed(2));
    document.documentElement.style.setProperty('--card-brightness', (minimalDarkSettings.cardBrightness / 100).toFixed(2));
    document.documentElement.style.setProperty('--border-intensity', (minimalDarkSettings.borderIntensity / 100).toFixed(2));
    document.documentElement.style.setProperty('--shadow-intensity', (minimalDarkSettings.shadowIntensity / 100).toFixed(2));
    // Border radius is owned by layoutSettings — do NOT override here

    if (!minimalDarkSettings.animationsEnabled) {
        document.body.classList.add('animations-disabled');
    } else {
        document.body.classList.remove('animations-disabled');
    }

    syncCustomizationUI();
}

function resetMinimalDarkToDefault() {
    minimalDarkSettings = {
        bgBrightness: 100,
        cardBrightness: 100,
        borderIntensity: 100,
        shadowIntensity: 100,
        animationsEnabled: true
        // borderRadius intentionally excluded — it persists via layoutSettings
    };
    localStorage.removeItem('ws_minimal_dark_settings');
    applyMinimalDarkSettings();
    setThemeFromPicker('#149FE8');
}

function toggleCalendarOrganizer() {
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
    const organizer = document.querySelector('.right-bottom-organizer-container');
    if (organizer) {
        const isVisible = organizer.style.display === 'block';
        organizer.style.display = isVisible ? 'none' : 'block';
    }
}

function toggleCustomizationPanel() {
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
    const panel = document.getElementById('customization-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    }
}

function switchCustomizationTab(tabKey) {
    document.querySelectorAll('.custom-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.custom-tab-content').forEach(content => content.classList.remove('active'));

    const btn = document.getElementById(`tab-btn-${tabKey}`);
    const content = document.getElementById(`tab-content-${tabKey}`);

    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
}

function setGlobalTheme(accentSolidValue, processedGradientSyntaxString) {
    applyStoredTheme(accentSolidValue, processedGradientSyntaxString, true);
}

function setThemeFromPicker(selectedColor) {
    const accentGradient = buildAccentGradient(selectedColor);
    setGlobalTheme(selectedColor, accentGradient);
}

document.addEventListener('click', (e) => {
    const dropContainer = document.getElementById('customization-panel');
    const trigger = document.querySelector('.theme-trigger');
    if (dropContainer && dropContainer.style.display === 'flex' && !dropContainer.contains(e.target) && trigger && !trigger.contains(e.target)) {
        dropContainer.style.display = 'none';
    }
    const engineContainer = document.getElementById('engine-custom-dropdown');
    if (engineContainer && engineContainer.style.display === 'flex' && !engineContainer.contains(e.target) && !document.querySelector('.engine-router').contains(e.target)) {
        closeEngineDropdown();
    }
    const organizer = document.querySelector('.right-bottom-organizer-container');
    const calTrigger = document.getElementById('calendar-toggle-node');
    if (organizer && organizer.style.display === 'block' && !organizer.contains(e.target) && calTrigger && !calTrigger.contains(e.target)) {
        organizer.style.display = 'none';
    }
});

document.getElementById('search-router-form').addEventListener('submit', (ev) => {
    const query = document.getElementById('search-input-field').value.trim();
    if (!query) {
        ev.preventDefault();
        return false;
    }

    if (!currentSearchEngineKey) {
        ev.preventDefault();
        document.getElementById('engine-custom-dropdown').style.display = 'flex';
        return false;
    }
});

// --- Bottom-Left Motion Mesh Subsystem ---
const backgroundCanvasElement = document.getElementById('bg-canvas');
const renderingContext2D = backgroundCanvasElement.getContext('2d');

let computedWidthLayoutPixels = backgroundCanvasElement.width = window.innerWidth;
let computedHeightLayoutPixels = backgroundCanvasElement.height = window.innerHeight;

const networkNodePointCollection = [];
const absoluteMaximumNodesCount = 40;
const relativeConnectionProximityLimit = 110;
let systemicMouseCoordinatesTracker = { coordinateX: null, coordinateY: null, dynamicEngagementFlag: false };

class StructuralNeuralNode {
    constructor() {
        this.coordinateX = Math.random() * computedWidthLayoutPixels;
        this.coordinateY = Math.random() * computedHeightLayoutPixels;
        this.trajectoryVectorX = (Math.random() - 0.5) * 1.0;
        this.trajectoryVectorY = (Math.random() - 0.5) * 1.0;
        this.renderingRadiusPixels = Math.random() * 1.5 + 1;
    }

    processMotionStepUpdates() {
        this.coordinateX += this.trajectoryVectorX;
        this.coordinateY += this.trajectoryVectorY;

        if (this.coordinateX < 0 || this.coordinateX > computedWidthLayoutPixels) this.trajectoryVectorX *= -1;
        if (this.coordinateY < 0 || this.coordinateY > computedHeightLayoutPixels) this.trajectoryVectorY *= -1;

        if (systemicMouseCoordinatesTracker.dynamicEngagementFlag) {
            const dx = systemicMouseCoordinatesTracker.coordinateX - this.coordinateX;
            const dy = systemicMouseCoordinatesTracker.coordinateY - this.coordinateY;
            const dist = Math.hypot(dx, dy);
            if (dist < 150) {
                this.coordinateX += dx * 0.025;
                this.coordinateY += dy * 0.025;
            }
        }
    }

    renderGraphicsFrame() {
        renderingContext2D.beginPath();
        renderingContext2D.arc(this.coordinateX, this.coordinateY, this.renderingRadiusPixels, 0, Math.PI * 2);
        renderingContext2D.fillStyle = cachedAccentHexColor + '25';
        renderingContext2D.fill();
    }
}

for (let i = 0; i < absoluteMaximumNodesCount; i++) {
    networkNodePointCollection.push(new StructuralNeuralNode());
}

window.addEventListener('mousemove', (e) => {
    systemicMouseCoordinatesTracker.coordinateX = e.clientX;
    systemicMouseCoordinatesTracker.coordinateY = e.clientY;
    systemicMouseCoordinatesTracker.dynamicEngagementFlag = true;
});

window.addEventListener('mouseleave', () => { systemicMouseCoordinatesTracker.dynamicEngagementFlag = false; });
window.addEventListener('resize', () => {
    computedWidthLayoutPixels = backgroundCanvasElement.width = window.innerWidth;
    computedHeightLayoutPixels = backgroundCanvasElement.height = window.innerHeight;
});

function executeVisualAnimationLoop() {
    renderingContext2D.clearRect(0, 0, computedWidthLayoutPixels, computedHeightLayoutPixels);
    for (let i = 0; i < networkNodePointCollection.length; i++) {
        networkNodePointCollection[i].processMotionStepUpdates();
        networkNodePointCollection[i].renderGraphicsFrame();

        for (let j = i + 1; j < networkNodePointCollection.length; j++) {
            const dist = Math.hypot(networkNodePointCollection[i].coordinateX - networkNodePointCollection[j].coordinateX, networkNodePointCollection[i].coordinateY - networkNodePointCollection[j].coordinateY);
            if (dist < relativeConnectionProximityLimit) {
                const alpha = (1 - dist / relativeConnectionProximityLimit) * 0.07;
                renderingContext2D.strokeStyle = cachedAccentHexColor + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                renderingContext2D.lineWidth = 0.8;
                renderingContext2D.beginPath();
                renderingContext2D.moveTo(networkNodePointCollection[i].coordinateX, networkNodePointCollection[i].coordinateY);
                renderingContext2D.lineTo(networkNodePointCollection[j].coordinateX, networkNodePointCollection[j].coordinateY);
                renderingContext2D.stroke();
            }
        }
    }
    requestAnimationFrame(executeVisualAnimationLoop);
}

// ═══════════════════════════════════════════════════════════════
// WALLPAPER & GLASSMORPHISM SETTINGS SUBSYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Toggle visibility of Settings Modal / Drawer
 */
function toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (modal.classList.contains('active')) {
        closeSettingsModal();
    } else {
        openSettingsModal();
    }
}

/**
 * Open Settings Modal / Drawer and hide other open overlays
 */
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const backdrop = document.getElementById('settings-backdrop');

    // Close any other open control panels to prevent layout clash
    const customizationPanel = document.getElementById('customization-panel');
    if (customizationPanel) customizationPanel.style.display = 'none';

    const organizer = document.querySelector('.right-bottom-organizer-container');
    if (organizer) organizer.style.display = 'none';

    if (modal) modal.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
}

/**
 * Close Settings Modal / Drawer
 */
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const backdrop = document.getElementById('settings-backdrop');
    if (modal) modal.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
}

/**
 * Apply and persist selected wallpaper (URL or Base64)
 * @param {string} imageUrl - The URL or Base64 data string
 * @param {'preset' | 'upload' | 'url'} source - Origin of the wallpaper
 * @param {string | null} presetId - Identifier if preset
 */
function saveAndApplyWallpaper(imageUrl, source = 'url', presetId = null) {
    if (!imageUrl) return;

    try {
        localStorage.setItem('ws_custom_wallpaper', imageUrl);
        localStorage.setItem('ws_wallpaper_type', source);
        if (presetId) {
            localStorage.setItem('ws_wallpaper_preset_id', presetId);
        } else {
            localStorage.removeItem('ws_wallpaper_preset_id');
        }
    } catch (err) {
        console.error('Storage quota exceeded when saving wallpaper:', err);
        if (err.name === 'QuotaExceededError') {
            alert('Storage limit exceeded. Please choose a smaller image or use a direct URL.');
            return;
        }
    }

    // Apply CSS variables to root and body
    document.documentElement.style.setProperty('--custom-wallpaper', `url("${imageUrl}")`);
    document.documentElement.classList.add('has-custom-wallpaper');
    document.body.classList.add('has-custom-wallpaper');

    // Update active ring on presets
    updatePresetSelectionUI(imageUrl);

    // Update URL input field if source is URL
    const urlInput = document.getElementById('wallpaper-url-input');
    if (urlInput && source === 'url') {
        urlInput.value = imageUrl;
    }
}

/**
 * Revert wallpaper back to original default theme gradient
 */
function resetWallpaperToDefault() {
    localStorage.removeItem('ws_custom_wallpaper');
    localStorage.removeItem('ws_wallpaper_type');
    localStorage.removeItem('ws_wallpaper_preset_id');

    document.documentElement.style.removeProperty('--custom-wallpaper');
    document.documentElement.classList.remove('has-custom-wallpaper');
    document.body.classList.remove('has-custom-wallpaper');

    const urlInput = document.getElementById('wallpaper-url-input');
    if (urlInput) urlInput.value = '';

    updatePresetSelectionUI(null);
}

/**
 * Set wallpaper from preset thumbnail buttons
 */
function applyPresetWallpaper(url, presetId) {
    saveAndApplyWallpaper(url, 'preset', presetId);
}

/**
 * Apply wallpaper entered in the URL input field
 */
function applyWallpaperFromUrl() {
    const urlInput = document.getElementById('wallpaper-url-input');
    if (!urlInput) return;

    const url = urlInput.value.trim();
    if (!url) {
        urlInput.focus();
        return;
    }

    // Preload image to check if it's valid
    const imgTest = new Image();
    imgTest.onload = () => {
        saveAndApplyWallpaper(url, 'url');
    };
    imgTest.onerror = () => {
        alert('Could not load image from the provided URL. Please verify the link.');
    };
    imgTest.src = url;
}

/**
 * Handle local file upload via FileReader (converts to Base64)
 */
function handleWallpaperFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please choose an image file (PNG, JPG, WEBP, etc.).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const rawBase64 = e.target.result;

        // If file is under 1MB, store directly. Otherwise, compress to fit safely within localStorage
        if (file.size < 1024 * 1024) {
            saveAndApplyWallpaper(rawBase64, 'upload');
        } else {
            compressWallpaperImage(rawBase64, 1920, 0.85, (optimizedBase64) => {
                saveAndApplyWallpaper(optimizedBase64, 'upload');
            });
        }
    };
    reader.readAsDataURL(file);

    // Reset input value to allow re-uploading the same file if desired
    event.target.value = '';
}

/**
 * Downscale / compress large image using offscreen canvas to prevent localStorage quota errors
 */
function compressWallpaperImage(dataUrl, maxDimension, quality, callback) {
    const img = new Image();
    img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        try {
            const compressed = canvas.toDataURL('image/jpeg', quality);
            callback(compressed);
        } catch (e) {
            callback(dataUrl);
        }
    };
    img.onerror = () => callback(dataUrl);
    img.src = dataUrl;
}

/**
 * Update UI highlight indicator on preset wallpaper cards
 */
function updatePresetSelectionUI(currentUrl) {
    const presetCards = document.querySelectorAll('.wallpaper-preset-card');
    presetCards.forEach(card => {
        const cardUrl = card.getAttribute('onclick');
        if (currentUrl && cardUrl && cardUrl.includes(currentUrl)) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

/**
 * Live preview and persist Backdrop Blur adjustment (0px - 40px)
 */
function handleBlurSliderChange(val) {
    const blurPx = parseInt(val, 10);
    document.documentElement.style.setProperty('--card-blur', `${blurPx}px`);

    const badge = document.getElementById('badge-card-blur');
    if (badge) badge.textContent = `${blurPx}px`;

    localStorage.setItem('ws_card_blur', blurPx);
}

/**
 * Live preview and persist Card Opacity adjustment (10% - 100%)
 */
function handleOpacitySliderChange(val) {
    const opacityPct = parseInt(val, 10);
    const alpha = (opacityPct / 100).toFixed(2);
    document.documentElement.style.setProperty('--card-opacity', alpha);

    const badge = document.getElementById('badge-card-opacity');
    if (badge) badge.textContent = `${opacityPct}%`;

    localStorage.setItem('ws_card_opacity', opacityPct);
}

/**
 * Initialize wallpaper & glassmorphism settings from localStorage
 */
function initializeWallpaperAndGlassSettings() {
    // 1. Restore Wallpaper
    const savedWallpaper = localStorage.getItem('ws_custom_wallpaper');
    const savedType = localStorage.getItem('ws_wallpaper_type');

    if (savedWallpaper) {
        document.documentElement.style.setProperty('--custom-wallpaper', `url("${savedWallpaper}")`);
        document.documentElement.classList.add('has-custom-wallpaper');
        document.body.classList.add('has-custom-wallpaper');

        updatePresetSelectionUI(savedWallpaper);

        const urlInput = document.getElementById('wallpaper-url-input');
        if (urlInput && savedType === 'url') {
            urlInput.value = savedWallpaper;
        }
    }

    // 2. Restore Blur (default 16px)
    const savedBlur = localStorage.getItem('ws_card_blur');
    const currentBlur = savedBlur !== null ? parseInt(savedBlur, 10) : 16;
    document.documentElement.style.setProperty('--card-blur', `${currentBlur}px`);
    const blurSlider = document.getElementById('setting-card-blur');
    if (blurSlider) blurSlider.value = currentBlur;
    const blurBadge = document.getElementById('badge-card-blur');
    if (blurBadge) blurBadge.textContent = `${currentBlur}px`;

    // 3. Restore Opacity (default 72%)
    const savedOpacity = localStorage.getItem('ws_card_opacity');
    const currentOpacity = savedOpacity !== null ? parseInt(savedOpacity, 10) : 72;
    document.documentElement.style.setProperty('--card-opacity', (currentOpacity / 100).toFixed(2));
    const opacitySlider = document.getElementById('setting-card-opacity');
    if (opacitySlider) opacitySlider.value = currentOpacity;
    const opacityBadge = document.getElementById('badge-card-opacity');
    if (opacityBadge) opacityBadge.textContent = `${currentOpacity}%`;

    // 4. Setup Drag and Drop on dropzone
    const dropzone = document.getElementById('wallpaper-dropzone');
    if (dropzone) {
        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('drag-active');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer && e.dataTransfer.files;
            if (files && files.length > 0) {
                handleWallpaperFileUpload({ target: { files: files, value: '' } });
            }
        });
    }

    // 5. Setup Enter key for URL input
    const urlInput = document.getElementById('wallpaper-url-input');
    if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyWallpaperFromUrl();
            }
        });
    }

    // 6. Escape key closes settings drawer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSettingsModal();
        }
    });
}

// Global System Bootstrap
initializeThemeFromStorage();
initializeCustomizationSettings();
initializeWallpaperAndGlassSettings();
populateSearchEngineSelector();
const storedEngine = localStorage.getItem('ws_search_engine');
if (storedEngine && searchEngineMatrixConfig[storedEngine]) {
    shiftSearchEngine(storedEngine);
} else {
    shiftSearchEngine('google');
}
switchActiveCategoryTab('social');
generateStructuredCalendarGrid();
executeVisualAnimationLoop();