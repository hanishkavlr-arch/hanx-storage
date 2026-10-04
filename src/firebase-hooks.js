import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from './firebase';

const VIDEOS_COLLECTION = 'videos';
const USERS_COLLECTION = 'users';

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password, name) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, USERS_COLLECTION, result.user.uid);
      await setDoc(userRef, {
        uid: result.user.uid,
        name,
        email,
        createdAt: new Date().toISOString(),
      });
      return result.user;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(error.message);
    }
  };

  return { user, loading, signup, login, logout };
}

export async function createVideo(userId, videoData) {
  try {
    let videoUrl = videoData.videoUrl;

    if (videoData.file) {
      const storageRef = ref(storage, `videos/${userId}/${Date.now()}-${videoData.file.name}`);
      const snapshot = await uploadBytes(storageRef, videoData.file);
      videoUrl = await getDownloadURL(snapshot.ref);
    }

    const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), {
      id: makeId(),
      title: videoData.title,
      description: videoData.description,
      videoUrl,
      userId,
      visibility: videoData.visibility,
      accessToken: makeId(),
      createdAt: new Date().toISOString(),
    });

    return docRef.id;
  } catch (error) {
    throw new Error('Failed to create video: ' + error.message);
  }
}

export async function getUserVideos(userId) {
  try {
    const q = query(collection(db, VIDEOS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({\n      docId: doc.id,\n      ...doc.data(),\n    }));\n  } catch (error) {\n    throw new Error('Failed to fetch videos: ' + error.message);\n  }\n}\n\nexport async function getVideoByIdAndToken(videoId, token) {\n  try {\n    const q = query(\n      collection(db, VIDEOS_COLLECTION),\n      where('id', '==', videoId)\n    );\n    const querySnapshot = await getDocs(q);\n    if (querySnapshot.empty) return null;\n\n    const videoDoc = querySnapshot.docs[0];\n    const video = videoDoc.data();\n\n    if (video.visibility === 'private' && video.accessToken !== token) {\n      return null;\n    }\n\n    return { docId: videoDoc.id, ...video };\n  } catch (error) {\n    throw new Error('Failed to fetch video: ' + error.message);\n  }\n}\n\nexport async function deleteVideo(docId, videoUrl) {\n  try {\n    if (videoUrl && videoUrl.includes('firebaseapp.com')) {\n      const videoRef = ref(storage, videoUrl);\n      await deleteObject(videoRef).catch(() => null);\n    }\n\n    await deleteDoc(doc(db, VIDEOS_COLLECTION, docId));\n  } catch (error) {\n    throw new Error('Failed to delete video: ' + error.message);\n  }\n}\n