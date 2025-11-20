class TokenUtils {
  constructor() {
    this.config = require('../config.js');
    this.authService = require('../services/auth.service.js').default;
    this.apiUrl = `${this.config.apiUrl}/api/auth`;
  }

  async refreshToken() {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('No token available for refresh');
      }
      
      const response = await fetch(`${this.apiUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      this.authService.setToken(data.token);
      return data.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.authService.logout();
      throw error;
    }
  }

  async ensureValidToken() {
    // This is a simple implementation - in a real app, you might want to check token expiration
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('No token available');
    }
    
    // You could add logic here to check if token is expired and refresh it
    return token;
  }
}

// Create a singleton instance
const tokenUtils = new TokenUtils();
export default tokenUtils;