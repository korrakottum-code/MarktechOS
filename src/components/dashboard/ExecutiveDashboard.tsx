"use client";

import type { Lead, SalesDeal, OperationTask } from "@/lib/app-data-types";
import { formatCurrency } from "@/lib/app-utils";
import { 
  Users, 
  Target, 
  DollarSign, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Activity,
  Zap
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Props {
  leads: Lead[];
  deals: SalesDeal[];
  tasks: OperationTask[];
  stats: {
    crm: any;
    sales: any;
  };
}

export default function ExecutiveDashboard({ leads, deals, tasks, stats }: Props) {
  // Funnel Data
  const funnelData = [
    { name: 'Leads', value: leads.length, color: '#60A5FA' },
    { name: 'Contacted', value: leads.filter(l => l.status !== 'new').length, color: '#A78BFA' },
    { name: 'Deals', value: deals.length, color: '#FBBF24' },
    { name: 'Won', value: deals.filter(d => d.stage === 'won').length, color: '#10B981' },
  ];

  // Efficiency Metrics
  const taskCompletionRate = Math.round((tasks.filter(t => t.status === 'done').length / (tasks.length || 1)) * 100);
  const salesWinRate = Math.round((deals.filter(d => d.stage === 'won').length / (deals.length || 1)) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-navy-900/50 backdrop-blur-sm border border-gold-500/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={80} className="text-gold-400" />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-foreground-muted mb-1">Total Revenue (Won)</p>
            <h3 className="text-3xl font-bold text-gold-400">{formatCurrency(stats.sales.wonValue)}</h3>
            <p className="text-xs text-foreground-muted mt-4">{stats.sales.wonDeals} deals closed</p>
          </div>
        </div>

        <div className="bg-navy-900/50 backdrop-blur-sm border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={80} className="text-blue-400" />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-foreground-muted mb-1">Operation Efficiency</p>
            <h3 className="text-3xl font-bold text-blue-400">{taskCompletionRate}%</h3>
            <p className="text-xs text-foreground-muted mt-4">Completion of {tasks.length} active tasks</p>
          </div>
        </div>

        <div className="bg-navy-900/50 backdrop-blur-sm border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={80} className="text-purple-400" />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-foreground-muted mb-1">Sales Conversion</p>
            <h3 className="text-3xl font-bold text-purple-400">{salesWinRate}%</h3>
            <p className="text-xs text-foreground-muted mt-4">Deal conversion velocity is high</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="bg-navy-900 border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="text-gold-400" size={20} />
              Business Funnel Analysis
            </h4>
            <span className="text-xs text-foreground-muted bg-navy-800 px-2 py-1 rounded">Live Data</span>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center (Simulated Integrations) */}
        <div className="bg-navy-900 border border-border rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Activity className="text-blue-400" size={20} />
            Smart Insights & Triggers
          </h4>
          
          <div className="space-y-4">
            <div className="p-4 bg-navy-800/50 rounded-xl border border-border/50 hover:border-gold-400/30 transition-colors cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gold-400/10 flex items-center justify-center text-gold-400">
                  <Zap size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-gold-400 transition-colors">Deal to Onboarding Automation</p>
                  <p className="text-xs text-foreground-muted mt-1">Marking a deal as "Won" now triggers 3-5 implementation tasks in Kanban board.</p>
                </div>
                <ArrowRight size={16} className="text-foreground-muted group-hover:translate-x-1 transition-transform mt-1" />
              </div>
            </div>

            <div className="p-4 bg-navy-800/50 rounded-xl border border-border/50 hover:border-blue-400/30 transition-colors cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400">
                  <Users size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors">Lead Velocity Alert</p>
                  <p className="text-xs text-foreground-muted mt-1">{leads.filter(l => l.status === 'new').length} New leads require assignment. High conversion risk detected.</p>
                </div>
                <ArrowRight size={16} className="text-foreground-muted group-hover:translate-x-1 transition-transform mt-1" />
              </div>
            </div>

            <div className="p-4 bg-navy-800/50 rounded-xl border border-border/50 hover:border-purple-400/30 transition-colors cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-400/10 flex items-center justify-center text-purple-400">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-purple-400 transition-colors">Quality Control Loop</p>
                  <p className="text-xs text-foreground-muted mt-1">{tasks.filter(t => t.status === 'review').length} Tasks pending review. Approval will trigger client notification.</p>
                </div>
                <ArrowRight size={16} className="text-foreground-muted group-hover:translate-x-1 transition-transform mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
