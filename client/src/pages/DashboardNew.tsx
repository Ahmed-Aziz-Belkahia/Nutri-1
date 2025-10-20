import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";

export default function DashboardNew() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          New Dashboard (Under Construction)
        </h1>
        
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            This is the new dashboard page. Start building here!
          </p>
        </Card>
      </div>
    </div>
  );
}
