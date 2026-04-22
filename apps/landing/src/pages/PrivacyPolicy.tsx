import { Link } from 'react-router-dom'
import Icon from '../components/Icon'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red rounded-lg flex items-center justify-center">
                <Icon name="content_cut" size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 font-display">GroomLink</span>
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Icon name="arrow_back" size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-display">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: February 15, 2026</p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> This privacy policy complies with Google Play Developer Policy requirements, 
              including the Data Safety Section requirements. By using our apps, you consent to the data practices described herein.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                GroomLink ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile applications ("GroomLink Customer App" and "GroomLink Partners App") available on Google Play Store and Apple App Store, and our website (groomlinkgh.com).
              </p>
              <p className="text-gray-700 mb-4">
                This policy applies to all users in Ghana and internationally. We comply with applicable data protection laws and Google Play Developer Data Safety requirements.
              </p>
              <p className="text-gray-700">
                By downloading, installing, or using our apps, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms, please do not access or use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Information You Provide Directly</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Account Registration:</strong> Full name, phone number (required), email address (optional)</li>
                <li><strong>Profile Information:</strong> Profile photo, preferences, grooming history</li>
                <li><strong>Booking Data:</strong> Appointment details, selected services, preferred barbers/stylists, booking history</li>
                <li><strong>Payment Information:</strong> Payment method details (processed securely by our payment partner Paystack; we do not store full card numbers)</li>
                <li><strong>Communications:</strong> Messages to salon partners, customer support inquiries, feedback, and reviews</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Information for Salon Partners</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Business Information:</strong> Business name, registration details, physical address, contact information</li>
                <li><strong>Service Data:</strong> Services offered, pricing, staff profiles, working hours</li>
                <li><strong>Banking Information:</strong> Bank account details for payout processing (encrypted and stored securely)</li>
                <li><strong>Operational Data:</strong> Booking management, revenue reports, customer analytics</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Location Data:</strong> Precise device location (with your explicit consent) to find nearby salons and provide navigation. You can disable location services in your device settings at any time.</li>
                <li><strong>Device Information:</strong> Device model, operating system version, unique device identifiers, app version, mobile network information</li>
                <li><strong>Usage Analytics:</strong> App interaction data, features used, session duration, crash reports, performance metrics</li>
                <li><strong>Log Data:</strong> IP address, access times, pages viewed, app errors, referral URLs</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.4 Permissions We Request</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Permission</th>
                      <th className="text-left py-2 font-semibold">Purpose</th>
                      <th className="text-left py-2 font-semibold">Required?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">Location (Fine & Coarse)</td>
                      <td className="py-2">Find nearby salons, provide directions</td>
                      <td className="py-2">Optional</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Camera</td>
                      <td className="py-2">Upload profile photos, salon images</td>
                      <td className="py-2">Optional</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Photo Library</td>
                      <td className="py-2">Select photos from gallery</td>
                      <td className="py-2">Optional</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Notifications</td>
                      <td className="py-2">Booking reminders, updates, promotions</td>
                      <td className="py-2">Optional</td>
                    </tr>
                    <tr>
                      <td className="py-2">Internet/Network</td>
                      <td className="py-2">App functionality, data sync</td>
                      <td className="py-2">Required</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 italic">
                All permissions are requested at runtime with clear explanations. You can revoke permissions at any time through your device settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Service Delivery:</strong> Create and manage your account, process bookings, facilitate payments, send appointment confirmations and reminders</li>
                <li><strong>Location Services:</strong> Display nearby salons, provide navigation, calculate distances and estimated travel times</li>
                <li><strong>Personalization:</strong> Recommend salons based on your preferences, location, and booking history</li>
                <li><strong>Communication:</strong> Send transactional messages (booking updates, account alerts), respond to support requests, send promotional offers (with consent)</li>
                <li><strong>Platform Improvement:</strong> Analyze usage patterns, fix bugs, optimize app performance, develop new features</li>
                <li><strong>Security & Fraud Prevention:</strong> Verify user identity, detect and prevent fraudulent activities, protect against abuse</li>
                <li><strong>Business Operations:</strong> Generate analytics reports, measure marketing effectiveness, comply with legal obligations</li>
                <li><strong>Partner Services:</strong> Provide salon partners with booking management tools, customer insights, and payout processing</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>Legal Basis for Processing:</strong> We process your data based on your consent, contractual necessity (to provide our services), legitimate business interests, and legal compliance requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                <strong>We do not sell, trade, or rent your personal information to third parties.</strong> We may share your information only in the following circumstances:
              </p>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 With Salon Partners</h3>
              <p className="text-gray-700 mb-4">When you make a booking, we share necessary information with the salon partner, including:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Your name and contact information</li>
                <li>Booking details (date, time, services selected)</li>
                <li>Special requests or notes you provide</li>
              </ul>
              <p className="text-gray-700 mb-4">Salon partners are contractually obligated to use this information only for fulfilling your booking and not for unauthorized marketing.</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 With Service Providers</h3>
              <p className="text-gray-700 mb-4">We work with trusted third-party companies to operate our services:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Payment Processing:</strong> Paystack (Flutterwave) - processes all payment transactions securely. We do not store your full credit card details. See <a href="https://paystack.com/privacy" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Paystack Privacy Policy</a>.</li>
                <li><strong>Cloud Hosting:</strong> DigitalOcean - hosts our servers and databases with industry-standard security measures.</li>
                <li><strong>Maps & Location:</strong> Google Maps Platform - provides mapping, geolocation, and navigation services. See <a href="https://policies.google.com/privacy" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</li>
                <li><strong>Push Notifications:</strong> Firebase Cloud Messaging (FCM) / Expo Push Notifications - delivers appointment reminders and updates.</li>
                <li><strong>Analytics:</strong> Internal analytics tools to monitor app performance and user experience (no third-party analytics SDKs currently installed).</li>
              </ul>
              <p className="text-gray-700 mb-4">All service providers are bound by contractual agreements to protect your data and use it only for specified purposes.</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.3 No Advertising or Tracking</h3>
              <p className="text-gray-700 mb-4">
                <strong>We do not use Advertising ID (AD_ID) or any similar tracking identifiers for advertising purposes.</strong> Our apps:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Do not display advertisements</li>
                <li>Do not include advertising SDKs (Google Ads, AdMob, Facebook Ads, etc.)</li>
                <li>Do not track users across apps or websites for advertising</li>
                <li>Do not share data with advertising networks or data brokers</li>
                <li>Do not use Google Advertising ID or Apple IDFA</li>
              </ul>
              <p className="text-gray-700">
                Our business model is based on service fees from bookings, not advertising revenue. Your privacy is respected and your data is never used for ad targeting.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.4 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas, government investigations).</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.5 Business Transfers</h3>
              <p className="text-gray-700">
                In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of the transaction. We will notify you via email and/or prominent notice on our app of any such change in ownership or control of your personal information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">5. Data Security and Protection</h2>
              <p className="text-gray-700 mb-4">
                We implement comprehensive technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Encryption in Transit:</strong> All data transmitted between your device and our servers is encrypted using TLS 1.2+ (HTTPS/SSL)</li>
                <li><strong>Encryption at Rest:</strong> Sensitive data stored in our databases is encrypted using AES-256 encryption</li>
                <li><strong>Authentication:</strong> Secure token-based authentication (JWT) with refresh token rotation for session management</li>
                <li><strong>Access Controls:</strong> Role-based access control (RBAC) ensures only authorized personnel can access user data</li>
                <li><strong>Secure Payment Processing:</strong> Payment data is processed by PCI DSS-compliant payment providers (Paystack). We do not store full credit card numbers.</li>
                <li><strong>Regular Security Audits:</strong> Periodic vulnerability assessments and security reviews of our infrastructure</li>
                <li><strong>Server Security:</strong> Firewalls, intrusion detection systems, and 24/7 monitoring on our cloud infrastructure</li>
                <li><strong>Data Minimization:</strong> We collect only the data necessary for providing our services</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>Important:</strong> While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security but continuously work to enhance our security posture.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">6. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">Depending on your location, you may have the following rights regarding your personal data:</p>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">6.1 Access and Portability</h3>
              <p className="text-gray-700 mb-4">You can request a copy of your personal data in a machine-readable format (JSON/CSV). Contact us at privacy@groomlinkgh.com.</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.2 Correction</h3>
              <p className="text-gray-700 mb-4">You can update your profile information directly in the app. For corrections to other data, contact us.</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.3 Deletion (Right to be Forgotten)</h3>
              <p className="text-gray-700 mb-4">You can request complete deletion of your account and associated data. Some data may be retained for legitimate business or legal purposes (e.g., completed bookings for dispute resolution) as outlined in Section 7.</p>
              <p className="text-gray-700 mb-4">
                <Link to="/delete-account" className="inline-flex items-center text-blue-600 hover:text-blue-700 underline font-medium">
                  <Icon name="delete" size={18} className="mr-1" />
                  Request Account Deletion
                </Link>
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.4 Withdraw Consent</h3>
              <p className="text-gray-700 mb-4">You can withdraw consent for data processing at any time by:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Disabling location services in your device settings</li>
                <li>Turning off push notifications</li>
                <li>Revoking camera/photo permissions</li>
                <li>Contacting us to opt out of marketing communications</li>
              </ul>
              <p className="text-gray-700 mb-4">Withdrawing consent may limit your ability to use certain features.</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.5 Objection and Restriction</h3>
              <p className="text-gray-700 mb-4">You can object to processing of your data for marketing purposes or request restriction of processing in certain circumstances.</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.6 How to Exercise Your Rights</h3>
              <p className="text-gray-700 mb-4">To exercise any of these rights, contact us at:</p>
              <div className="bg-ghana-green/5 p-4 rounded-lg border border-ghana-green/20 mb-4">
                <p className="text-gray-700"><strong>Email:</strong> privacy@groomlinkgh.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +233 59 371 1285 / +233 20 933 6689</p>
                <p className="text-gray-700"><strong>Address:</strong> Accra, Greater Accra, Ghana</p>
              </div>
              <p className="text-gray-700">
                We will respond to legitimate requests within 30 days. You may need to verify your identity before we process your request.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">7. Data Retention</h2>
              <p className="text-gray-700 mb-4">We retain your personal information only as long as necessary to fulfill the purposes for which it was collected:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
                <li><strong>Deleted Accounts:</strong> Upon account deletion request, personal data is removed within 30 days, except:</li>
                <ul className="list-circle list-inside ml-6 space-y-1">
                  <li>Completed booking records (retained for 2 years for dispute resolution)</li>
                  <li>Financial transaction records (retained for 7 years per tax regulations)</li>
                  <li>Anonymized analytics data (retained indefinitely for business intelligence)</li>
                </ul>
                <li><strong>Inactive Accounts:</strong> Accounts inactive for 12+ months may be deactivated and data anonymized</li>
                <li><strong>Legal Holds:</strong> Data may be retained longer if required by law or pending legal proceedings</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You can request account deletion at any time from the app settings or by contacting privacy@groomlinkgh.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">8. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                GroomLink is not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have inadvertently collected personal data from a child under 18, we will take steps to delete such information promptly.
              </p>
              <p className="text-gray-700">
                If you are a parent or guardian and believe your child has provided us with personal information, please contact us at privacy@groomlinkgh.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">9. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                GroomLink operates primarily in Ghana, but our services may involve data transfers to servers located outside your country of residence. Our servers are hosted on DigitalOcean infrastructure, which may include locations in the United States and other jurisdictions.
              </p>
              <p className="text-gray-700 mb-4">
                When we transfer your data internationally, we ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Encryption of data in transit (TLS 1.2+)</li>
                <li>Contracts with service providers incorporating standard contractual clauses</li>
                <li>Compliance with applicable data protection laws</li>
              </ul>
              <p className="text-gray-700 mt-4">
                By using our services, you consent to the transfer of your data to countries that may have different data protection standards than your country of residence.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">10. Third-Party Links and Services</h2>
              <p className="text-gray-700 mb-4">
                Our app may contain links to third-party websites or services (e.g., salon websites, social media pages, payment providers). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
              </p>
              <p className="text-gray-700">
                Specifically, our integration with Google Maps is subject to <a href="https://policies.google.com/privacy" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>, and payment processing is subject to <a href="https://paystack.com/privacy" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Paystack's Privacy Policy</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">11. Google Play Data Safety Disclosure</h2>
              <p className="text-gray-700 mb-4">
                In compliance with Google Play Developer Program requirements, we provide the following data safety information:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">Data Collected and Shared:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li><strong>Location:</strong> Approximate and precise location (with user consent)</li>
                  <li><strong>Personal Info:</strong> Name, email address, phone number</li>
                  <li><strong>Financial Info:</strong> Payment information (processed by Paystack, not stored by us)</li>
                  <li><strong>Photos/Videos:</strong> Profile photos, salon images (with user consent)</li>
                  <li><strong>App Activity:</strong> App interactions, in-app search history, booking history</li>
                  <li><strong>Device IDs:</strong> For app functionality and fraud prevention</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">Security Practices:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Data is encrypted in transit (TLS 1.2+)</li>
                  <li>Data is encrypted at rest (AES-256)</li>
                  <li>You can request data deletion</li>
                  <li>We undergo regular security reviews</li>
                </ul>
              </div>
              <p className="text-gray-700">
                This privacy policy provides more detailed information about our data practices than the Google Play Data Safety form.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Update the "Last updated" date at the top of this policy</li>
                <li>Notify you via email (if you have provided one)</li>
                <li>Display a prominent notice in our app</li>
                <li>Require renewed consent if required by applicable law</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We encourage you to review this policy regularly to stay informed about how we protect your information. Your continued use of our services after changes are posted constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">13. Contact Us</h2>
              <p className="text-gray-700 mb-4">If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us:</p>
              <div className="bg-ghana-green/5 p-4 rounded-lg border border-ghana-green/20">
                <p className="text-gray-700 mb-2"><strong>Company:</strong> GroomLink Ghana (Arthium Labs LLC)</p>
                <p className="text-gray-700 mb-2"><strong>Email:</strong> privacy@groomlinkgh.com</p>
                <p className="text-gray-700 mb-2"><strong>Support:</strong> support@groomlinkgh.com</p>
                <p className="text-gray-700 mb-2"><strong>Phone:</strong> +233 59 371 1285 / +233 20 933 6689</p>
                <p className="text-gray-700 mb-2"><strong>Address:</strong> Accra, Greater Accra Region, Ghana</p>
                <p className="text-gray-700"><strong>Website:</strong> <a href="https://groomlinkgh.com" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://groomlinkgh.com</a></p>
              </div>
              <p className="text-gray-700 mt-4">
                If you are not satisfied with our response, you have the right to lodge a complaint with the Data Protection Commission of Ghana or your local data protection authority.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} GroomLink. All rights reserved. Made with ❤️ in Ghana.
          </p>
        </div>
      </footer>
    </div>
  )
}
