/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

export interface BlogPost {
  title: string;
  description: string;
  link: string;
  date: string;
  tags: string[];
}
