// Page-related response types and interfaces

// Page data response for authenticated users
export interface PageData {
  page: {
    id: string;
    layout?: string;
    theme?: string;
    published?: boolean;
    updatedAt: string;
    createdAt: string;
  };
  profile: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  links: Array<{
    id?: string;
    title: string;
    url: string;
    active: boolean;
    position: number;
  }>;
  liveUrl?: string;
  fallbackUrl?: string;
}

// Dashboard summary response
export interface DashboardSummary {
  username: string;
  liveUrl: string;
  fallbackUrl: string;
  profile: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  page: {
    theme: string;
    published: boolean;
    viewsAllTime: number;
    updatedAt: string;
  };
  links: {
    count: number;
  };
  setup: {
    firstSaveCompleted: boolean;
    checklist: {
      displayNameAvatar: { done: boolean; ts: string | null };
      addLinks3Plus: { done: boolean; ts: string | null };
      chooseTheme: { done: boolean; ts: string | null };
      addBio: { done: boolean; ts: string | null };
      copyLinkToTikTok: { done: boolean; ts: string | null };
    };
  };
  plan: string;
}


// Checklist item update request
export interface ChecklistUpdateRequest {
  key: string;
  done: boolean;
}

// Checklist item update response
export interface ChecklistUpdateResponse {
  ok: boolean;
  checklist: {
    displayNameAvatar: { done: boolean; ts: string | null };
    addLinks3Plus: { done: boolean; ts: string | null };
    chooseTheme: { done: boolean; ts: string | null };
    addBio: { done: boolean; ts: string | null };
    copyLinkToTikTok: { done: boolean; ts: string | null };
  };
}

// Public profile data for unauthenticated access
export interface PublicProfileData {
  ok: boolean;
  profile?: {
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    links: Array<{
      label: string;
      url: string;
      order: number;
    }>;
  };
}

// Public page JSON response
export interface PublicPageJSON {
  ok: boolean;
  data?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    page: {
      layout: string;
      theme: string;
      published: boolean;
      updatedAt: string;
    };
    links: Array<{
      title: string;
      url: string;
      active: boolean;
      position: number;
    }>;
  };
}

// Public page data for rendering (matches API response structure)
export interface PublicPageData {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  page: {
    layout: 'LINKS_LIST';
    theme: 'classic' | 'contrast' | 'warm';
    published: boolean;
    updatedAt?: string;
  };
  links: Array<{
    title: string;
    url: string;
    active: boolean;
    position: number;
  }>;
}

// Page service interfaces
export interface IPagesService {
  setEnvironment(env: any): void;
  getPublicProfileByUsername(username: string): Promise<{
    ok: boolean;
    profile?: any;
  }>;
  getPublicPageJSON(username: string): Promise<PublicPageJSON>;
  getMyPage(userId: string): Promise<{
    ok: boolean;
    page?: any;
    profile?: any;
    links?: any[];
    liveUrl?: string;
    fallbackUrl?: string;
  }>;
  updateMyPage(userId: string, input: { 
    displayName?: string; 
    avatarUrl?: string; 
    bio?: string; 
    published?: boolean; 
    layout?: string; 
    theme?: string 
  }): Promise<{ ok: boolean; error?: string }>;
  replaceMyLinks(userId: string, links: Array<{ 
    id?: string; 
    title?: string; 
    label?: string; 
    url: string; 
    active?: boolean; 
    position?: number; 
    order?: number 
  }>): Promise<{ ok: boolean; count: number; error?: string }>;
  publish(userId: string): Promise<{ ok: boolean }>;
  getSummary(userId: string): Promise<{ ok: boolean; data?: DashboardSummary; error?: string }>;
}

// Page controller interfaces
export interface IPagesController {
  getPublicProfile(c: any): Promise<Response>;
  getPublicPageByUsername(c: any): Promise<Response>;
  getMyPage(c: any): Promise<Response>;
  updateMyPage(c: any): Promise<Response>;
  replaceMyLinks(c: any): Promise<Response>;
  publish(c: any): Promise<Response>;
  getSummary(c: any): Promise<Response>;
}
