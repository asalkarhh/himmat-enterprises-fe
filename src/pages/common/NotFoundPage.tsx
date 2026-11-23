import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">404 — Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md leading-relaxed">
        The page you requested does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
