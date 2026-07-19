import friendsData from './friends.json';

export interface FriendLink {
  name: string;
  url: string;
  avatar: string;
  description: string;
  issue_id?: number;
  siteshot?: string;
  rss?: string;
}

export const friendsConfig: FriendLink[] = friendsData;
