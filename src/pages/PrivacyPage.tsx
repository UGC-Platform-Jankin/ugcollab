import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">Privacy Policy</h1>
            <p className="text-muted-foreground mb-12">Last updated: 1 April 2026</p>

            <div className="space-y-10 text-foreground/90 leading-relaxed">
              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">1. Information We Collect</h2>
                <p className="text-muted-foreground">
                  When you register on UGCollab, we collect information you provide directly, including your name, email address, profile details, and social media account information. We also collect usage data such as pages visited, features used, and interactions within the platform.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-3">We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide, maintain, and improve the UGCollab platform</li>
                  <li>Match creators with brand campaigns</li>
                  <li>Facilitate communication between brands and creators</li>
                  <li>Process payments and track campaign deliverables</li>
                  <li>Send notifications about campaign updates and platform activity</li>
                  <li>Ensure the security and integrity of our services</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">3. Information Sharing</h2>
                <p className="text-muted-foreground">
                  We share your profile information with brands or creators as part of the campaign matching process. We do not sell your personal information to third parties. We may share data with service providers who assist in operating our platform, subject to confidentiality obligations.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">4. Social Media Data</h2>
                <p className="text-muted-foreground">
                  When you connect social media accounts (Instagram, TikTok, etc.), we access publicly available information such as follower counts and engagement metrics. We store this data to help brands evaluate creator profiles. You can disconnect your social accounts at any time.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">5. Data Security</h2>
                <p className="text-muted-foreground">
                  We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security reviews. However, no method of transmission over the internet is 100% secure.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">6. Data Retention</h2>
                <p className="text-muted-foreground">
                  We retain your personal data for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data by contacting us at hello@ugczone.io.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">7. Cookies</h2>
                <p className="text-muted-foreground">
                  We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics cookies help us understand how users interact with the platform.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">8. Your Rights</h2>
                <p className="text-muted-foreground">
                  You have the right to access, correct, or delete your personal data. You may also request a copy of your data in a portable format. To exercise these rights, contact us at hello@ugczone.io.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">9. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting a notice on the platform or sending you an email.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">10. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, please contact us at hello@ugczone.io.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
