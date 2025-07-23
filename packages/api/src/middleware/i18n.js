const i18next = require('i18next');
const path = require('path');
const fs = require('fs');

// Load translation files
const loadTranslations = (language) => {
  try {
    const filePath = path.join(__dirname, '../locales', `${language}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Failed to load translations for ${language}:`, error.message);
    return {};
  }
};

// Initialize i18next
i18next.init({
  lng: 'en', // default language
  fallbackLng: 'en',
  resources: {
    en: {
      translation: loadTranslations('en')
    },
    ar: {
      translation: loadTranslations('ar')
    }
  },
  interpolation: {
    escapeValue: false // React already does escaping
  }
});

// Middleware to set language based on request headers
const languageMiddleware = (req, res, next) => {
  // Get language from Accept-Language header or query parameter
  const acceptLanguage = req.headers['accept-language'];
  const queryLang = req.query.lang;
  
  let language = 'en'; // default
  
  if (queryLang && ['en', 'ar'].includes(queryLang)) {
    language = queryLang;
  } else if (acceptLanguage) {
    // Parse Accept-Language header
    const languages = acceptLanguage.split(',').map(lang => {
      const parts = lang.trim().split(';');
      return parts[0].toLowerCase();
    });
    
    // Find first supported language
    for (const lang of languages) {
      if (lang.startsWith('ar')) {
        language = 'ar';
        break;
      } else if (lang.startsWith('en')) {
        language = 'en';
        break;
      }
    }
  }
  
  // Set language for this request
  req.language = language;
  i18next.changeLanguage(language);
  
  // Add translation function to request
  req.t = (key, options) => i18next.t(key, options);
  
  next();
};

// Helper function to get translated message
const getTranslatedMessage = (key, language = 'en', options = {}) => {
  const currentLng = i18next.language;
  i18next.changeLanguage(language);
  const message = i18next.t(key, options);
  i18next.changeLanguage(currentLng);
  return message;
};

// Helper function to get all translations for a namespace
const getTranslations = (namespace, language = 'en') => {
  const currentLng = i18next.language;
  i18next.changeLanguage(language);
  const translations = i18next.getResourceBundle(language, 'translation')[namespace] || {};
  i18next.changeLanguage(currentLng);
  return translations;
};

module.exports = {
  i18next,
  languageMiddleware,
  getTranslatedMessage,
  getTranslations
};