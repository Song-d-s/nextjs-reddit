import { Inter } from "@next/font/google";
import PageContent from "@/components/Layout/PageContent";
import { NextPage } from "next";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/clientApp";
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import usePosts from "@/hooks/usePosts";
import { Post, PostVote } from "@/atoms/postAtom";
import PostLoader from "@/components/Posts/PostLoader";
import { Stack } from "@chakra-ui/react";
import PostItem from "@/components/Posts/PostItem";
import CreatePostLink from "@/components/Community/CreatePostLink";
import { communityState } from "@/atoms/communitiesAtom";
import { useRecoilValue } from "recoil";
import useCommunityData from "@/hooks/useCommunityData";
import Recommendations from "@/components/Community/Recommendations";
import Premium from "@/components/Community/Premium";
import PersonalHome from "@/components/Community/PersonalHome";

const inter = Inter({ subsets: ["latin"] });

const Home: NextPage = () => {
  const [user, loadingUser] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  // const communityStateValue = useRecoilValue(communityState);
  const { communityStateValue } = useCommunityData();
  const {
    postStateValue,
    setPostStateValue,
    onDeletePost,
    onSelectPost,
    onVote,
  } = usePosts();

  const getUserPostVotes = useCallback(async () => {
    try {
      const postIds = postStateValue.posts.map((post) => post.id);
      const postVotesQuery = query(
        collection(firestore, `users/${user?.uid}/postVotes`),
        where("postId", "in", postIds)
      );
      const postVoteDocs = await getDocs(postVotesQuery);
      const postVotes = postVoteDocs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: postVotes as PostVote[],
      }));
    } catch (error) {
      console.log("getUserPostVotes error", error);
    }
  }, [user?.uid, setPostStateValue, postStateValue.posts]);

  const bulidNoUserHomeFeed = useCallback(async () => {
    setLoading(true);
    try {
      const postQuery = query(
        collection(firestore, "posts"),
        orderBy("voteStatus", "desc"),
        limit(10)
      );

      const postDocs = await getDocs(postQuery);
      const posts = postDocs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // setPostState
      setPostStateValue((prev) => ({ ...prev, posts: posts as Post[] }));
    } catch (error) {
      console.log("buildNoUserHomeFeed error", error);
    }
    setLoading(false);
  }, [setPostStateValue]);

  const bulidUserHomeFeed = useCallback(async () => {
    setLoading(true);
    try {
      if (communityStateValue.mySnippets.length) {
        const myCommunityIds = communityStateValue.mySnippets.map(
          (snippet) => snippet.communityId
        );
        const postQuery = query(
          collection(firestore, "posts"),
          where("communityId", "in", myCommunityIds),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const postDocs = await getDocs(postQuery);
        const posts = postDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPostStateValue((prev) => ({ ...prev, posts: posts as Post[] }));
      } else {
        bulidNoUserHomeFeed();
      }
    } catch (error) {
      console.log("bulidUserHomeFeed error", error);
    }
    setLoading(false);
  }, [bulidNoUserHomeFeed, setPostStateValue, communityStateValue.mySnippets]);

  // userEffects
  //  1. bulidNoUserHomeFeed
  useEffect(() => {
    if (!user && !loadingUser) bulidNoUserHomeFeed();
  }, [user, loadingUser, bulidNoUserHomeFeed]);
  //  2. bulidUserHomeFeed
  useEffect(() => {
    if (communityStateValue.snippetsFetched) bulidUserHomeFeed();
  }, [communityStateValue.snippetsFetched, bulidUserHomeFeed]);
  //  3. getUserPostVotes
  useEffect(() => {
    if (user && postStateValue.posts.length) getUserPostVotes();

    return () => {
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
    }; // runs when dismounts - to clean up
  }, [user, postStateValue.posts, getUserPostVotes, setPostStateValue]);

  return (
    <PageContent>
      <>
        <CreatePostLink />
        {/* postfeed */}
        {loading ? (
          <PostLoader />
        ) : (
          <Stack>
            {postStateValue.posts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                onDeletePost={onDeletePost}
                onVote={onVote}
                onSelectPost={onSelectPost}
                userVoteValue={
                  postStateValue.postVotes.find(
                    (item) => item.postId === post.id
                  )?.voteValue
                }
                userIsCreator={user?.uid === post.creatorId}
                homePage
              />
            ))}
          </Stack>
        )}
      </>
      <Stack spacing={5}>
        <Recommendations />
        <Premium />
        <PersonalHome />
      </Stack>
    </PageContent>
  );
};

export default Home;
