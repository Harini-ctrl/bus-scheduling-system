import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar — fixed on left */}
      <Sidebar />

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-56 min-h-screen flex flex-col">
        <Outlet />
        {/* Outlet renders the current page here */}
      </main>

    </div>
  );
}