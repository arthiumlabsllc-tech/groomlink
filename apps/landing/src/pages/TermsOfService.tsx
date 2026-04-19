import { Link } from 'react-router-dom'
import Icon from '../components/Icon'

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-display">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: April 2026</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By downloading, accessing, or using the GroomLink mobile applications ("GroomLink Customer App" and "GroomLink Partners App") or website (groomlinkgh.com), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                GroomLink is a platform that connects customers with barbershops and salons in Ghana. Our services include:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Discovery and search of salons and barbershops</li>
                <li>Online appointment booking</li>
                <li>Business management tools for salon owners</li>
                <li>Payment processing for services</li>
                <li>Reviews and ratings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">3. User Accounts</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Registration</h3>
              <p className="text-gray-700 mb-4">
                To use our services, you must register with a valid phone number. You are responsible for maintaining the confidentiality of your account and for all activities under your account.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Account Types</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Customer Account:</strong> For individuals seeking grooming services</li>
                <li><strong>Salon Partner Account:</strong> For salon owners and managers to list their business</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Account Termination</h3>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate accounts that violate these terms or for any other reason at our discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">4. Bookings and Payments</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Bookings</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Bookings are subject to availability</li>
                <li>Salons may have their own cancellation policies</li>
                <li>Customers should arrive on time for appointments</li>
                <li>Salons may refuse service to customers who are late</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Payments</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Prices displayed are in Ghana Cedis (GHS)</li>
                <li>Payments may be made through the app or directly at the salon</li>
                <li>GroomLink may charge a service fee for bookings made through the platform</li>
                <li>All payments are non-refundable unless otherwise specified</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">5. Salon Partner Terms</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Salon partners must provide accurate business information</li>
                <li>Salon partners are responsible for the quality of services provided</li>
                <li>Salon partners must honor bookings made through the platform</li>
                <li>Salon partners must maintain appropriate licenses and permits</li>
                <li>GroomLink charges a commission on bookings processed through the platform</li>
                <li>Salon partners may not solicit customers to bypass the platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">6. User Conduct</h2>
              <p className="text-gray-700 mb-4">Users agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide false information</li>
                <li>Create multiple accounts to circumvent restrictions</li>
                <li>Use the platform for illegal purposes</li>
                <li>Harass other users or staff</li>
                <li>Attempt to hack or disrupt the service</li>
                <li>Infringe on intellectual property rights</li>
                <li>Submit false reviews or ratings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">7. Reviews and Ratings</h2>
              <p className="text-gray-700">
                Users may submit reviews and ratings for salons and services. Reviews must be honest and based on actual experiences. GroomLink reserves the right to remove reviews that are false, defamatory, or violate our guidelines.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">8. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                All content, features, and functionality of GroomLink are owned by GroomLink and are protected by intellectual property laws.
              </p>
              <p className="text-gray-700">
                Salon partners retain ownership of their business name, logo, and service descriptions. By listing on GroomLink, they grant us a license to display this information on our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">9. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                GroomLink is a platform connecting customers with salons. We are not responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>The quality of services provided by salons</li>
                <li>Any injury, loss, or damage occurring at a salon</li>
                <li>Disputes between customers and salons</li>
                <li>Actions of third parties</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To the maximum extent permitted by law, GroomLink shall not be liable for any indirect, incidental, special, or consequential damages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">10. Dispute Resolution</h2>
              <p className="text-gray-700">
                Any disputes arising from the use of GroomLink shall be resolved through good faith negotiation. If negotiation fails, disputes shall be resolved in the courts of Ghana.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">11. Changes to Terms</h2>
              <p className="text-gray-700">
                We may update these Terms of Service from time to time. We will notify users of significant changes through the app or email. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ghana-green mb-4 font-display">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">For questions about these Terms of Service, contact us:</p>
              <div className="bg-ghana-green/5 p-4 rounded-lg border border-ghana-green/20">
                <p className="text-gray-700"><strong>Email:</strong> legal@groomlinkgh.com</p>
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
