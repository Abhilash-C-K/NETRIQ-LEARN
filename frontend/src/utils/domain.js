/**
 * Dynamic Domain & Hostname Formatter
 * 
 * Cleans long, cryptic cloud server cluster hostnames:
 * e.g. "ac-ekuc0vr-shard-00-01.tzhhqzb.mongodb.net" -> "mongodb.net" (MongoDB Atlas)
 * e.g. "rr3---sn-cvh76nez.googlevideo.com" -> "googlevideo.com" (YouTube Video CDN)
 * e.g. "del11s17-in-f14.1e100.net" -> "1e100.net" (Google Services)
 */

export const extractRootDomain = (rawDomain) => {
  if (!rawDomain || typeof rawDomain !== 'string') return null;
  const clean = rawDomain.trim().replace(/\.$/, '').toLowerCase();

  // If it's an IP address, return null
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(clean)) return null;

  const parts = clean.split('.');
  if (parts.length <= 2) return clean;

  const twoPartTlds = new Set([
    'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
    'co.in', 'net.in', 'org.in', 'gov.in',
    'com.au', 'net.au', 'org.au',
    'co.nz', 'co.jp', 'com.br', 'co.za'
  ]);

  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (twoPartTlds.has(lastTwo) && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${lastTwo}`;
  }

  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
};

export const getFriendlyDomainInfo = (rawDomain) => {
  if (!rawDomain) return null;
  const root = extractRootDomain(rawDomain);
  if (!root) {
    return {
      display: rawDomain,
      root: rawDomain,
      raw: rawDomain,
      alias: null,
    };
  }

  // Clear, helpful labels for technical cloud infrastructure domains
  let alias = null;
  if (root === '1e100.net') alias = 'Google Services';
  else if (root === 'googlevideo.com') alias = 'YouTube CDN';
  else if (root === 'mongodb.net') alias = 'MongoDB Atlas';
  else if (root === 'fbcdn.net') alias = 'Meta CDN';
  else if (root === 'twimg.com') alias = 'Twitter Media';
  else if (root === 'githubusercontent.com') alias = 'GitHub Assets';
  else if (root === 'amazonaws.com') alias = 'AWS Cloud';

  return {
    display: root,
    alias,
    root,
    raw: rawDomain,
  };
};
