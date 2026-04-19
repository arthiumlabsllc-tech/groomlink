import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

interface UpgradePromptProps {
  feature: string
  description?: string
}

export default function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  const [showModal, setShowModal] = useState(false)

  // Determine which plan(s) include this feature
  const featureKey = feature.toLowerCase().replace(/\s+/g, '_')
  const proFeatures = [
    'instant_payouts', 'priority_support', 'advanced_analytics',
    'custom_branding', 'staff_management',
  ]
  const isProOnly = proFeatures.includes(featureKey)

  return (
    <>
      {/* Lock overlay */}
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {feature} is a Pro feature
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          {description || `Upgrade your plan to access ${feature} and grow your business with powerful tools.`}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-ghana-red text-white hover:bg-ghana-red/90 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Icon name="upgrade" size={18} />
          Upgrade to Access
        </button>
      </div>

      {/* Upgrade comparison modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full p-6 animate-scale-in">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Unlock {feature}</h3>
                <p className="text-sm text-gray-500 mt-1">Choose a plan that includes this feature</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon name="close" size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Plan comparison */}
            <div className="space-y-3 mb-6">
              {/* Pro plan */}
              <div className={`rounded-xl p-4 border-2 ${isProOnly ? 'border-ghana-green bg-ghana-green/5' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon name="verified" size={20} className="text-ghana-green" filled />
                    <span className="font-bold text-gray-900">Pro Plan</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">₵99<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Up to 5 staff • 2 locations • 3% transaction fee</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Instant Payouts', 'Priority Support', 'Advanced Analytics', 'Custom Branding', 'Staff Management'].map((f) => (
                    <span
                      key={f}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        f.toLowerCase().replace(/\s+/g, '_') === featureKey
                          ? 'bg-ghana-green text-white font-semibold'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
                {isProOnly && (
                  <div className="mt-3">
                    <span className="text-xs text-ghana-green font-semibold flex items-center gap-1">
                      <Icon name="check_circle" size={14} filled />
                      Includes {feature}
                    </span>
                  </div>
                )}
              </div>

              {/* Premium plan */}
              <div className={`rounded-xl p-4 border-2 ${!isProOnly ? 'border-ghana-gold bg-ghana-gold/5' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon name="workspace_premium" size={20} className="text-amber-600" filled />
                    <span className="font-bold text-gray-900">Premium Plan</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">₵299<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Unlimited staff • 10 locations • 1.5% transaction fee</p>
                <div className="flex flex-wrap gap-1.5">
                  {['All Pro Features', 'Multi-Location', 'Loyalty Program', 'Marketing Tools', 'API Access', 'Dedicated Manager'].map((f) => (
                    <span
                      key={f}
                      className={`text-xs px-2 py-0.5 rounded-full bg-ghana-gold/20 text-amber-700`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                    <Icon name="check_circle" size={14} filled />
                    Includes {feature} + all features
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm bg-ghana-red text-white hover:bg-ghana-red/90 shadow-md transition-all"
              onClick={() => setShowModal(false)}
            >
              <Icon name="upgrade" size={18} />
              View Plans & Upgrade
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
