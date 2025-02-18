import { defineStore } from 'pinia';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const initialized = ref(false);
  const router = useRouter();

  // Initialize auth state listener
  onAuthStateChanged(auth, 
    (newUser) => {
      user.value = newUser;
      initialized.value = true;
      loading.value = false;
      error.value = null;
    },
    (err) => {
      console.error('Auth state change error:', err);
      initialized.value = true;
      loading.value = false;
      error.value = err?.message || 'Authentication error occurred';
    }
  );

  const register = async (email: string, password: string) => {
    try {
      loading.value = true;
      error.value = null;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user.value = userCredential.user;
      return true;
    } catch (err: any) {
      console.error('Registration error:', err);
      error.value = err?.message || 'Failed to create account';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      loading.value = true;
      error.value = null;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      user.value = userCredential.user;
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      error.value = err?.message || 'Failed to sign in';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      user.value = null;
      return true;
    } catch (err: any) {
      console.error('Logout error:', err);
      error.value = err?.message || 'Failed to sign out';
      return false;
    }
  };

  return {
    user,
    loading,
    error,
    initialized,
    register,
    login,
    logout
  };
});