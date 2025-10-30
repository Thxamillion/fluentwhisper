import { useQuery } from '@tanstack/react-query'
import { DesktopSubscriptionService } from '@/services/subscription'
import { useAuth } from '@/hooks/auth'

export function useSubscription() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => DesktopSubscriptionService.getStatus(),
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1
  })
}
