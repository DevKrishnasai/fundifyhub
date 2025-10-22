export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[]; // Changed from role to roles array
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Clear authentication data (for client-side cleanup)
 */
export function clearAuthData(): void {
  // Clear any localStorage items (legacy cleanup)
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}

/**
 * Logout user (clears httpOnly cookies via API call)
 */
export async function logout(): Promise<void> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
    
    // Call logout endpoint to clear httpOnly cookies
    await fetch(`${apiUrl}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    // Clear any client-side data
    clearAuthData();
  }
}