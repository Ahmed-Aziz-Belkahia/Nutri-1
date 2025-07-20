import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="mt-auto py-6 px-4 bg-gradient-to-r from-[#0CC5BA]/5 to-blue-500/5 border-t border-gray-100">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} NutriAI. {t('footer.allRightsReserved')}
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            <Link href="/privacy">
              <a className="text-sm text-gray-600 hover:text-[#0CC5BA] transition-colors">
                {t('footer.privacyPolicy')}
              </a>
            </Link>
            <Link href="/settings/about">
              <a className="text-sm text-gray-600 hover:text-[#0CC5BA] transition-colors">
                {t('footer.aboutUs')}
              </a>
            </Link>
            <Link href="/settings/help">
              <a className="text-sm text-gray-600 hover:text-[#0CC5BA] transition-colors">
                {t('footer.help')}
              </a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}