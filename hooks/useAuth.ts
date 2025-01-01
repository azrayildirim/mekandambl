import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>({
    uid: 'test-user-id',
    email: 'test@example.com',
  } as User);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        setUser(user);
      } else {
        // Test için kaldırın
        // setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  return { user };
}; 