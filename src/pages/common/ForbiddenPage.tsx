import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">403 — Access Denied</h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md leading-relaxed">
        You do not have permission to access this resource. This screen requires administrative Owner privileges or specific operational permissions.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ForbiddenPage;
