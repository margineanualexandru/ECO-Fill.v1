(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const progressBar = document.querySelector("#progress-bar");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  document.querySelectorAll("#year").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  /* ---------------------------------------------------------------------
     Scroll progress: top bar and the live rail marker
     --------------------------------------------------------------------- */
  const railFill = document.querySelector("#rail-fill");
  const railThumb = document.querySelector("#rail-thumb");
  const railThumbShape = document.querySelector("#rail-thumb-shape");
  const railThumbVein = document.querySelector("#rail-thumb-vein");
  const railThumbSpark = document.querySelector("#rail-thumb-spark");
  const railTrack = document.querySelector(".rail-track");
  const railNodes = [...document.querySelectorAll(".rail-node")];
  let ticking = false;
  let railTrackHeight = 0;

  function measureRail() {
    railTrackHeight = railTrack ? railTrack.getBoundingClientRect().height : 0;
  }

  /* The marker travels from a leaf to a detergent drop. Both silhouettes
     share the same four cubic segments and follow the same direction around
     the outline, so the points can be interpolated one by one and the shape
     morphs without pinching while the page scrolls. */
  const THUMB_LEAF = [
    12, 1.5,
    9.5, 6, 5.5, 11, 5, 16,
    4.6, 19.5, 7.5, 22, 12, 24.5,
    16.5, 22, 19.4, 19.5, 19, 16,
    18.5, 11, 14.5, 6, 12, 1.5,
  ];
  const THUMB_DROP = [
    12, 1.5,
    12, 1.5, 4, 11, 4, 17.5,
    4, 21.5, 7.6, 24.5, 12, 24.5,
    16.4, 24.5, 20, 21.5, 20, 17.5,
    20, 11, 12, 1.5, 12, 1.5,
  ];

  /* Colours are interpolated in HSL so the marker keeps its saturation
     (forest → lime → neon pink) instead of passing through a muddy brown. */
  const THUMB_COLORS = [
    [150, 54, 20],
    [96, 55, 53],
    [329, 100, 59],
  ];
  const THUMB_HUE_STEPS = THUMB_COLORS.map((color, index) => {
    if (index === THUMB_COLORS.length - 1) return 0;

    let delta = THUMB_COLORS[index + 1][0] - color[0];
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    return delta;
  });
  const THUMB_STOPS = [0, 0.58, 1];
  let thumbPath = "";
  let thumbFill = "";

  function updateThumbShape(ratio) {
    if (!railThumbShape) return;

    const points = THUMB_LEAF.map(
      (value, index) => value + (THUMB_DROP[index] - value) * ratio
    );

    let d = `M${points[0].toFixed(1)} ${points[1].toFixed(1)}`;

    for (let i = 2; i < points.length; i += 6) {
      d +=
        `C${points[i].toFixed(1)} ${points[i + 1].toFixed(1)} ` +
        `${points[i + 2].toFixed(1)} ${points[i + 3].toFixed(1)} ` +
        `${points[i + 4].toFixed(1)} ${points[i + 5].toFixed(1)}`;
    }

    d += "Z";

    if (d !== thumbPath) {
      railThumbShape.setAttribute("d", d);
      thumbPath = d;
    }

    const segment = ratio > THUMB_STOPS[1] ? 1 : 0;
    const local = clamp(
      (ratio - THUMB_STOPS[segment]) /
        (THUMB_STOPS[segment + 1] - THUMB_STOPS[segment]),
      0,
      1
    );
    const from = THUMB_COLORS[segment];
    const to = THUMB_COLORS[segment + 1];
    const hue = (from[0] + THUMB_HUE_STEPS[segment] * local + 360) % 360;
    const sat = from[1] + (to[1] - from[1]) * local;
    const light = from[2] + (to[2] - from[2]) * local;
    const fill =
      `hsl(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`;

    if (fill !== thumbFill) {
      railThumbShape.setAttribute("fill", fill);
      thumbFill = fill;
    }

    if (railThumbVein) {
      railThumbVein.style.opacity = clamp(1 - ratio / 0.3, 0, 1).toFixed(2);
    }

    if (railThumbSpark) {
      railThumbSpark.style.opacity = clamp((ratio - 0.62) / 0.3, 0, 1).toFixed(2);
    }
  }

  function updateScrollState() {
    const scrollable = root.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
    const scrolled = window.scrollY > 34;

    root.style.setProperty("--scroll", ratio.toFixed(4));
    body.classList.toggle("is-scrolled", scrolled);

    if (progressBar) {
      progressBar.style.width = `${(ratio * 100).toFixed(2)}%`;
    }

    /* The rail mirrors the page scroll continuously: the fill and the
       marker move with the scroll position instead of jumping between
       section stops. */
    if (railFill) {
      railFill.style.height = `${(ratio * 100).toFixed(2)}%`;
    }

    if (railThumb && railTrackHeight) {
      const y = (ratio * railTrackHeight).toFixed(2);
      railThumb.style.transform = `translate(-50%, -50%) translate3d(0, ${y}px, 0)`;
    }

    updateThumbShape(ratio);

    if (railNodes.length > 1) {
      const step = 1 / (railNodes.length - 1);

      railNodes.forEach((node, index) => {
        const proximity = clamp(1 - Math.abs(ratio - index * step) / step, 0, 1);
        node.style.setProperty("--p", proximity.toFixed(3));
      });
    }
  }

  function requestScrollUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateScrollState();
      ticking = false;
    });
  }

  function handleResize() {
    measureRail();
    updateScrollState();
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", handleResize);
  window.addEventListener("load", handleResize);
  handleResize();

  /* ---------------------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------------------- */
  const menuToggle = document.querySelector("#menu-toggle");
  const mainNav = document.querySelector("#main-nav");

  if (menuToggle && mainNav) {
    const setMenu = (open) => {
      mainNav.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Închide meniul" : "Deschide meniul");
    };

    menuToggle.addEventListener("click", () => {
      setMenu(!mainNav.classList.contains("open"));
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("click", (event) => {
      if (
        mainNav.classList.contains("open") &&
        !mainNav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        setMenu(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mainNav.classList.contains("open")) {
        setMenu(false);
        menuToggle.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1000) setMenu(false);
    });
  }

  /* ---------------------------------------------------------------------
     Home impact simulator (illustrative only)
     --------------------------------------------------------------------- */
  const refillSlider = document.querySelector("#refills");
  const refillOutput = document.querySelector("#refill-output");
  const yearRefills = document.querySelector("#year-refills");
  const avoided = document.querySelector("#avoided");

  if (refillSlider && refillOutput && yearRefills && avoided) {
    const updateImpact = () => {
      const monthly = Number(refillSlider.value);
      refillOutput.value = String(monthly);
      refillOutput.textContent = String(monthly);
      yearRefills.textContent = String(monthly * 12);
      avoided.textContent = String(monthly * 12);
    };

    refillSlider.addEventListener("input", updateImpact);
    updateImpact();
  }

  /* ---------------------------------------------------------------------
     Product page: selectable exploded machine
     --------------------------------------------------------------------- */
  const anatomyLayout = document.querySelector("#anatomy-layout");

  if (anatomyLayout) {
    const partNodes = [...anatomyLayout.querySelectorAll(".sp")];
    const partTabs = [...anatomyLayout.querySelectorAll(".part-tab")];
    const partKicker = document.querySelector("#part-kicker");
    const partTitle = document.querySelector("#part-title");
    const partDesc = document.querySelector("#part-desc");
    const partFacts = document.querySelector("#part-facts");

    const parts = {
      pump: {
        kicker: "01 / POMPĂ",
        title: "Pompa dozatoare",
        desc: "Pompa dozează produsul și îl transferă controlat din rezervor în recipient. Un gest scurt, fără să deschizi un ambalaj nou.",
        facts: [
          "Dozează cantitatea necesară.",
          "Transfer controlat, fără scurgeri.",
        ],
      },
      tank: {
        kicker: "02 / REZERVOR",
        title: "Rezervorul",
        desc: "Rezervorul stochează temporar produsul destinat reumplerii. Fereastra arată nivelul rămas, ca să știi când trebuie să reîncarci.",
        facts: [
          "Păstrează produsul pregătit pentru reumplere.",
          "Fereastra laterală arată nivelul rămas.",
        ],
      },
      cartridge: {
        kicker: "03 / CARTUȘ",
        title: "Cartușul de refill",
        desc: "Cartușul conține produsul de refill. În configurația conceptuală poate fi înlocuit sau reîncărcat; modul final va fi stabilit după testare.",
        facts: [
          "Se schimbă sau se reîncarcă, în funcție de configurație.",
          "Reduce ambalajul la partea consumabilă.",
        ],
      },
      tray: {
        kicker: "04 / TAVĂ",
        title: "Tava de picurare",
        desc: "Tava colectează picăturile și menține curățenia în jurul aparatului. Se scoate și se clătește separat.",
        facts: [
          "Adună ultimele picături.",
          "Se curăță ușor, sub robinet.",
        ],
      },
    };

    const setPart = (key) => {
      const data = parts[key];
      if (!data) return;

      anatomyLayout.dataset.active = key;

      partNodes.forEach((node) => {
        const active = node.dataset.part === key;
        node.classList.toggle("is-active", active);
        node.setAttribute("aria-pressed", String(active));
      });

      partTabs.forEach((tab) => {
        const active = tab.dataset.part === key;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", String(active));
      });

      if (partKicker) partKicker.textContent = data.kicker;
      if (partTitle) partTitle.textContent = data.title;
      if (partDesc) partDesc.textContent = data.desc;

      if (partFacts) {
        partFacts.replaceChildren(
          ...data.facts.map((fact) => {
            const item = document.createElement("li");
            item.textContent = fact;
            return item;
          })
        );
      }
    };

    partNodes.forEach((node) => {
      node.addEventListener("click", () => setPart(node.dataset.part));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setPart(node.dataset.part);
        }
      });
    });

    partTabs.forEach((tab) => {
      tab.addEventListener("click", () => setPart(tab.dataset.part));
    });

    setPart("pump");
  }

  /* ---------------------------------------------------------------------
     Product page: virtual refill game
     --------------------------------------------------------------------- */
  const gameStage = document.querySelector("#game-stage");

  if (gameStage) {
    const fillBtn = document.querySelector("#game-fill");
    const resetBtn = document.querySelector("#game-reset");
    const bottleLiquid = document.querySelector("#gb-liquid");
    const fillBar = document.querySelector("#fill-bar");
    const fillValue = document.querySelector("#fill-value");
    const fillProgress = document.querySelector("#fill-progress");
    const status = document.querySelector("#game-status");
    const screen = document.querySelector("#gm-screen");
    const refillCount = document.querySelector("#refill-count");
    const avoidedCount = document.querySelector("#avoided-count");
    const scentName = document.querySelector("#scent-name");
    const scentButtons = [...document.querySelectorAll(".scent")];

    const FILL_MS = 1600;
    const EMPTY_DELAY = 2000;

    let level = 0;
    let filling = false;
    let rafId = 0;
    let lastTime = 0;
    let refills = 0;
    let avoidedValue = 0;
    let currentScent = "Verde";
    let emptyTimer = 0;

    const clearEmptyTimer = () => {
      if (emptyTimer) {
        window.clearTimeout(emptyTimer);
        emptyTimer = 0;
      }
    };

    const updateLevel = (nextLevel) => {
      level = clamp(nextLevel, 0, 100);

      if (bottleLiquid) bottleLiquid.style.height = `${level}%`;
      if (fillBar) fillBar.style.width = `${level}%`;
      if (fillValue) fillValue.textContent = `${Math.round(level)}%`;
      if (fillProgress) fillProgress.setAttribute("aria-valuenow", String(Math.round(level)));
      if (fillBtn) fillBtn.style.setProperty("--fill", (level / 100).toFixed(3));

      if (screen) {
        screen.textContent =
          level >= 100 ? "FULL" : level > 0 ? `${Math.round(level)}%` : "READY";
      }

      gameStage.classList.toggle("is-full", level >= 100);
    };

    const setHolding = (holding) => {
      if (fillBtn) fillBtn.classList.toggle("is-holding", holding);
      gameStage.classList.toggle("is-filling", holding);
    };

    const finishFill = () => {
      filling = false;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      setHolding(false);
      updateLevel(100);

      refills += 1;
      avoidedValue += 1;
      if (refillCount) refillCount.textContent = String(refills);
      if (avoidedCount) avoidedCount.textContent = String(avoidedValue);

      if (status) {
        status.textContent = `Reumplere completă. ${avoidedValue} ${
          avoidedValue === 1 ? "ambalaj evitat" : "ambalaje evitate"
        } în simulare. Recipientul se golește automat pentru următorul ciclu.`;
      }

      if (fillBtn) {
        fillBtn.disabled = true;
        fillBtn.setAttribute("aria-label", "Reumplere completă. Așteaptă golirea recipientului.");
      }

      clearEmptyTimer();
      emptyTimer = window.setTimeout(() => {
        emptyTimer = 0;
        updateLevel(0);
        if (fillBtn) {
          fillBtn.disabled = false;
          fillBtn.setAttribute("aria-label", "Ține apăsat pentru reumplere");
        }
        if (status) {
          status.textContent = "Recipientul este din nou gol. Poți reumple sau alege alt parfum.";
        }
      }, EMPTY_DELAY);
    };

    const stepFill = (time) => {
      if (!filling) return;
      if (!lastTime) lastTime = time;

      const delta = Math.min(64, time - lastTime);
      lastTime = time;

      updateLevel(level + (delta / FILL_MS) * 100);

      if (level >= 100) {
        finishFill();
        return;
      }

      rafId = window.requestAnimationFrame(stepFill);
    };

    const startFill = (event) => {
      if (!fillBtn || filling || fillBtn.disabled || level >= 100) return;

      if (event && event.type === "pointerdown") {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();

        try {
          fillBtn.setPointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture is optional; window listeners still stop the fill.
        }
      }

      clearEmptyTimer();
      filling = true;
      lastTime = 0;
      setHolding(true);
      if (status) status.textContent = "Se reumple… ține apăsat până la 100%.";
      rafId = window.requestAnimationFrame(stepFill);
    };

    const stopFill = () => {
      if (!filling) return;

      filling = false;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      setHolding(false);

      if (level >= 100) return;

      if (status) {
        status.textContent =
          level > 2
            ? `Ai oprit la ${Math.round(level)}%. Ține apăsat mai mult pentru o reumplere completă.`
            : "Ține apăsat butonul până când recipientul se umple.";
      }
    };

    const selectScent = (button) => {
      currentScent = button.dataset.scent || "Verde";

      scentButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      if (scentName) scentName.textContent = currentScent;

      if (status && !filling && level < 100) {
        status.textContent = `${currentScent} selectat. Ține apăsat butonul pentru refill.`;
      }
    };

    const resetGame = () => {
      clearEmptyTimer();
      filling = false;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      setHolding(false);

      refills = 0;
      avoidedValue = 0;
      currentScent = "Verde";

      updateLevel(0);

      if (fillBtn) {
        fillBtn.disabled = false;
        fillBtn.setAttribute("aria-label", "Ține apăsat pentru reumplere");
      }

      if (refillCount) refillCount.textContent = "0";
      if (avoidedCount) avoidedCount.textContent = "0";
      if (scentName) scentName.textContent = "Verde";

      scentButtons.forEach((button, index) => {
        const active = index === 0;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      if (status) {
        status.textContent = "Alege un parfum și ține apăsat pentru a începe.";
      }
    };

    if (fillBtn) {
      fillBtn.addEventListener("pointerdown", startFill);
      fillBtn.addEventListener("pointerup", stopFill);
      fillBtn.addEventListener("pointercancel", stopFill);
      fillBtn.addEventListener("pointerleave", stopFill);
      fillBtn.addEventListener("contextmenu", (event) => event.preventDefault());

      fillBtn.addEventListener("keydown", (event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          startFill();
        }
      });

      fillBtn.addEventListener("keyup", (event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          stopFill();
        }
      });
    }

    if (resetBtn) resetBtn.addEventListener("click", resetGame);

    scentButtons.forEach((button) => {
      button.addEventListener("click", () => selectScent(button));
    });

    window.addEventListener("pointerup", stopFill);
    window.addEventListener("blur", stopFill);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopFill();
    });

    updateLevel(0);
    setHolding(false);
  }

  /* ---------------------------------------------------------------------
     Gentle reveal on scroll
     --------------------------------------------------------------------- */
  const revealItems = [...document.querySelectorAll("[data-reveal]")];

  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealItems.forEach((item) => observer.observe(item));

    let revealTicking = false;
    const revealPassedItems = () => {
      if (revealTicking) return;
      revealTicking = true;
      window.requestAnimationFrame(() => {
        revealItems.forEach((item) => {
          if (!item.classList.contains("is-visible") && item.getBoundingClientRect().top < 0) {
            item.classList.add("is-visible");
            observer.unobserve(item);
          }
        });
        revealTicking = false;
      });
    };

    window.addEventListener("scroll", revealPassedItems, { passive: true });
    revealPassedItems();
  }
})();
