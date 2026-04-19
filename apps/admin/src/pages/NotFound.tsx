import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFound() {
  return (
    <div className="page-enter min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Icon name="explore_off" className="text-gray-300 mx-auto" size={64} />
        </div>
        <h1 className="text-8xl font-extrabold text-gradient mb-3">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="btn-ripple inline-flex items-center gap-2 px-6 py-3 bg-ghana-green text-white font-medium rounded-xl hover:bg-[#005a35] transition-colors duration-200"
        >
          <Icon name="home" className="w-5 h-5" size={20} />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
