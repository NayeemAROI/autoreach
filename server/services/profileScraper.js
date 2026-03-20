/**
 * Server-side LinkedIn Profile Scraper
 * Uses LinkedIn Voyager API with stored cookies — no extension needed
 */

const fetch = require('node-fetch');
const linkedinApi = require('./linkedinApi');

class ProfileScraper {
  constructor() {
    this.apiBase = 'https://www.linkedin.com/voyager/api';
  }

  extractProfileId(linkedinUrl) {
    if (!linkedinUrl) return null;
    const match = linkedinUrl.match(/\/in\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  getSession(userId) {
    // Use stored cookies from database (manually input by user)
    const cookie = linkedinApi.getCookie(userId);
    if (cookie && cookie.valid && cookie.li_at) {
      return { li_at: cookie.li_at, JSESSIONID: cookie.csrf };
    }
    return null;
  }

  async scrapeProfile(linkedinUrl, userId) {
    const profileId = this.extractProfileId(linkedinUrl);
    if (!profileId) {
      throw new Error(`Invalid LinkedIn URL: ${linkedinUrl}`);
    }

    const session = this.getSession(userId);
    if (!session) {
      throw new Error('No LinkedIn session available. Please add your li_at cookie in Settings.');
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
      const profileData = await this.fetchProfileAPI(profileId, headers);
      await new Promise(r => setTimeout(r, 500));

      let contactInfo = {};
      try {
        contactInfo = await this.fetchContactInfo(profileId, headers);
      } catch (e) {
        console.log(`🔍 [ProfileScraper] Could not fetch contact info: ${e.message}`);
      }

      return { ...profileData, ...contactInfo, linkedinUrl, profileId };
    } catch (err) {
      console.error(`🔍 [ProfileScraper] Error fetching ${profileId}:`, err.message);
      throw err;
    }
  }

  async fetchProfileAPI(profileId, headers) {
    const url = `${this.apiBase}/identity/profiles/${profileId}/profileView`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('LinkedIn session expired. Please update your li_at cookie.');
      }
      if (response.status === 404) throw new Error(`Profile not found: ${profileId}`);
      if (response.status === 429) throw new Error('LinkedIn rate limit reached.');
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseProfileResponse(data, profileId);
  }

  parseProfileResponse(data, profileId) {
    const result = {
      firstName: '', lastName: '', title: '', company: '',
      location: '', about: '', avatar: '', connectionDegree: '', isPremium: false,
    };

    try {
      const included = data.included || [];
      
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

      const picture = included.find(item => item.artifacts && item.rootUrl);
      if (picture && picture.rootUrl && picture.artifacts) {
        const largest = picture.artifacts.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        if (largest) result.avatar = picture.rootUrl + largest.fileIdentifyingUrlPathSegment;
      }

      const positions = included.filter(item =>
        item.$type === 'com.linkedin.voyager.identity.profile.Position'
      );
      const currentPosition = positions.find(pos => !pos.timePeriod?.endDate);
      if (currentPosition) {
        result.company = currentPosition.companyName || '';
        if (!result.title && currentPosition.title) result.title = currentPosition.title;
      } else if (positions.length > 0) {
        result.company = positions[0].companyName || '';
      }

      if (!result.company && result.title) {
        const atMatch = result.title.match(/(?:at|@)\s+(.+)$/i);
        if (atMatch) result.company = atMatch[1].trim();
      }

      const miniProfile = included.find(item =>
        item.$type === 'com.linkedin.voyager.identity.shared.MiniProfile' &&
        item.publicIdentifier === profileId
      );
      if (miniProfile) {
        if (!result.firstName && miniProfile.firstName) result.firstName = miniProfile.firstName;
        if (!result.lastName && miniProfile.lastName) result.lastName = miniProfile.lastName;
        if (!result.title && miniProfile.occupation) result.title = miniProfile.occupation;
      }

      const networkInfo = included.find(item => item.distance);
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

  async fetchContactInfo(profileId, headers) {
    const url = `${this.apiBase}/identity/profiles/${profileId}/profileContactInfo`;
    const response = await fetch(url, { headers });
    if (!response.ok) return {};

    const data = await response.json();
    const result = {};
    if (data.emailAddress) result.email = data.emailAddress;
    if (data.phoneNumbers?.length > 0) result.phone = data.phoneNumbers[0].number;
    if (data.websites?.length > 0) result.website = data.websites[0].url;
    return result;
  }
}

module.exports = new ProfileScraper();
