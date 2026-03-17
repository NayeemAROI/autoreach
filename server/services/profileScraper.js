/**
 * Server-side LinkedIn Profile Scraper
 * Uses LinkedIn Voyager API with session cookies to fetch profile data
 * No browser/extension tab opening required
 */

const bridge = require('./linkedinBridge');

class ProfileScraper {
  constructor() {
    this.baseUrl = 'https://www.linkedin.com';
    this.apiBase = 'https://www.linkedin.com/voyager/api';
  }

  /**
   * Extract the profile slug from a LinkedIn URL
   * e.g. "https://www.linkedin.com/in/john-doe/" => "john-doe"
   */
  extractProfileId(linkedinUrl) {
    if (!linkedinUrl) return null;
    const match = linkedinUrl.match(/\/in\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get stored session cookies for a user
   */
  getSession(userId) {
    const sess = bridge.session;
    // Use the stored session (synced from extension)
    if (sess && sess.li_at && sess.JSESSIONID) {
      return { li_at: sess.li_at, JSESSIONID: sess.JSESSIONID };
    }
    return null;
  }

  /**
   * Fetch a LinkedIn profile entirely server-side using Voyager API
   */
  async scrapeProfile(linkedinUrl, userId) {
    const profileId = this.extractProfileId(linkedinUrl);
    if (!profileId) {
      throw new Error(`Invalid LinkedIn URL: ${linkedinUrl}`);
    }

    const session = this.getSession(userId);
    if (!session) {
      throw new Error('No LinkedIn session available. Please connect the extension and log into LinkedIn first.');
    }

    console.log(`🔍 [ProfileScraper] Fetching profile: ${profileId}`);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/vnd.linkedin.normalized+json+2.1',
      'Accept-Language': 'en-US,en;q=0.9',
      'x-li-lang': 'en_US',
      'x-restli-protocol-version': '2.0.0',
      'csrf-token': session.JSESSIONID,
      'Cookie': `li_at=${session.li_at}; JSESSIONID="${session.JSESSIONID}"`,
    };

    try {
      // Fetch the main profile data
      const profileData = await this.fetchProfileAPI(profileId, headers);
      
      // Add a small delay to be respectful
      await new Promise(r => setTimeout(r, 500));

      // Fetch contact info if possible
      let contactInfo = {};
      try {
        contactInfo = await this.fetchContactInfo(profileId, headers);
      } catch (e) {
        console.log(`🔍 [ProfileScraper] Could not fetch contact info: ${e.message}`);
      }

      return {
        ...profileData,
        ...contactInfo,
        linkedinUrl: linkedinUrl,
        profileId: profileId,
      };
    } catch (err) {
      console.error(`🔍 [ProfileScraper] Error fetching ${profileId}:`, err.message);
      throw err;
    }
  }

  /**
   * Fetch profile data from LinkedIn Voyager API
   */
  async fetchProfileAPI(profileId, headers) {
    const url = `${this.apiBase}/identity/profiles/${profileId}/profileView`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('LinkedIn session expired. Please re-login on LinkedIn.');
      }
      if (response.status === 404) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      if (response.status === 429) {
        throw new Error('LinkedIn rate limit reached. Please wait and try again.');
      }
      throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseProfileResponse(data, profileId);
  }

  /**
   * Parse the Voyager API response into a clean profile object
   */
  parseProfileResponse(data, profileId) {
    const result = {
      firstName: '',
      lastName: '',
      title: '',
      company: '',
      location: '',
      about: '',
      avatar: '',
      connectionDegree: '',
      isPremium: false,
    };

    try {
      // The included array contains all the entities
      const included = data.included || [];
      
      // Find the main profile entity
      const profile = included.find(item =>
        item.$type === 'com.linkedin.voyager.identity.profile.Profile' ||
        (item.publicIdentifier && item.publicIdentifier === profileId)
      );

      if (profile) {
        result.firstName = profile.firstName || '';
        result.lastName = profile.lastName || '';
        result.title = profile.headline || '';
        result.location = profile.locationName || profile.geoLocationName || '';
        result.about = (profile.summary || '').substring(0, 500);
        result.isPremium = !!profile.premium;
      }

      // Find profile picture
      const picture = included.find(item =>
        item.$type === 'com.linkedin.common.VectorImage' ||
        (item.artifacts && item.rootUrl)
      );
      if (picture && picture.rootUrl && picture.artifacts) {
        // Get the largest artifact
        const largest = picture.artifacts
          .sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        if (largest) {
          result.avatar = picture.rootUrl + largest.fileIdentifyingUrlPathSegment;
        }
      }

      // Find current position for company
      const positions = included.filter(item =>
        item.$type === 'com.linkedin.voyager.identity.profile.Position'
      );
      // Current position = no end date
      const currentPosition = positions.find(pos => !pos.timePeriod?.endDate);
      if (currentPosition) {
        result.company = currentPosition.companyName || '';
        // If no headline, use position title
        if (!result.title && currentPosition.title) {
          result.title = currentPosition.title;
        }
      } else if (positions.length > 0) {
        result.company = positions[0].companyName || '';
      }

      // Parse from headline if company not found
      if (!result.company && result.title) {
        const atMatch = result.title.match(/(?:at|@)\s+(.+)$/i);
        if (atMatch) {
          result.company = atMatch[1].trim();
        }
      }

      // Find the miniProfile for connection degree
      const miniProfile = included.find(item =>
        item.$type === 'com.linkedin.voyager.identity.shared.MiniProfile' &&
        item.publicIdentifier === profileId
      );
      
      if (miniProfile) {
        if (!result.firstName && miniProfile.firstName) result.firstName = miniProfile.firstName;
        if (!result.lastName && miniProfile.lastName) result.lastName = miniProfile.lastName;
        if (!result.title && miniProfile.occupation) result.title = miniProfile.occupation;
        
        // Avatar from miniProfile
        if (!result.avatar && miniProfile.picture) {
          const pic = miniProfile.picture;
          if (pic.rootUrl && pic.artifacts) {
            const largest = pic.artifacts.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
            if (largest) {
              result.avatar = pic.rootUrl + largest.fileIdentifyingUrlPathSegment;
            }
          }
        }
      }

      // Connection degree from data
      const networkInfo = included.find(item =>
        item.$type === 'com.linkedin.voyager.identity.profile.NetworkInfo' ||
        item.distance
      );
      if (networkInfo && networkInfo.distance) {
        const distVal = networkInfo.distance.value || '';
        if (distVal === 'DISTANCE_1') result.connectionDegree = '1st';
        else if (distVal === 'DISTANCE_2') result.connectionDegree = '2nd';
        else if (distVal === 'DISTANCE_3') result.connectionDegree = '3rd';
      }

    } catch (err) {
      console.error(`🔍 [ProfileScraper] Parse error:`, err);
    }

    return result;
  }

  /**
   * Fetch contact info (email, phone, etc.)
   */
  async fetchContactInfo(profileId, headers) {
    const url = `${this.apiBase}/identity/profiles/${profileId}/profileContactInfo`;
    const response = await fetch(url, { headers });

    if (!response.ok) return {};

    const data = await response.json();
    const result = {};

    if (data.emailAddress) result.email = data.emailAddress;
    if (data.phoneNumbers && data.phoneNumbers.length > 0) {
      result.phone = data.phoneNumbers[0].number;
    }
    if (data.websites && data.websites.length > 0) {
      result.website = data.websites[0].url;
    }

    return result;
  }
}

module.exports = new ProfileScraper();
