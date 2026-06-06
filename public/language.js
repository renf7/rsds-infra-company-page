(() => {
  const PREFERENCE_KEY = "rsd-language-preference";
  const COUNTRY_KEY = "rsd-detected-country";
  const POLISH_ROUTE = "/pl/";

  const readStorage = (storageName, key) => {
    try {
      return window[storageName].getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (storageName, key, value) => {
    try {
      window[storageName].setItem(key, value);
    } catch {
      // Language selection still works when browser storage is unavailable.
    }
  };

  const redirectToPolish = () => {
    window.location.replace(
      `${POLISH_ROUTE}${window.location.search}${window.location.hash}`,
    );
  };

  document.querySelectorAll("[data-language-choice]").forEach((link) => {
    link.addEventListener("click", () => {
      writeStorage("localStorage", PREFERENCE_KEY, link.dataset.languageChoice);
    });
  });

  // Infer a language only at the English entry URL. Both dedicated language
  // URLs remain directly accessible to users and search-engine crawlers.
  const isEnglishEntry =
    window.location.pathname === "/" ||
    window.location.pathname === "/index.html";

  if (!isEnglishEntry) {
    return;
  }

  const preferredLanguage = readStorage("localStorage", PREFERENCE_KEY);
  if (preferredLanguage === "pl") {
    redirectToPolish();
    return;
  }
  if (preferredLanguage === "en") {
    return;
  }

  const detectedCountry = readStorage("sessionStorage", COUNTRY_KEY);
  if (detectedCountry) {
    if (detectedCountry === "PL") {
      redirectToPolish();
    }
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2000);

  fetch("https://api.country.is/", {
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Country lookup failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(({ country }) => {
      if (typeof country !== "string") {
        return;
      }

      const normalizedCountry = country.toUpperCase();
      writeStorage("sessionStorage", COUNTRY_KEY, normalizedCountry);
      if (
        normalizedCountry === "PL" &&
        readStorage("localStorage", PREFERENCE_KEY) !== "en"
      ) {
        redirectToPolish();
      }
    })
    .catch(() => {
      // English remains the reliable fallback when geolocation is unavailable.
    })
    .finally(() => window.clearTimeout(timeout));
})();
