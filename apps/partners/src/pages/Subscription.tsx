import Layout from '../components/Layout'
import SubscriptionStatus from '../components/SubscriptionStatus'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'

export default function Subscription() {
  return (
    <Layout activeTab="subscription">
      <div className="page-enter max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription</h1>
          <p className="text-sm text-gray-500">Manage your plan and billing</p>
        </div>

        {/* Subscription status card */}
        <div className="mb-8">
          <SubscriptionStatus />
        </div>

        {/* Quick link to pricing */}
        <div className="card-v2 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ghana-green/10 rounded-xl flex items-center justify-center">
              <Icon name="upgrade" size={20} className="text-ghana-green" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Compare Plans</h3>
              <p className="text-xs text-gray-500">See all features and pricing options</p>
            </div>
          </div>
          <Link
            to="/pricing"
            className="text-sm font-semibold text-ghana-green hover:text-ghana-green/80 transition-colors flex items-center gap-1"
          >
            View Plans
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </Layout>
  )
}
