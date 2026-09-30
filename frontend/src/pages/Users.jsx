import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { userService } from '../services/users';
import { useAuth } from '../context/AuthContext';
import {
  Users as UsersIcon,
  ShieldCheck,
  Lock,
  RefreshCw,
  Mail,
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
      setError('Unable to load user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const handleDeactivate = async (userId, email) => {
    if (!confirm(`Are you sure you want to deactivate ${email}? Session tokens will be revoked.`)) {
      return;
    }
    try {
      await userService.deactivateUser(userId);
      setActionSuccess(`User ${email} deactivated.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      alert('Failed to deactivate user.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userService.updateUser(userId, { role: newRole });
      setActionSuccess(`Updated role to ${newRole.toUpperCase()}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      fetchUsers();
    } catch (err) {
      console.error('Failed to change role:', err);
      alert('Failed to update role.');
    }
  };

  const getRoleBadgeClass = (userRole) => {
    const r = (userRole || 'viewer').toLowerCase();
    if (r === 'admin') return 'border-[#7895B2]/40 bg-[#7895B2]/10 text-[#7895B2]';
    if (r === 'analyst') return 'border-[#71A99D]/40 bg-[#71A99D]/10 text-[#71A99D]';
    return 'border-[#2A3944] bg-[#202D36] text-[#9AA8B2]';
  };

  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between bg-[#19242E] border border-[#2A3944] p-5 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">User Management</h1>
              <p className="text-xs text-[#9AA8B2] font-sans">Operator access controls and permissions</p>
            </div>
          </div>
        </div>

        <div className="p-12 text-center bg-[#19242E] border border-[#2A3944] rounded-lg space-y-3 max-w-xl mx-auto">
          <div className="p-3 bg-[#DF857C]/15 border border-[#DF857C]/30 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-[#DF857C]">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#E7ECEF] font-sans">Administrator Access Required</h3>
          <p className="text-xs text-[#9AA8B2] leading-relaxed font-sans">
            User administration requires the MANAGE_USERS capability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#19242E] border border-[#2A3944] text-[#71A99D] text-xs font-medium px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#19242E] border border-[#2A3944] p-5 rounded-lg shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">User & Access Management</h1>
            <p className="text-xs text-[#9AA8B2] font-sans">Operator credentials, role assignments, and account authorization</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={isLoading}
          className="text-xs border-[#2A3944] bg-[#101820] hover:bg-[#202D36] text-[#E7ECEF] flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Clean Table: Operator | Role | Status */}
      {isLoading ? (
        <div className="p-12 text-center text-[#9AA8B2] space-y-3">
          <div className="w-7 h-7 border-2 border-[#2A3944] border-t-[#71A99D] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-sans">Loading accounts...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-[#19242E] border border-[#DF857C]/40 rounded-lg text-[#DF857C] text-xs font-sans">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1.5" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#2A3944] bg-[#19242E]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#131D25] border-b border-[#2A3944] text-[#9AA8B2] uppercase tracking-wider text-[11px] font-sans font-medium">
              <tr>
                <th className="py-2.5 px-4">Operator</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3944]/50">
              {users.map((u) => {
                const roleClass = getRoleBadgeClass(u.role);
                return (
                  <tr key={u.id} className="hover:bg-[#202D36] transition-colors">
                    {/* Operator Email */}
                    <td className="py-3 px-4 font-mono font-medium text-[#E7ECEF]">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#687883]" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    {/* Role Pill */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-sans font-medium uppercase tracking-wide ${roleClass}`}
                        >
                          {u.role}
                        </span>

                        {/* Dropdown for Role Modification */}
                        <select
                          value={u.role?.toLowerCase()}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-[#101820] border border-[#2A3944] rounded px-1.5 py-0.5 text-[10px] text-[#9AA8B2] font-sans focus:outline-none focus:border-[#71A99D] cursor-pointer"
                        >
                          <option value="admin">ADMIN</option>
                          <option value="analyst">ANALYST</option>
                          <option value="viewer">VIEWER</option>
                        </select>
                      </div>
                    </td>

                    {/* Status: ● ACTIVE in #71A99D */}
                    <td className="py-3 px-4 font-sans text-xs">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[#71A99D] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#71A99D]" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#DF857C] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DF857C]" />
                          DEACTIVATED
                        </span>
                      )}
                    </td>

                    {/* Action button */}
                    <td className="py-3 px-4 text-right">
                      {u.is_active && (
                        <button
                          onClick={() => handleDeactivate(u.id, u.email)}
                          className="text-xs h-7 px-2.5 rounded border border-[#DF857C]/30 text-[#DF857C] hover:bg-[#DF857C]/15 transition-colors font-sans cursor-pointer"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Users;
