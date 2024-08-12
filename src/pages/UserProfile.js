import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useParams } from "react-router-dom";
import Page from "../components/utils/Page";
import { Tile } from "../components/Tile";
import { useAuth } from "../AuthProvider";
import { SplashButton } from "../components/buttons/SplashButton";

const BASE_URL = "http://localhost:8000";

const UserProfile = () => {
  const { username } = useParams();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const fetchUserDetails = async () => {
    if (!currentUser) throw new Error("User not authenticated");
    const token = await currentUser.getIdToken();
    const response = await axios.get(`${BASE_URL}/users/username/${username}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  };

  const fetchUserStories = async () => {
    if (!currentUser || !userDetails) throw new Error("User not authenticated or details not loaded");
    const token = await currentUser.getIdToken();
    const storyPromises = userDetails.public_books.map(bookId => 
      axios.get(`${BASE_URL}/stories/story/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const storyResponses = await Promise.all(storyPromises);
    return storyResponses.map(response => response.data);
  };

  const { data: userDetails, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ["userDetails", username],
    queryFn: fetchUserDetails,
    enabled: !!currentUser && !!username,
  });

  const { data: stories, isLoading: isLoadingStories, error: storiesError } = useQuery({
    queryKey: ["userStories", username],
    queryFn: fetchUserStories,
    enabled: !!currentUser && !!userDetails,
  });

  const followUser = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("User not authenticated");
      const token = await currentUser.getIdToken();
      const response = await axios.post(`${BASE_URL}/users/follow/${username}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["userDetails", username]);
    },
  });

  const handleFollow = () => {
    followUser.mutate();
  };

  if (!currentUser) {
    return (
      <Page>
        <p className="text-white">Please log in to view this profile.</p>
      </Page>
    );
  }

  if (isLoadingUser || isLoadingStories) {
    return (
      <Page>
        <p className="text-white">Loading...</p>
      </Page>
    );
  }

  if (userError || storiesError) {
    return (
      <Page>
        <p className="text-white">Error: {userError?.message || storiesError?.message}</p>
      </Page>
    );
  }

  return (
    <Page>
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 text-white">{userDetails?.username}</h1>
        <SplashButton onClick={handleFollow} disabled={followUser.isLoading}>
          {followUser.isLoading ? "Following..." : "Follow"}
        </SplashButton>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {stories && stories.map((story) => (
          <Tile
            key={story.id}
            image={story.story_images[0]}
            likes={story.likes}
            saves={story.saves}
            storyId={story.id}
          />
        ))}
      </div>
    </Page>
  );
};

export default UserProfile;