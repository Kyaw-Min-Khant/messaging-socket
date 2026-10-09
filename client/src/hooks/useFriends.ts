import { useCallback, useEffect, useState } from "react";
import type { Friend, FriendRequest } from "../types";
import { getAvailableUsers, getFriendRequests, getFriends } from "../api/users";

/** Friends, pending requests and people you can add, loaded together. */
export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [f, r, u] = await Promise.all([getFriends(), getFriendRequests(), getAvailableUsers()]);
      setFriends(f);
      setRequests(r);
      setAvailableUsers(u);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { friends, requests, availableUsers, isLoading, reload };
}
