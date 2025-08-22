import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Privacy() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5">
      <header className="sticky top-0 backdrop-blur-xl bg-white/80 border-b border-white/20 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <Button
              variant="ghost" 
              onClick={() => setLocation("/profile")}
              className="-ml-2 p-2 rounded-xl hover:bg-white/40 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-medium ml-2 bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
          </div>
        </div>
      </header>
      
      <div className="w-full py-8 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-sm">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">Privacy Policy</h2>
            <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
              <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert">
                <p className="lead">
                  At NutriAi, we are committed to protecting your privacy and ensuring that your personal information is handled securely and responsibly. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application ("App") and associated services.
                </p>

                <h2>1. Information We Collect</h2>
                <p>We collect the following types of information:</p>
                
                <h3>a) Information You Provide to Us:</h3>
                <ul>
                  <li>Personal Information: When you use NutriAi, we may collect information such as your name, email address, and other details you provide.</li>
                  <li>Health Data: If you input dietary or health-related information, it will only be used to provide personalized recommendations within the app.</li>
                </ul>

                <h3>b) Automatically Collected Information:</h3>
                <ul>
                  <li>Device Information: We may collect details about your device, such as the device model, operating system version, and unique device identifiers.</li>
                  <li>Usage Data: Information about how you interact with the app, including pages accessed, features used, and session duration.</li>
                  <li>Log Information: This includes IP address, app crashes, and error reports.</li>
                </ul>

                <h3>c) Third-Party Data:</h3>
                <p>If you connect NutriAi to third-party services (e.g., Google Fit), we may collect data from those services as permitted by their privacy policies.</p>

                <h2>2. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Provide, maintain, and improve the app's functionality.</li>
                  <li>Personalize your experience and provide tailored dietary recommendations.</li>
                  <li>Communicate with you regarding updates, promotional offers, and support requests.</li>
                  <li>Analyze app usage to enhance performance and user satisfaction.</li>
                  <li>Comply with legal obligations and enforce our terms of service.</li>
                </ul>

                <h2>3. How We Share Your Information</h2>
                <p>We do not sell your personal information to third parties. However, we may share your information in the following situations:</p>

                <h3>a) Service Providers:</h3>
                <p>We may share information with trusted third-party vendors who help us operate the app, such as hosting providers and analytics tools.</p>

                <h3>b) Legal Compliance:</h3>
                <p>We may disclose your information if required by law or if we believe it is necessary to:</p>
                <ul>
                  <li>Protect the rights, property, or safety of NutriAi, our users, or the public.</li>
                  <li>Respond to legal processes, such as subpoenas or court orders.</li>
                </ul>

                <h3>c) Business Transfers:</h3>
                <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred to the relevant parties.</p>

                <h2>4. Data Security</h2>
                <p>We take reasonable measures to protect your information from unauthorized access, loss, misuse, or alteration. These measures include encryption, secure servers, and regular security audits. However, no method of data transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

                <h2>5. Your Choices and Rights</h2>
                <h3>a) Access and Update:</h3>
                <p>You can access and update your personal information through the app settings.</p>

                <h3>b) Opt-Out:</h3>
                <p>You can opt out of receiving promotional communications by following the unsubscribe instructions in our emails or contacting us directly.</p>

                <h3>c) Data Deletion:</h3>
                <p>If you wish to delete your account or personal data, you can make a request through the app or contact us.</p>

                <h3>d) Permissions:</h3>
                <p>You can manage app permissions (e.g., location or health data) through your device settings.</p>

                <h2>6. Third-Party Links</h2>
                <p>The app may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites and encourage you to review their privacy policies before providing any information.</p>

                <h2>7. Children's Privacy</h2>
                <p>NutriAi is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected such data, we will delete it promptly.</p>

                <h2>8. Changes to This Privacy Policy</h2>
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Any updates will be posted within the app, and the "Effective Date" at the top of this policy will be revised. Your continued use of NutriAi after changes indicates your acceptance of the updated policy.</p>
              </div>
            </ScrollArea>
            
            <div className="mt-8 text-center">
              <Button 
                onClick={() => setLocation("/profile")}
                className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}