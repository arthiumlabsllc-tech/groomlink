import { Layout } from './Dashboard'

export default function Reviews() {
  return (
    <Layout activeTab="reviews">
      <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
      <p className="text-gray-500 mt-1">Customer feedback and ratings</p>
      <div className="mt-6 card">
        <p className="text-gray-600">Review management coming soon...</p>
      </div>
    </Layout>
  )
}
