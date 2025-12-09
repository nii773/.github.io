        const database = firebase.database();

        const ADMIN_PASSWORD = "GHieob350Dgev";
        const ADMIN_SESSION_KEY = "adminLoggedIn";

        // DOM要素
        const adminBtn = document.getElementById('admin-btn');
        const adminModal = document.getElementById('admin-modal');
        const adminPasswordInput = document.getElementById('admin-password-input');
        const adminCancelBtn = document.getElementById('admin-cancel-btn');
        const adminLoginBtn = document.getElementById('admin-login-btn');
        const deleteModal = document.getElementById('delete-modal');
        const deleteNovelTitle = document.getElementById('delete-novel-title');
        const deleteCancelBtn = document.getElementById('delete-cancel-btn');
        const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
        const novelsListContainer = document.getElementById('novels-list-container');
        const createNovelBtn = document.getElementById('create-novel-btn');
        const createNotice = document.getElementById('create-notice');
        const createModal = document.getElementById('create-modal');
        const novelTitleInput = document.getElementById('novel-title-input');
        const targetLinesInput = document.getElementById('target-lines-input');
        const cancelBtn = document.getElementById('cancel-btn');
        const confirmCreateBtn = document.getElementById('confirm-create-btn');
        const currentNovelTitle = document.getElementById('current-novel-title');
        const currentNovelStatus = document.getElementById('current-novel-status');
        const currentNovelInfo = document.getElementById('current-novel-info');
        const completionMessageContainer = document.getElementById('completion-message-container');
        const lineInput = document.getElementById('line-input');
        const submitBtn = document.getElementById('submit-btn');
        const charCount = document.getElementById('char-count');
        const remainingLines = document.getElementById('remaining-lines');
        const novelLines = document.getElementById('novel-lines');
        const notice = document.getElementById('notice');

        let currentNovelId = null;
        let currentNovelData = null;
        let isAdmin = false;
        let novelToDelete = null;
        const LAST_CREATE_KEY = 'lastCreateTime';
        const LAST_POST_KEY = 'lastPostTime';

        // 管理者状態の確認
        function checkAdminStatus() {
            const adminStatus = sessionStorage.getItem(ADMIN_SESSION_KEY);
            if (adminStatus === 'true') {
                isAdmin = true;
                adminBtn.textContent = 'ログアウト';
                adminBtn.classList.add('logged-in');
            }
        }

        // 管理者ログイン/ログアウト
        adminBtn.addEventListener('click', () => {
            if (isAdmin) {
                // ログアウト
                isAdmin = false;
                sessionStorage.removeItem(ADMIN_SESSION_KEY);
                adminBtn.textContent = '管理者ログイン';
                adminBtn.classList.remove('logged-in');
                loadNovelsList();
                alert('ログアウトしました');
            } else {
                // ログインモーダルを表示
                adminModal.classList.add('show');
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
            }
        });

        // 管理者ログイン処理
        adminLoginBtn.addEventListener('click', () => {
            const password = adminPasswordInput.value;
            if (password === ADMIN_PASSWORD) {
                isAdmin = true;
                sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
                adminBtn.textContent = 'ログアウト';
                adminBtn.classList.add('logged-in');
                adminModal.classList.remove('show');
                loadNovelsList();
                alert('管理者としてログインしました');
            } else {
                alert('パスワードが正しくありません');
            }
        });

        adminCancelBtn.addEventListener('click', () => {
            adminModal.classList.remove('show');
        });

        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) {
                adminModal.classList.remove('show');
            }
        });

        // Enterキーでログイン
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                adminLoginBtn.click();
            }
        });

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
                    
                    const currentLines = novel.currentLines || 0;
                    const targetLines = novel.targetLines || 100;
                    const isCompleted = currentLines >= targetLines;
                    const statusText = isCompleted ? '完成' : '製作中';
                    const statusClass = isCompleted ? 'completed' : 'in-progress';
                    
                    novelItem.innerHTML = `
                        <div class="novel-title-row">
                            <div class="novel-title">${novel.title}</div>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="novel-meta">${dateStr} 作成 (${currentLines}/${targetLines}行)</div>
                        ${isAdmin ? `<button class="delete-btn" data-novel-id="${novel.id}" data-novel-title="${novel.title}">削除</button>` : ''}
                    `;
                    
                    // 作品選択イベント
                    novelItem.addEventListener('click', (e) => {
                        // 削除ボタンのクリックは除外
                        if (!e.target.classList.contains('delete-btn')) {
                            selectNovel(novel.id, novel);
                        }
                    });
                    
                    // 削除ボタンイベント（管理者のみ）
                    if (isAdmin) {
                        const deleteBtn = novelItem.querySelector('.delete-btn');
                        deleteBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            showDeleteConfirmation(novel.id, novel.title);
                        });
                    }
                    
                    novelsListContainer.appendChild(novelItem);
                });
            });
        }

        // 削除確認モーダルを表示
        function showDeleteConfirmation(novelId, novelTitle) {
            novelToDelete = novelId;
            deleteNovelTitle.textContent = novelTitle;
            deleteModal.classList.add('show');
        }

        // 削除処理
        deleteConfirmBtn.addEventListener('click', () => {
            if (!novelToDelete) return;
            
            // 作品データと行データの両方を削除
            const updates = {};
            updates[`novels/${novelToDelete}`] = null;
            updates[`lines/${novelToDelete}`] = null;
            
            database.ref().update(updates)
                .then(() => {
                    deleteModal.classList.remove('show');
                    novelToDelete = null;
                    
                    // 削除した作品が選択中だった場合、リセット
                    if (currentNovelId === novelToDelete) {
                        currentNovelId = null;
                        currentNovelData = null;
                        currentNovelTitle.textContent = '作品を選択してください';
                        currentNovelStatus.innerHTML = '';
                        currentNovelInfo.textContent = '';
                        novelLines.innerHTML = '<div class="loading">作品を選択してください</div>';
                        lineInput.disabled = true;
                        submitBtn.disabled = true;
                    }
                    
                    alert('作品を削除しました');
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert('削除に失敗しました');
                });
        });

        deleteCancelBtn.addEventListener('click', () => {
            deleteModal.classList.remove('show');
            novelToDelete = null;
        });

        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.classList.remove('show');
                novelToDelete = null;
            }
        });

        // 作品を選択
        function selectNovel(novelId, novelData) {
            currentNovelId = novelId;
            currentNovelData = novelData;
            currentNovelTitle.textContent = novelData.title;
            
            // ステータス表示
            const currentLines = novelData.currentLines || 0;
            const targetLines = novelData.targetLines || 100;
            const isCompleted = currentLines >= targetLines;
            
            if (isCompleted) {
                currentNovelStatus.innerHTML = '<span class="novel-status-large completed">完成</span>';
                completionMessageContainer.innerHTML = '<div class="completion-message">🎉 この作品は完成しました！ 🎉</div>';
            } else {
                currentNovelStatus.innerHTML = '<span class="novel-status-large in-progress">製作中</span>';
                completionMessageContainer.innerHTML = '';
            }
            
            // アクティブ状態を更新
            document.querySelectorAll('.novel-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.novel-item').classList.add('active');
            
            // 入力欄を有効化（完成していない場合のみ）
            if (isCompleted) {
                lineInput.disabled = true;
                submitBtn.disabled = true;
            } else {
                lineInput.disabled = false;
                submitBtn.disabled = false;
            }
            
            loadLines();
            checkPostLimit();
        }

        // 小説の行を読み込む
       // 小説の行を読み込む
        function loadLines() {
            if (!currentNovelId) return;
            
            database.ref(`lines/${currentNovelId}`).orderByChild('timestamp').limitToLast(30).on('value', (snapshot) => {
                novelLines.innerHTML = '';
                
                if (!snapshot.exists()) {
                    novelLines.innerHTML = '<div class="loading">まだ物語は始まっていません。<br>あなたが最初の1行を書きませんか？</div>';
                    updateNovelInfo(0);
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
                
                updateNovelInfo(lines.length);
                novelLines.scrollTop = novelLines.scrollHeight;
            });
        }


        // 作品情報を更新
        function updateNovelInfo(currentLineCount) {
        const targetLines = currentNovelData.targetLines || 100;
        const remaining = Math.max(0, targetLines - currentLineCount);
        const isCompleted = currentLineCount >= targetLines;
        
        currentNovelInfo.textContent = `全${currentLineCount}行 / 目標${targetLines}行`;
        
        if (isCompleted) {
            remainingLines.textContent = '完成！';
            remainingLines.style.color = '#155724';
            lineInput.disabled = true;
            submitBtn.disabled = true;
        } else {
            remainingLines.textContent = `あと${remaining}行で完成`;
            remainingLines.style.color = '#667eea';
        }
                database.ref(`novels/${currentNovelId}/currentLines`).set(currentLineCount);
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
        targetLinesInput.value = '100';
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
        const targetLines = parseInt(targetLinesInput.value) || 100;
        
        if (!title) {
            alert('タイトルを入力してください');
            return;
        }
        
        if (targetLines < 10 || targetLines > 1000) {
            alert('完成までの行数は10〜1000行の範囲で指定してください');
            return;
        }
        
        const novelId = database.ref('novels').push().key;
        const novelData = {
            title: title,
            targetLines: targetLines,
            currentLines: 0,
            createdAt: Date.now()
        };
        
        database.ref(`novels/${novelId}`).set(novelData)
            .then(() => {
                localStorage.setItem(LAST_CREATE_KEY, Date.now().toString());
                createModal.classList.remove('show');
                showCreateNotice('作品を作成しました！', 'success');
                selectNovel(novelId, novelData);
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
        checkAdminStatus();
    loadNovelsList();

    // 作成制限の確認
    if (!canCreateNovel()) {
        const timeLeft = getTimeUntilNextCreate();
        createNovelBtn.disabled = true;
        showCreateNotice(`次の作品は ${timeLeft} 後に作成できます`, 'info');
    }
