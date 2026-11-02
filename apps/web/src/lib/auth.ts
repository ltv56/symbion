import { queryClient } from './query';
import { createSession } from './session';

const member = createSession('token');

export const getToken = member.get;
export const setToken = member.set;
export const useToken = member.use;

// Clear the cache too
export function signOut() {
  setToken(null);
  queryClient.clear();
}
