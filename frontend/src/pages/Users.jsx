import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { userService } from '../services/users';
import { useAuth } from '../context/AuthContext';
import {
  Users as UsersIcon,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  RefreshCw,
  Mail,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

export const Users = () => {
  const { role, hasCapability } = useAuth();
  const isAdmin = hasCapability('MANAGE_USERS') || role === 'admin';

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await userService.listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch user list:', err);
      setError('Unable to load user accounts from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const handleDeactivate = async (userId, email) => {
    if (!confirm(`Are you sure you want to deactivate ${email}? Refresh token will be revoked immediately; active access tokens expire naturally within 15 minutes.`)) {
      return;
    }
    try {
      await userService.deactivateUser(userId);
      setActionSuccess(`User ${email} deactivated. Refresh revoked; active access tokens expire within ≤15m.`);
      setTimeout(() => setActionSuccess(null), 5000);
      fetchUsers();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      alert('Failed to deactivate user.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userService.updateUser(userId, { role: newRole });
      setActionSuccess(`Updated user role to ${newRole.toUpperCase()}.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers();
    } catch (err) {
      console.error('Failed to change role:', err);
      alert('Failed to update role.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-purple-400">
              <UsersIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">User & Access Management</h1>
              <p className="text-xs text-slate-400">Administrator role and capability assignments.</p>
            </div>
          </div>
        </div>

        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-4 max-w-xl mx-auto">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Administrator Access Required</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            User administration is strictly restricted to accounts with the <span className="font-mono text-cyan-400">MANAGE_USERS</span> capability. Your account (<span className="font-mono uppercase text-purple-300">{role || 'Viewer'}</span>) is not permitted to view or modify operator credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <ShieldCheck className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-purple-400">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">User & Access Management</h1>
            <p className="text-xs text-slate-400">RBAC role assignments, account status, and session deactivation controls.</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={isLoading}
          className="text-xs border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Users
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Loading operator accounts...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Operator Email / Identity</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-200">{u.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role?.toLowerCase()}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
                    >
                      <option value="admin">ADMIN</option>
                      <option value="analyst">ANALYST</option>
                      <option value="viewer">VIEWER</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <UserCheck className="w-3.5 h-3.5" /> ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold">
                        <UserX className="w-3.5 h-3.5" /> DEACTIVATED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.is_active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeactivate(u.id, u.email)}
                        className="text-xs h-7 px-2.5 bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/40"
                      >
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Users;
