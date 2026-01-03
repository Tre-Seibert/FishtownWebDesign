const axios = require('axios');
require('dotenv').config();

class ZohoMailService {
  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    this.fromEmail = process.env.ZOHO_FROM_EMAIL;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get access token using refresh token
  async getAccessToken() {
    // If we have a valid access token, return it
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        null,
        {
          params: {
            refresh_token: this.refreshToken,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set token expiry (Zoho tokens typically last 1 hour)
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
      
      console.log('Zoho access token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoho Mail API');
    }
  }

  // Get account ID (needed for sending emails)
  async getAccountId() {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://mail.zoho.com/api/accounts', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        }
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].accountId;
      }

      throw new Error('No Zoho Mail accounts found');
    } catch (error) {
      console.error('Error fetching Zoho account ID:', error.response?.data || error.message);
      throw new Error('Failed to get Zoho Mail account information');
    }
  }

  // Send email via Zoho Mail API
  async sendEmail(toEmail, subject, htmlContent, textContent = '') {
    try {
      const token = await this.getAccessToken();
      const accountId = await this.getAccountId();

      const emailData = {
        fromAddress: this.fromEmail,
        toAddress: toEmail,
        subject: subject,
        content: htmlContent,
        mailFormat: 'html' // Explicitly set to HTML for proper rendering
      };

      const response = await axios.post(
        `https://mail.zoho.com/api/accounts/${accountId}/messages`,
        emailData,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Email sent successfully via Zoho Mail');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error sending email via Zoho:', error.response?.data || error.message);
      throw new Error('Failed to send email via Zoho Mail API');
    }
  }

  // Test connection to Zoho Mail API
  async testConnection() {
    try {
      const token = await this.getAccessToken();
      const accountId = await this.getAccountId();
      console.log('Zoho Mail API connection successful');
      console.log('Account ID:', accountId);
      return { success: true, accountId };
    } catch (error) {
      console.error('Zoho Mail API connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const zohoMailService = new ZohoMailService();
module.exports = zohoMailService;
