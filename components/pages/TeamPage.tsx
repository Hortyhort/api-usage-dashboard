import type { TeamMember } from '../../types/dashboard';
import { Icons } from '../icons';
import { formatNumber } from '../../lib/formatters';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../ui/ToastProvider';

const TeamPage = ({ teamMembers }: { teamMembers: TeamMember[] }) => {
  const { addToast } = useToast();

  const handleInvite = () => {
    addToast({
      title: 'Invite sent',
      description: 'Connect this action to invite collaborators via email.',
      variant: 'info',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Team</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Manage team members and permissions</p>
        </div>
        <button type="button" onClick={handleInvite} className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-violet-500/25">
          <Icons.Plus />
          Invite Member
        </button>
      </div>

      {teamMembers.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Invite teammates to collaborate on usage monitoring."
          action={
            <button type="button" onClick={handleInvite} className="bg-violet-500/20 text-violet-300 px-4 py-2 rounded-lg text-sm font-medium">
              Invite member
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="glass-card glass-border rounded-2xl p-5 hover:bg-white/[0.03] transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-lg font-semibold text-white">
                  {member.avatar}
                </div>
                <div>
                  <div className="text-white font-medium">{member.name}</div>
                  <div className="text-xs text-slate-500">{member.email}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${member.role === 'Owner' ? 'bg-amber-500/10 text-amber-400' : member.role === 'Admin' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {member.role}
                </span>
                <div className="text-right">
                  <div className="text-white font-medium tabular-nums">{formatNumber(member.usage)}</div>
                  <div className="text-xs text-slate-500">tokens</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamPage;
