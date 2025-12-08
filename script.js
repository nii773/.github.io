const database = firebase.database();

        // DOM要素
        const novelsListContainer = document.getElementById('novels-list-container');
        const createNovelBtn = document.getElementById('create-novel-btn');
        const createNotice = document.getElementById('create-notice');
        const createModal = document.getElementById('create-modal');
        const novelTitleInput = document.getElementById('novel-title-input');
        const cancelBtn = document.getElementById('cancel-btn');
        const confirmCreateBtn = document.getElementById('confirm-create-btn');
        const currentNovelTitle = document.getElementById('current-novel-title');
        const currentNovelInfo = document.getElementById('current-novel-info');
        const lineInput = document.getElementById('line-input');
        const submitBtn = document.getElementById('submit-btn');
        const charCount = document.getElementById('char-count');
        const novelLines = document.getElementById('novel-lines');
        const notice = document.getElementById('notice');

        let currentNovelId = null;
        const LAST_CREATE_KEY = 'lastCreateTime';
        const LAST_POST_KEY = 'lastPostTime';

        // 文字数カウント
        lineInput.addEventListener('input', () => {
            const length = lineInput.value.length;
            charCount.textContent = `${length}/100`;
        });

        // 作品一覧を読み込む
        function loadNovelsList() {
            database.ref('novels').on('value', (snapshot) => {
                novelsListContainer.innerHTML = '';
                
                if (!snapshot.exists()) {
                    novelsListContainer.innerHTML = '<div class="loading">まだ作品がありません</div>';
                    return;
                }
                
                const novels = [];
                snapshot.forEach((childSnapshot) => {
                    novels.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                
                // 作成日時の新しい順に並べる
                novels.sort((a, b) => b.createdAt - a.createdAt);
                
                novels.forEach((novel) => {
                    const novelItem = document.createElement('div');
                    novelItem.className = 'novel-item';
                    if (currentNovelId === novel.id) {
                        novelItem.classList.add('active');
                    }
                    
                    const createdDate = new Date(novel.createdAt);
                    const dateStr = `${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}`;
                    
                    novelItem.innerHTML = `
                        <div class="novel-title">${novel.title}</div>
                        <div class="novel-meta">${dateStr} 作成</div>
                    `;
                    
                    novelItem.addEventListener('click', () => {
                        selectNovel(novel.id, novel.title);
                    });
                    
                    novelsListContainer.appendChild(novelItem);
                });
            });
        }

        // 作品を選択
        function selectNovel(novelId, novelTitle) {
            currentNovelId = novelId;
            currentNovelTitle.textContent = novelTitle;
            
            // アクティブ状態を更新
            document.querySelectorAll('.novel-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.novel-item').classList.add('active');
            
            // 入力欄を有効化
            lineInput.disabled = false;
            submitBtn.disabled = false;
            
            loadLines();
            checkPostLimit();
        }

        // 小説の行を読み込む
        function loadLines() {
            if (!currentNovelId) return;
            
            database.ref(`lines/${currentNovelId}`).orderByChild('timestamp').limitToLast(30).on('value', (snapshot) => {
                novelLines.innerHTML = '';
                
                if (!snapshot.exists()) {
                    novelLines.innerHTML = '<div class="loading">まだ物語は始まっていません。<br>あなたが最初の1行を書きませんか？</div>';
                    return;
                }
                
                const lines = [];
                snapshot.forEach((childSnapshot) => {
                    lines.push(childSnapshot.val());
                });
                
                lines.forEach((line) => {
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'line';
                    lineDiv.textContent = line.text;
                    novelLines.appendChild(lineDiv);
                });
                
                // 行数を更新
                database.ref(`novels/${currentNovelId}`).once('value', (snap) => {
                    if (snap.exists()) {
                        const novel = snap.val();
                        currentNovelInfo.textContent = `全${lines.length}行`;
                    }
                });
                
                novelLines.scrollTop = novelLines.scrollHeight;
            });
        }

        // 新規作成可能かチェック（一週間に一回）
        function canCreateNovel() {
            const lastCreateTime = localStorage.getItem(LAST_CREATE_KEY);
            if (!lastCreateTime) return true;
            
            const now = new Date();
            const lastCreate = new Date(parseInt(lastCreateTime));
            const diffDays = Math.floor((now - lastCreate) / (1000 * 60 * 60 * 24));
            
            return diffDays >= 7;
        }

        // 次回作成可能日時
        function getTimeUntilNextCreate() {
            const lastCreateTime = localStorage.getItem(LAST_CREATE_KEY);
            if (!lastCreateTime) return '';
            
            const lastCreate = new Date(parseInt(lastCreateTime));
            const nextCreate = new Date(lastCreate);
            nextCreate.setDate(nextCreate.getDate() + 7);
            
            const now = new Date();
            const diff = nextCreate - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            if (days > 0) {
                return `${days}日${hours}時間`;
            } else {
                return `${hours}時間`;
            }
        }

        // 投稿制限チェック（1日1回）
        function canPost() {
            const lastPostTime = localStorage.getItem(LAST_POST_KEY);
            if (!lastPostTime) return true;
            
            const now = new Date();
            const lastPost = new Date(parseInt(lastPostTime));
            
            return now.toDateString() !== lastPost.toDateString();
        }

        function getTimeUntilNextPost() {
            const lastPostTime = localStorage.getItem(LAST_POST_KEY);
            if (!lastPostTime) return '';
            
            const lastPost = new Date(parseInt(lastPostTime));
            const tomorrow = new Date(lastPost);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const now = new Date();
            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            return `${hours}時間${minutes}分`;
        }

        function checkPostLimit() {
            if (!canPost()) {
                const timeLeft = getTimeUntilNextPost();
                showNotice(`今日はもう投稿済みです。次は ${timeLeft} 後に投稿できます。`, 'info');
            }
        }

        // モーダル表示
        createNovelBtn.addEventListener('click', () => {
            if (!canCreateNovel()) {
                const timeLeft = getTimeUntilNextCreate();
                showCreateNotice(`次の作品は ${timeLeft} 後に作成できます`, 'info');
                return;
            }
            createModal.classList.add('show');
            novelTitleInput.value = '';
            novelTitleInput.focus();
        });

        // モーダルを閉じる
        cancelBtn.addEventListener('click', () => {
            createModal.classList.remove('show');
        });

        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) {
                createModal.classList.remove('show');
            }
        });

        // 新規作品作成
        confirmCreateBtn.addEventListener('click', () => {
            const title = novelTitleInput.value.trim();
            
            if (!title) {
                alert('タイトルを入力してください');
                return;
            }
            
            const novelId = database.ref('novels').push().key;
            const novelData = {
                title: title,
                createdAt: Date.now()
            };
            
            database.ref(`novels/${novelId}`).set(novelData)
                .then(() => {
                    localStorage.setItem(LAST_CREATE_KEY, Date.now().toString());
                    createModal.classList.remove('show');
                    showCreateNotice('作品を作成しました！', 'success');
                    selectNovel(novelId, title);
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert('作成に失敗しました');
                });
        });

        // 投稿処理
        submitBtn.addEventListener('click', () => {
            if (!currentNovelId) {
                showNotice('作品を選択してください', 'error');
                return;
            }
            
            const text = lineInput.value.trim();
            
            if (!text) {
                showNotice('1行を入力してください', 'error');
                return;
            }
            
            if (!canPost()) {
                const timeLeft = getTimeUntilNextPost();
                showNotice(`次の投稿まで ${timeLeft} お待ちください`, 'info');
                return;
            }
            
            submitBtn.disabled = true;
            
            database.ref(`lines/${currentNovelId}`).push({
                text: text,
                timestamp: Date.now()
            })
            .then(() => {
                localStorage.setItem(LAST_POST_KEY, Date.now().toString());
                lineInput.value = '';
                charCount.textContent = '0/100';
                showNotice('投稿しました！次は明日また投稿できます。', 'success');
                submitBtn.disabled = false;
            })
            .catch((error) => {
                console.error('Error:', error);
                showNotice('投稿に失敗しました。もう一度お試しください。', 'error');
                submitBtn.disabled = false;
            });
        });

        // 通知表示
        function showNotice(message, type) {
            notice.textContent = message;
            notice.className = `notice ${type}`;
            
            setTimeout(() => {
                notice.textContent = '';
                notice.className = 'notice';
            }, 5000);
        }

        function showCreateNotice(message, type) {
            createNotice.textContent = message;
            createNotice.className = `notice ${type}`;
            
            setTimeout(() => {
                createNotice.textContent = '';
                createNotice.className = 'notice';
            }, 5000);
        }

        // 初期化
        loadNovelsList();

        // 作成制限の確認
        if (!canCreateNovel()) {
            const timeLeft = getTimeUntilNextCreate();
            createNovelBtn.disabled = true;
            showCreateNotice(`次の作品は ${timeLeft} 後に作成できます`, 'info');
        }
