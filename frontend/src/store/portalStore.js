import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const usePortalStore = create(
  persist(
    (set) => ({
      token:           null,
      customer:        null,
      business:        null,
      isAuthenticated: false,
      setPortalAuth: (token, customer, business) =>
        set({ token, customer, business, isAuthenticated: true }),
      logout: () =>
        set({ token: null, customer: null, business: null, isAuthenticated: false }),
    }),
    {
      name: 'portal-auth',
      partialize: (s) => ({ token:s.token, customer:s.customer, business:s.business, isAuthenticated:s.isAuthenticated }),
    }
  )
);
export default usePortalStore;