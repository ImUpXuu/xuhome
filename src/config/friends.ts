import friendsData from './friends.json';
import expiredData from './expired-friends.json';

export interface FriendLink {
  name: string;
  url: string;
  avatar: string;
  description: string;
  issue_id?: number;
  siteshot?: string;
  rss?: string;
}

export interface ExpiredFriend {
  name: string;
  url: string;
  since: string;
  reason: string;
}

export const friendsConfig: FriendLink[] = friendsData;
export const expiredFriendsConfig: ExpiredFriend[] = expiredData;
