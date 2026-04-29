import { useQuery } from '@tanstack/react-query'
import { fetchCurrentActor } from '../api/system.ts'

export function useCurrentActor() {
  return useQuery({
    queryKey: ['current-actor'],
    queryFn: fetchCurrentActor,
    staleTime: 5 * 60_000,
  })
}
