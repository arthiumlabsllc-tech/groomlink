import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';

export function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-24 h-24 bg-[#CE1126]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="lock" size={48} className="text-[#CE1126]" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="btn-ripple px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
          >
            <Icon name="arrow_back" size={18} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ripple px-6 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] font-medium transition-colors flex items-center gap-2"
          >
            <Icon name="dashboard" size={18} />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
