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
          <p className="text-gray-600 mb-8">Last updated: April 2026</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                GroomLink ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile applications ("GroomLink Customer App" and "GroomLink Partners App") and website (groomlinkgh.com).
              </p>
              <p className="text-gray-700">
                By using our services, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Personal Information</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Account Information:</strong> Name, phone number, email address (optional)</li>
                <li><strong>Profile Information:</strong> Profile photo, preferences</li>
                <li><strong>Booking Information:</strong> Appointment history, salon preferences</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">For Salon Partners</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Business Information:</strong> Business name, address, contact details</li>
                <li><strong>Operational Data:</strong> Services offered, pricing, staff information</li>
                <li><strong>Financial Information:</strong> Payment details for payouts (processed securely by our payment partners)</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Location Data:</strong> With your permission, we collect your location to show nearby salons</li>
                <li><strong>Device Information:</strong> Device type, operating system, app version</li>
                <li><strong>Usage Data:</strong> How you interact with our app, features used</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the collected information for:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Providing and improving our services</li>
                <li>Processing bookings and payments</li>
                <li>Sending appointment reminders and notifications</li>
                <li>Communicating about your account and bookings</li>
                <li>Personalizing your experience</li>
                <li>Ensuring platform security and preventing fraud</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">4. Information Sharing</h2>
              <p className="text-gray-700 mb-4">We do not sell your personal information. We may share your information with:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Salon Partners:</strong> When you make a booking, relevant information is shared with the salon</li>
                <li><strong>Customers:</strong> Salon partners can see customer information for their bookings</li>
                <li><strong>Service Providers:</strong> Payment processors, cloud hosting, analytics services</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">5. Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate technical and organizational measures to protect your personal information, including encryption, secure servers, and regular security assessments. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">6. Your Rights</h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Withdraw consent for data processing</li>
                <li>Export your data in a portable format</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, contact us at privacy@groomlinkgh.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">7. Data Retention</h2>
              <p className="text-gray-700">
                We retain your personal information for as long as your account is active or as needed to provide services. You can request account deletion at any time. Some data may be retained for legal or legitimate business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">8. Children's Privacy</h2>
              <p className="text-gray-700">
                Our services are not intended for children under 18. We do not knowingly collect personal information from children under 18.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">9. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">10. Contact Us</h2>
              <p className="text-gray-700 mb-4">If you have questions about this Privacy Policy, contact us:</p>
              <div className="bg-ghana-green/5 p-4 rounded-lg border border-ghana-green/20">
                <p className="text-gray-700"><strong>Email:</strong> privacy@groomlinkgh.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +233 24 123 4567</p>
                <p className="text-gray-700"><strong>Address:</strong> Accra, Ghana</p>
              </div>
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
