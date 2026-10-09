import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import portfolioRequest from '@/lib/portfolioRequest';
export default function useSectionAlerts() {
  const { user } = useAuth(), { pathname } = useLocation(), client = useQueryClient();
  const key = ['section-alerts', user?.id];
  const query = useQuery({ queryKey: key, enabled: !!user, staleTime: 5000, refetchInterval: 30000, retry: false, queryFn: async () => (await portfolioRequest(() => base44.functions.invoke('getSectionAlerts', { visited_path: pathname }))).data });
  useEffect(() => { if (user) query.refetch({ cancelRefetch: false }); }, [pathname, user?.id]);
  useEffect(() => {
    if (!user) return;
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => client.invalidateQueries({ queryKey: ['section-alerts', user.id] }, { cancelRefetch: false }), 1500);
    };
    const unsubscribes = ['Notification', 'Application', 'Maintenance', 'ChatMessage', 'Document', 'Inspection', 'VacationRequest', 'Feedback', 'Notice', 'RentCharge', 'ReportRequest'].map(name => base44.entities[name].subscribe(refresh));
    return () => { clearTimeout(timer); unsubscribes.forEach(unsubscribe => unsubscribe()); };
  }, [user?.id, client]);
  return { counts: query.data?.counts || {}, unread: query.data?.unread || 0, loading: query.isLoading, error: query.error };
}