(() => {
  const LANGUAGE_KEY = "rsd-language";
  const DETECTION_KEY = "rsd-country-detected";

  document.querySelectorAll("[data-language-choice]").forEach((link) => {
    link.addEventListener("click", () => {
      localStorage.setItem(LANGUAGE_KEY, link.dataset.languageChoice);
    });
  });

  const preferredLanguage = localStorage.getItem(LANGUAGE_KEY);
  if (preferredLanguage === "pl" && window.location.pathname === "/") {
    window.location.replace("/pl/");
    return;
  }

  if (
    preferredLanguage ||
    window.location.pathname !== "/" ||
    sessionStorage.getItem(DETECTION_KEY)
  ) {
    return;
  }

  sessionStorage.setItem(DETECTION_KEY, "true");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2000);

  fetch("https://api.country.is/", {
    cache: "no-store",
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Country lookup failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(({ country }) => {
      if (country === "PL") {
        window.location.replace("/pl/");
      }
    })
    .catch(() => {
      // Keep English as the reliable fallback when geolocation is unavailable.
    })
    .finally(() => window.clearTimeout(timeout));
})();
