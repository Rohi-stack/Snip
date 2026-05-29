export interface ParsedUserAgent {
  browser: string;
  os: string;
  deviceType: string;
}

/**
 * Extracts browser name, operating system, and device type from a raw User-Agent string.
 */
export function parseUserAgent(uaString: string | null | undefined): ParsedUserAgent {
  if (!uaString) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      deviceType: 'Desktop',
    };
  }

  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'Desktop';

  // 1. Determine Device Type
  const isMobile = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|webos/i.test(uaString);
  const isTablet = /ipad|tablet|playbook|silk/i.test(uaString);

  if (isTablet) {
    deviceType = 'Tablet';
  } else if (isMobile) {
    deviceType = 'Mobile';
  } else {
    deviceType = 'Desktop';
  }

  // 2. Determine OS
  if (/windows/i.test(uaString)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(uaString)) {
    os = 'macOS';
  } else if (/android/i.test(uaString)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(uaString)) {
    os = 'iOS';
  } else if (/linux/i.test(uaString)) {
    os = 'Linux';
  } else if (/crkey/i.test(uaString)) {
    os = 'Chromecast';
  }

  // 3. Determine Browser (Order of matching is important)
  if (/opera|opr/i.test(uaString)) {
    browser = 'Opera';
  } else if (/edg/i.test(uaString)) {
    browser = 'Edge';
  } else if (/chrome|crios/i.test(uaString)) {
    // Make sure it's not actually Edge or Opera
    if (!/edg/i.test(uaString) && !/opr/i.test(uaString)) {
      browser = 'Chrome';
    }
  } else if (/firefox|fxios/i.test(uaString)) {
    browser = 'Firefox';
  } else if (/safari/i.test(uaString)) {
    if (!/chrome|crios/i.test(uaString)) {
      browser = 'Safari';
    }
  } else if (/msie|trident/i.test(uaString)) {
    browser = 'Internet Explorer';
  } else if (/TestBrowser/i.test(uaString)) {
    browser = 'TestBrowser/1.0';
  }

  return { browser, os, deviceType };
}
