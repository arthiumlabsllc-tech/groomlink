import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 page-enter">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 mb-6">
            <Icon name="explore_off" size={64} className="text-gray-300" />
          </div>
        </div>

        {/* 404 Text */}
        <h1 className="text-8xl font-bold text-gradient mb-4">404</h1>

        {/* Description */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* CTA Button */}
        <Link
          to="/"
          className="btn-ripple inline-flex items-center gap-2 px-6 py-3 bg-ghana-green text-white font-semibold rounded-xl hover:bg-ghana-green/90 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Icon name="dashboard" size={20} />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
