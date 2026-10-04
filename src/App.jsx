import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEYS = {
  users: 'hanx_storage_users',
  videos: 'hanx_storage_videos',
  session: 'hanx_storage_session',
};

const seedUsers = [
  {
    id: 'admin-user',
    name: 'Demo User',
    email: 'demo@hanx.com',
    password: 'demo123',
  },
];

const seedVideos = [
  {
    id: 'demo-video-1',
    title: 'Welcome to Hanx Storage Box',
    description: 'Private demo video. Only guests with the generated link can watch it.',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    userId: 'admin-user',
    visibility: 'private',
    accessToken: 'demo-private-token',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-video-2',
    title: 'Public sample',
    description: 'This sample is public and can be accessed without login.',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
    userId: 'admin-user',
    visibility: 'public',
    accessToken: 'demo-public-token',
    createdAt: new Date().toISOString(),
  },
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function getStorageValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorageValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [users, setUsers] = useState(() => getStorageValue(STORAGE_KEYS.users, seedUsers));
  const [videos, setVideos] = useState(() => getStorageValue(STORAGE_KEYS.videos, seedVideos));
  const [currentUser, setCurrentUser] = useState(() => getStorageValue(STORAGE_KEYS.session, null));
  const [view, setView] = useState('dashboard');
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    videoUrl: '',
    visibility: 'private',
  });
  const [notice, setNotice] = useState('');
  const [shareVideo, setShareVideo] = useState(null);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.users, users);
  }, [users]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.videos, videos);
  }, [videos]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.session, currentUser);
  }, [currentUser]);

  useEffect(() => {
    const hash = window.location.hash || '';

    if (!hash.startsWith('#/share/')) {
      return;
    }

    const match = hash.match(/^#\/share\/([^?]+)\??(.*)$/);
    if (!match) return;

    const videoId = match[1];
    const token = new URLSearchParams(match[2]).get('token');
    const found = videos.find((video) => video.id === videoId && video.accessToken === token);

    if (found) {
      setShareVideo(found);
      setView('shared');
    } else {
      setNotice('This video link is invalid or access has been denied.');
    }
  }, [videos]);

  const myVideos = useMemo(() => {
    if (!currentUser) return [];
    return videos.filter((video) => video.userId === currentUser.id);
  }, [currentUser, videos]);

  const handleAuth = (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();

    if (!email || !password) {
      setNotice('Email and password are required.');
      return;
    }

    if (authMode === 'signup') {
      const exists = users.some((user) => user.email === email);
      if (exists) {
        setNotice('This email is already registered. Please log in instead.');
        return;
      }

      const newUser = {
        id: makeId(),
        name: form.name.trim() || 'New User',
        email,
        password,
      };

      setUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      setForm({ name: '', email: '', password: '' });
      setNotice('Account created successfully.');
      setView('dashboard');
      return;
    }

    const found = users.find((user) => user.email === email && user.password === password);
    if (!found) {
      setNotice('Incorrect email or password.');
      return;
    }

    setCurrentUser(found);
    setForm({ name: '', email: '', password: '' });
    setNotice('Login successful.');
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('dashboard');
    setNotice('Logged out successfully.');
  };

  const handleCreateVideo = (event) => {
    event.preventDefault();

    if (!currentUser) {
      setNotice('Please log in before uploading a video.');
      return;
    }

    if (!newVideo.title.trim() || !newVideo.videoUrl.trim()) {
      setNotice('Video title and URL are required.');
      return;
    }

    const video = {
      id: makeId(),
      title: newVideo.title.trim(),
      description: newVideo.description.trim(),
      videoUrl: newVideo.videoUrl.trim(),
      visibility: newVideo.visibility,
      userId: currentUser.id,
      accessToken: makeId(),
      createdAt: new Date().toISOString(),
    };

    setVideos((prev) => [video, ...prev]);
    setNewVideo({ title: '', description: '', videoUrl: '', visibility: 'private' });
    setNotice('Video added successfully.');
  };

  const getShareLink = (video) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/share/${video.id}?token=${video.accessToken}`;
  };

  const handleOpenShare = (video) => {
    setShareVideo(video);
    setView('shared');
    window.location.hash = `/share/${video.id}?token=${video.accessToken}`;
  };

  const handleCopyLink = async (video) => {
    const shareLink = getShareLink(video);
    try {
      await navigator.clipboard.writeText(shareLink);
      setNotice('Share link copied to clipboard.');
    } catch {
      setNotice(`Copy this manually: ${shareLink}`);
    }
  };

  const renderSharedView = () => {
    if (!shareVideo) {
      return (
        <div className="state-card">
          <h3>Access denied</h3>
          <p>You need a valid private link to view this video. Public videos can be opened by anyone.</p>
        </div>
      );
    }

    return (
      <div className="shared-card">
        <div className="shared-header">
          <span className={`badge ${shareVideo.visibility}`}>{shareVideo.visibility}</span>
          <h2>{shareVideo.title}</h2>
        </div>
        <p>{shareVideo.description || 'Private video shared from Hanx Storage Box.'}</p>
        <video controls src={shareVideo.videoUrl} className="shared-video" />
        <div className="link-row">
          <input value={getShareLink(shareVideo)} readOnly />
          <button className="secondary" onClick={() => handleCopyLink(shareVideo)}>
            Copy link
          </button>
        </div>
      </div>
    );
  };

  if (!currentUser && view !== 'shared') {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-card">
          <div className="brand-block">
            <span className="brand-mark">HX</span>
            <div>
              <h1>Hanx Storage Box</h1>
              <p>Private video vault with shareable links</p>
            </div>
          </div>

          <div className="toggle-row">
            <button
              className={authMode === 'login' ? 'toggle active' : 'toggle'}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'signup' ? 'toggle active' : 'toggle'}
              onClick={() => setAuthMode('signup')}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'signup' && (
              <label>
                Full name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </label>

            <button type="submit" className="primary-btn wide">
              {authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>

          <div className="demo-box">
            <strong>Demo login:</strong> demo@hanx.com / demo123
          </div>

          {notice && <p className="notice">{notice}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell dashboard-shell">
      <header className="topbar">
        <div>
          <span className="brand-mark small">HX</span>
          <strong>Hanx Storage Box</strong>
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={() => setView('dashboard')}>Dashboard</button>
          <button className="ghost" onClick={() => setView('upload')}>Upload</button>
          <button className="ghost" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {notice && <p className="notice global-notice">{notice}</p>}

      {view === 'dashboard' && (
        <main className="dashboard-grid">
          <section className="panel large-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Welcome</p>
                <h2>{currentUser?.name}</h2>
              </div>
              <button className="primary-btn" onClick={() => setView('upload')}>
                Add video
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <span>Total videos</span>
                <strong>{myVideos.length}</strong>
              </div>
              <div className="stat-box">
                <span>Private</span>
                <strong>{myVideos.filter((v) => v.visibility === 'private').length}</strong>
              </div>
              <div className="stat-box">
                <span>Public</span>
                <strong>{myVideos.filter((v) => v.visibility === 'public').length}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header compact">
              <h3>Your vault</h3>
            </div>

            <div className="video-list">
              {myVideos.length === 0 ? (
                <div className="empty-state">No videos yet. Upload your first one.</div>
              ) : (
                myVideos.map((video) => (
                  <article key={video.id} className="video-item">
                    <div className="video-thumbnail">
                      <video src={video.videoUrl} muted playsInline />
                    </div>
                    <div className="video-info">
                      <div className="video-topline">
                        <h4>{video.title}</h4>
                        <span className={`badge ${video.visibility}`}>{video.visibility}</span>
                      </div>
                      <p>{video.description || 'No description provided.'}</p>
                      <div className="video-actions">
                        <button className="secondary" onClick={() => handleOpenShare(video)}>
                          Open link
                        </button>
                        <button className="secondary" onClick={() => handleCopyLink(video)}>
                          Copy link
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </main>
      )}

      {view === 'upload' && (
        <main className="upload-panel">
          <div className="panel">
            <div className="panel-header compact">
              <h3>Upload video</h3>
            </div>

            <form onSubmit={handleCreateVideo} className="upload-form">
              <label>
                Video title
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  placeholder="My travel clip"
                />
              </label>

              <label>
                Description
                <textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  placeholder="Optional description"
                />
              </label>

              <label>
                Video URL
                <input
                  type="url"
                  value={newVideo.videoUrl}
                  onChange={(e) => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                  placeholder="https://example.com/movie.mp4"
                />
              </label>

              <label>
                Link visibility
                <select
                  value={newVideo.visibility}
                  onChange={(e) => setNewVideo({ ...newVideo, visibility: e.target.value })}
                >
                  <option value="private">Private — link only</option>
                  <option value="public">Public — anyone can open</option>
                </select>
              </label>

              <button type="submit" className="primary-btn wide">
                Save video
              </button>
            </form>
          </div>
        </main>
      )}

      {view === 'shared' && renderSharedView()}
    </div>
  );
}

export default App;
