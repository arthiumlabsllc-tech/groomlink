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
        <div className="flex-1 ml-0 md:ml-64">
          <Header />
          <main className="p-4 md:p-6 pt-16 md:pt-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
