import type { Friend, FriendRequest } from '@/types';

export type SocialSlice = {
    friends: Friend[];
    friendRequests: FriendRequest[];
    outgoingRequests: FriendRequest[];
    friendsLoading: boolean;
    fetchFriends: () => Promise<void>;
    fetchFriendRequests: () => Promise<void>;
    sendFriendRequest: (friendId: string) => Promise<{ success: boolean; error?: string }>;
    handleFriendRequest: (requestId: string, action: 'accept' | 'reject' | 'cancel') => Promise<void>;
    removeFriend: (friendId: string) => Promise<{ success: boolean; error?: string }>;
};

export const socialInitialState = {
    friends: [],
    friendRequests: [],
    outgoingRequests: [],
    friendsLoading: false,
} satisfies Pick<SocialSlice, 'friends' | 'friendRequests' | 'outgoingRequests' | 'friendsLoading'>;
