import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 page-enter">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-50 mb-6">
            <Icon name="explore_off" size={64} className="text-gray-300" />
          </div>
          <h1 className="text-8xl font-bold text-gradient mb-4 font-heading">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 font-heading">Page Not Found</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <Link
          to="/"
          className="btn-ripple inline-flex items-center gap-2 px-6 py-3 bg-ghana-green text-white font-semibold rounded-xl hover:bg-support-700 transition-all duration-200 shadow-lg shadow-ghana-green/25 active:scale-[0.98]"
        >
          <Icon name="home" size={20} />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
