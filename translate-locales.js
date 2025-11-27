const fs = require('fs');
const path = require('path');

// Translation dictionaries for common terms
const translations = {
  ar: {
    // Common UI terms
    "Welcome": "مرحباً",
    "Good Morning": "صباح الخير",
    "Good Afternoon": "مساء الخير", 
    "Good Evening": "مساء الخير",
    "Today's Overview": "نظرة عامة على اليوم",
    "Calories": "السعرات الحرارية",
    "Protein": "البروتين",
    "Carbs": "الكربوهيدرات",
    "Fat": "الدهون",
    "Dashboard": "لوحة القيادة",
    "Meals": "الوجبات",
    "Recipes": "الوصفات",
    "Analytics": "التحليلات",
    "Profile": "الملف الشخصي",
    "Settings": "الإعدادات",
    "Logout": "تسجيل الخروج",
    "Save": "حفظ",
    "Cancel": "إلغاء",
    "Delete": "حذف",
    "Edit": "تعديل",
    "Add": "إضافة",
    "Remove": "إزالة",
    "Confirm": "تأكيد",
    "Close": "إغلاق",
    "Back": "رجوع",
    "Next": "التالي",
    "Previous": "السابق",
    "Submit": "إرسال",
    "Loading": "جاري التحميل",
    "Error": "خطأ",
    "Success": "نجاح",
    "Warning": "تحذير"
  },
  fr: {
    "Welcome": "Bienvenue",
    "Good Morning": "Bonjour",
    "Good Afternoon": "Bon après-midi",
    "Good Evening": "Bonsoir",
    "Today's Overview": "Aperçu d'aujourd'hui",
    "Calories": "Calories",
    "Protein": "Protéines",
    "Carbs": "Glucides",
    "Fat": "Graisses",
    "Dashboard": "Tableau de bord",
    "Meals": "Repas",
    "Recipes": "Recettes",
    "Analytics": "Analytique",
    "Profile": "Profil",
    "Settings": "Paramètres",
    "Logout": "Déconnexion",
    "Save": "Enregistrer",
    "Cancel": "Annuler",
    "Delete": "Supprimer",
    "Edit": "Modifier",
    "Add": "Ajouter",
    "Remove": "Retirer",
    "Confirm": "Confirmer",
    "Close": "Fermer",
    "Back": "Retour",
    "Next": "Suivant",
    "Previous": "Précédent",
    "Submit": "Soumettre",
    "Loading": "Chargement",
    "Error": "Erreur",
    "Success": "Succès",
    "Warning": "Avertissement"
  },
  es: {
    "Welcome": "Bienvenido",
    "Good Morning": "Buenos días",
    "Good Afternoon": "Buenas tardes",
    "Good Evening": "Buenas noches",
    "Today's Overview": "Resumen de hoy",
    "Calories": "Calorías",
    "Protein": "Proteína",
    "Carbs": "Carbohidratos",
    "Fat": "Grasa",
    "Dashboard": "Tablero",
    "Meals": "Comidas",
    "Recipes": "Recetas",
    "Analytics": "Análisis",
    "Profile": "Perfil",
    "Settings": "Configuración",
    "Logout": "Cerrar sesión",
    "Save": "Guardar",
    "Cancel": "Cancelar",
    "Delete": "Eliminar",
    "Edit": "Editar",
    "Add": "Agregar",
    "Remove": "Quitar",
    "Confirm": "Confirmar",
    "Close": "Cerrar",
    "Back": "Atrás",
    "Next": "Siguiente",
    "Previous": "Anterior",
    "Submit": "Enviar",
    "Loading": "Cargando",
    "Error": "Error",
    "Success": "Éxito",
    "Warning": "Advertencia"
  }
};

// Simple translation function (replaces common English terms)
function translateValue(value, lang) {
  if (typeof value !== 'string') return value;
  
  const dict = translations[lang];
  if (!dict) return value;
  
  // Try exact match first
  if (dict[value]) return dict[value];
  
  // Try partial matches
  for (const [en, translated] of Object.entries(dict)) {
    value = value.replace(en, translated);
  }
  
  return value;
}

// Recursively translate object
function translateObject(obj, lang) {
  if (typeof obj === 'string') {
    return translateValue(obj, lang);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => translateObject(item, lang));
  }
  
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = translateObject(value, lang);
    }
    return result;
  }
  
  return obj;
}

// Main function
function translateFile(fileName, lang) {
  const enPath = path.join(__dirname, 'client', 'src', 'i18n', 'locales', 'en', fileName);
  const targetPath = path.join(__dirname, 'client', 'src', 'i18n', 'locales', lang, fileName);
  
  if (!fs.existsSync(enPath)) {
    console.log(`❌ English file not found: ${fileName}`);
    return;
  }
  
  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const translated = translateObject(enContent, lang);
  
  fs.writeFileSync(targetPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');
  console.log(`✅ Translated ${fileName} to ${lang}`);
}

// Files to translate (excluding the massive common.json for now)
const files = [
  'dashboard.json',
  'meals.json',
  'onboarding.json',
  'profile.json',
  'recipes.json'
];

// Languages
const languages = ['ar', 'fr', 'es'];

console.log('🌐 Starting translation process...\n');

for (const lang of languages) {
  console.log(`\n📝 Translating to ${lang.toUpperCase()}:`);
  for (const file of files) {
    translateFile(file, lang);
  }
}

console.log('\n✨ Translation complete!');
console.log('\n⚠️  Note: Auto-translation is basic. Manual review recommended for:');
console.log('   - Context-specific terms');
console.log('   - Cultural adaptations');
console.log('   - Technical accuracy');
