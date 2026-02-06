
import React, { useState } from 'react';
import { Page } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onLogout: () => void;
  user: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, setCurrentPage, onLogout, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: Page.CAR, label: 'Car', icon: 'fa-car' },
    { id: Page.PARKING_SLOT, label: 'Parking Slot', icon: 'fa-th' },
    { id: Page.PARKING_RECORD, label: 'Parking Record', icon: 'fa-history' },
    { id: Page.PAYMENT, label: 'Payment', icon: 'fa-money-bill' },
    { id: Page.ANALYTICS, label: 'Analytics', icon: 'fa-chart-line' },
    { id: Page.REPORTS, label: 'Reports', icon: 'fa-chart-bar' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-slate-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white transition-all duration-300 flex-shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <i className="fas fa-parking text-xl text-white"></i>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SmartPark</span>
        </div>
        
        <nav className="flex-1 mt-6 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                currentPage === item.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-5`}></i>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              {user.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-white">{user}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Manager</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors font-bold text-sm"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h1 className="text-lg font-bold text-slate-800 hidden md:block">
              {menuItems.find(i => i.id === currentPage)?.label} Management
            </h1>
            <span className="md:hidden font-bold text-blue-600">SmartPark</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500 font-bold">{new Date().toDateString()}</p>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-white absolute top-14 left-0 w-full z-50 border-t border-slate-800 shadow-xl">
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                    currentPage === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <i className={`fas ${item.icon} w-5`}></i>
                  <span className="font-bold">{item.label}</span>
                </button>
              ))}
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg font-bold"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            </nav>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
