// 時計アプリ用サービスワーカー
const CACHE_NAME = 'time-app-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './favicon.ico',
  './img/@.png', // ← ここだけでOK
  './abc-alphabet-song-274033.mp3',
  'https://www.youtube.com/embed/KPoVmL0-KIc',
  'https://www.youtube.com/embed/mLi7V9IUEf8'
];

// インストール時のイベント
self.addEventListener('install', event => {
  console.log('Service Worker: インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: ファイルをキャッシュ中...');
        const localUrls = urlsToCache.filter(url => !url.startsWith('https://'));
        return cache.addAll(localUrls);
      })
      .then(() => {
        console.log('Service Worker: キャッシュ完了');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: キャッシュエラー:', error);
      })
  );
});

// アクティベート時のイベント
self.addEventListener('activate', event => {
  console.log('Service Worker: アクティベート中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: アクティベート完了');
      return self.clients.claim();
    })
  );
});

// フェッチイベント（ネットワークリクエスト時）
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.hostname === 'www.youtube.com') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          '<div style="text-align:center; padding:20px; background:#f0f0f0; border-radius:8px;">' +
          '<p>オフライン中のため、動画を再生できません</p>' +
          '<p>インターネット接続を確認してください</p>' +
          '</div>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('Service Worker: キャッシュから取得:', event.request.url);
          return response;
        }
        console.log('Service Worker: ネットワークから取得:', event.request.url);
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        }).catch(error => {
          console.error('Service Worker: ネットワークエラー:', error);

          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }

          if (event.request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50" y="50" text-anchor="middle" fill="#999">オフライン</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }

          return new Response('オフライン中です', { status: 503 });
        });
      })
  );
});

// メッセージイベント（アプリからの通信）
self.addEventListener('message', event => {
  console.log('Service Worker: メッセージ受信:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// 同期イベント（バックグラウンド同期）
self.addEventListener('sync', event => {
  console.log('Service Worker: バックグラウンド同期:', event.tag);

  if (event.tag === 'time-sync') {
    event.waitUntil(
      Promise.resolve()
    );
  }
});

// 通知クリックイベント
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: 通知クリック:', event.notification.tag);

  event.notification.close();

  event.waitUntil(
    clients.openWindow('./')
  );
});

// プッシュ通知イベント
self.addEventListener('push', event => {
  console.log('Service Worker: プッシュ通知受信');

  const options = {
    body: event.data ? event.data.text() : 'アラーム時刻です！',
    icon: './img/@.png',    // ← ここ
    badge: './img/@.png',   // ← ここ
    tag: 'alarm-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'stop',
        title: 'ストップ'
      },
      {
        action: 'snooze',
        title: 'スヌーズ'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TIME アラーム', options)
  );
});

console.log('Service Worker: ロード完了');