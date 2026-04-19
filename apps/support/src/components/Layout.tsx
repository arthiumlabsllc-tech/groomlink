import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-0 md:ml-64 min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8 pt-20 md:pt-6 overflow-x-hidden">
            <div className="page-enter">
              {children}
            </div>
          </main>
          
          {/* Footer */}
          <footer className="py-3 text-center border-t border-gray-200 bg-white/80 backdrop-blur-sm">
            <a 
              href="#" 
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              An Arthium Labs Product
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}
