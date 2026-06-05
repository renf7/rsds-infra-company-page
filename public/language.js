(() => {
  const COUNTRY_KEY = "rsd-detected-country";
  const COUNTRY_ROUTES = {
    PL: "/pl/",
  };

  const redirectToCountryPage = (country) => {
    const countryRoute = COUNTRY_ROUTES[country];
    if (countryRoute && window.location.pathname !== countryRoute) {
      window.location.replace(countryRoute);
      return true;
    }
    return false;
  };

  document.querySelectorAll("[data-language-choice]").forEach((link) => {
    link.addEventListener("click", () => {
      sessionStorage.setItem(
        COUNTRY_KEY,
        link.dataset.languageChoice.toUpperCase(),
      );
    });
  });

  const detectedCountry = sessionStorage.getItem(COUNTRY_KEY);
  if (detectedCountry) {
    redirectToCountryPage(detectedCountry);
    return;
  }

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
      if (typeof country === "string") {
        const normalizedCountry = country.toUpperCase();
        sessionStorage.setItem(COUNTRY_KEY, normalizedCountry);
        redirectToCountryPage(normalizedCountry);
      }
    })
    .catch(() => {
      // Keep English as the reliable fallback when geolocation is unavailable.
    })
    .finally(() => window.clearTimeout(timeout));
})();
