/**
 * All Users Summary Component
 * Gamified KPI cards showing user statistics
 */

import React from 'react';
import { Users, Building2, Home, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ComprehensiveUser } from '@/hooks/useAllUsers';

interface AllUsersSummaryProps {
  users: ComprehensiveUser[];
  filteredUsers: ComprehensiveUser[];
}

export function AllUsersSummary({ users, filteredUsers }: AllUsersSummaryProps) {
  const totalUsers = users.length;
  const facilityUsers = users.filter(u => u.facility !== null).length;
  const soloUsers = users.filter(u => u.facility === null).length;
  const superUsers = users.filter(u => u.is_superuser).length;

  const isFiltered = filteredUsers.length !== users.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-gradient-to-br from-blue-500 to-indigo-400 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="flex items-center justify-between mb-2">
          <Users className="w-8 h-8 opacity-80" />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            Total
          </span>
        </div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
          className="text-4xl font-bold mb-1"
        >
          {isFiltered ? filteredUsers.length : totalUsers}
        </motion.div>
        <div className="text-sm opacity-90">
          {isFiltered ? `of ${totalUsers} users` : 'total users'}
        </div>
      </motion.div>

      {/* Facility Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-gradient-to-br from-green-500 to-teal-400 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="flex items-center justify-between mb-2">
          <Building2 className="w-8 h-8 opacity-80" />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            Facilities
          </span>
        </div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
          className="text-4xl font-bold mb-1"
        >
          {facilityUsers}
        </motion.div>
        <div className="text-sm opacity-90">
          in facilities
        </div>
      </motion.div>

      {/* Solo Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="flex items-center justify-between mb-2">
          <Home className="w-8 h-8 opacity-80" />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            Solo
          </span>
        </div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5, type: 'spring' }}
          className="text-4xl font-bold mb-1"
        >
          {soloUsers}
        </motion.div>
        <div className="text-sm opacity-90">
          solo users
        </div>
      </motion.div>

      {/* SuperUsers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="flex items-center justify-between mb-2">
          <Shield className="w-8 h-8 opacity-80" />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            Admins
          </span>
        </div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
          className="text-4xl font-bold mb-1"
        >
          {superUsers}
        </motion.div>
        <div className="text-sm opacity-90">
          superusers
        </div>
      </motion.div>
    </div>
  );
}

