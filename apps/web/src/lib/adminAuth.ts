import { queryClient } from './query';
import { createSession } from './session';

// Its own key: a member tab stays signed in
const admin = createSession('adminToken');

export const getAdminToken = admin.get;
export const setAdminToken = admin.set;
export const useAdminToken = admin.use;

export function adminSignOut() {
  setAdminToken(null);
  queryClient.clear();
}
