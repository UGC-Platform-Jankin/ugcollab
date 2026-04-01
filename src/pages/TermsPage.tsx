import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";

const TermsPage = () => {
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
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">Terms of Service</h1>
            <p className="text-muted-foreground mb-12">Last updated: 1 April 2026</p>

            <div className="space-y-10 text-foreground/90 leading-relaxed">
              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing or using UGC Zone, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform. UGC Zone reserves the right to update these terms at any time.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">2. Platform Overview</h2>
                <p className="text-muted-foreground">
                  UGC Zone is a platform that connects brands with content creators for user-generated content (UGC) campaigns. The platform facilitates campaign creation, creator discovery, content review, messaging, and payment coordination.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">3. Account Registration</h2>
                <p className="text-muted-foreground">
                  You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old to use UGC Zone.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">4. Creator Obligations</h2>
                <p className="text-muted-foreground mb-3">As a creator on UGC Zone, you agree to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide accurate information about your social media presence and reach</li>
                  <li>Deliver content that meets the campaign brief and requirements</li>
                  <li>Respond to brand feedback and make reasonable revisions</li>
                  <li>Post approved content within the agreed timeline</li>
                  <li>Not engage in fraudulent activity, including fake followers or engagement</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">5. Brand Obligations</h2>
                <p className="text-muted-foreground mb-3">As a brand on UGC Zone, you agree to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide clear and complete campaign briefs</li>
                  <li>Review submitted content in a timely manner</li>
                  <li>Provide constructive feedback when requesting revisions</li>
                  <li>Honour payment commitments for approved content</li>
                  <li>Not misrepresent your business or campaign details</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">6. Content Ownership</h2>
                <p className="text-muted-foreground">
                  Creators retain ownership of original content they create. Upon approval and payment, brands receive a licence to use the content as specified in the campaign brief. The specific usage rights are determined by the campaign terms agreed upon by both parties.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">7. Payments</h2>
                <p className="text-muted-foreground">
                  Payment terms are defined within each campaign. UGC Zone facilitates payment coordination between brands and creators. UGC Zone may charge service fees as part of the transaction process.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">8. Prohibited Conduct</h2>
                <p className="text-muted-foreground mb-3">Users may not:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Use the platform for any unlawful purpose</li>
                  <li>Harass, abuse, or threaten other users</li>
                  <li>Upload malicious content or spam</li>
                  <li>Attempt to circumvent platform fees by arranging off-platform payments</li>
                  <li>Create multiple accounts or impersonate others</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">9. Termination</h2>
                <p className="text-muted-foreground">
                  UGC Zone reserves the right to suspend or terminate accounts that violate these terms. Users may delete their accounts at any time. Active campaign obligations must be fulfilled before account deletion.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">10. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  UGC Zone provides the platform "as is" and does not guarantee specific outcomes from campaigns. We are not liable for disputes between brands and creators, content quality, or campaign performance. Our liability is limited to the fees paid to UGC Zone.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">11. Governing Law</h2>
                <p className="text-muted-foreground">
                  These terms are governed by the laws of Hong Kong SAR. Any disputes arising from these terms will be resolved through arbitration in Hong Kong.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-semibold mb-3">12. Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms of Service, please contact us at hello@ugczone.io.
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

export default TermsPage;
