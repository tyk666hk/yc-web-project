(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const el = {
        hours: $("hours"),
        minutes: $("minutes"),
        seconds: $("seconds"),
        suffix: $("suffix"),
        date: $("date"),
        zone: $("zone"),
        colons: document.querySelectorAll(".clock__colon"),
        formatBtn: $("formatBtn"),
        themeBtn: $("themeBtn")
    };

    /* ---------- 安全的 localStorage（file:// 或私密模式可能拋錯） ---------- */
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch { } }
    };

    const LS_THEME = "clock:theme";
    const LS_HOUR12 = "clock:hour12";

    const state = {
        hour12: store.get(LS_HOUR12) === "true",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"
    };

    /* ---------- 工具函式 ---------- */
    const pad2 = (n) => (n < 10 ? "0" + n : "" + n);

    const dateFmt = new Intl.DateTimeFormat("zh-Hant", {
        year: "numeric", month: "long", day: "numeric", weekday: "long"
    });

    function utcOffset(date) {
        const minutes = -date.getTimezoneOffset();       // 東半球為正
        const sign = minutes >= 0 ? "+" : "−";
        const abs = Math.abs(minutes);
        return "UTC" + sign + pad2(Math.floor(abs / 60)) + ":" + pad2(abs % 60);
    }

    /* ---------- 繪製畫面 ---------- */
    function render() {
        const now = new Date();

        let h = now.getHours();
        let suffix = "";
        if (state.hour12) {
            suffix = h < 12 ? "AM" : "PM";
            h = h % 12 || 12;                              // 0 點顯示 12
        }

        el.hours.textContent = pad2(h);
        el.minutes.textContent = pad2(now.getMinutes());
        el.seconds.textContent = pad2(now.getSeconds());
        el.suffix.textContent = suffix;
        el.date.textContent = dateFmt.format(now);
        el.zone.textContent = state.timeZone + " · " + utcOffset(now);

        // 冒號跟秒數同步閃爍（不依賴 CSS animation，避免與秒數對不上）
        const dim = now.getSeconds() % 2 === 1;
        el.colons.forEach((c) => c.classList.toggle("is-dim", dim));

        document.title = el.hours.textContent + ":" + el.minutes.textContent + " · 實時時鐘";
    }

    /* ---------- 排程：每次對齊「下一個整秒」，不累積誤差 ---------- */
    let timerId = null;

    function tick() {
        render();
        const delay = 1000 - (Date.now() % 1000) + 10;   // 多 10ms 緩衝，避免提早觸發
        timerId = setTimeout(tick, delay);
    }

    function start() { stop(); tick(); }
    function stop() { if (timerId !== null) { clearTimeout(timerId); timerId = null; } }

    /* ---------- 主題 ---------- */
    function applyTheme(theme, persist) {
        document.documentElement.dataset.theme = theme;
        el.themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
        el.themeBtn.setAttribute("aria-label",
            theme === "dark" ? "切換為淺色主題" : "切換為深色主題");
        if (persist) store.set(LS_THEME, theme);
    }

    function initTheme() {
        const saved = store.get(LS_THEME);
        const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
        applyTheme(saved || (prefersLight ? "light" : "dark"), false);
    }

    /* ---------- 事件 ---------- */
    el.themeBtn.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next, true);
    });

    el.formatBtn.addEventListener("click", () => {
        state.hour12 = !state.hour12;
        store.set(LS_HOUR12, String(state.hour12));
        el.formatBtn.setAttribute("aria-pressed", String(state.hour12));
        render();
    });

    // 分頁切回前景時立即重新校正（背景分頁的 timer 會被瀏覽器節流）
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) start();
    });

    window.addEventListener("pagehide", stop);
    window.addEventListener("pageshow", start);   // 支援 bfcache 返回

    /* ---------- 啟動 ---------- */
    initTheme();
    el.formatBtn.setAttribute("aria-pressed", String(state.hour12));
    start();
})();