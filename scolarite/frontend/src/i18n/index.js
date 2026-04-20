const messages = {
  fr: {
    modernizationHubTitle: "Roadmap Modernisation - Hub d'exécution",
  },
  en: {
    modernizationHubTitle: "Modernization Roadmap - Execution Hub",
  },
};

export function t(key, locale = "fr") {
  return messages[locale]?.[key] || messages.fr[key] || key;
}
