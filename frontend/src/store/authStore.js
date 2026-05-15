import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Zustand Auth Store — JWT token + user info persist kare che localStorage ma
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      business: null,
      isAuthenticated: false,

      /** Login thi token + user set karo */
      setAuth: (token, user, business) =>
        set({ token, user, business, isAuthenticated: true }),

      /** Logout — sab clear karo */
      logout: () => {
        set({ token: null, user: null, business: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      },

      /** Token get karo (interceptor use kare) */
      getToken: () => get().token,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        business: state.business,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
