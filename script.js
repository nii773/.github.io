const database = firebase.database();
const linesRef = database.ref('lines');

const lineInput = document.getElementById('line-input');
const submitBtn = document.getElementById('submit-btn');
const charCount = document.getElementById('char-count');
const novelLines = document.getElementById('novel-lines');
const notice = document.getElementById('notice');

// 最後に投稿した時刻を保存するキー
const LAST_POST_KEY = 'lastPostTime';

// 文字数カウント
lineInput.addEventListener('input', () => {
    const length = lineInput.value.length;
    charCount.textContent = `${length}/100`;
});

// 小説の行を読み込む
function loadLines() {
    linesRef.orderByChild('timestamp').limitToLast(30).on('value', (snapshot) => {
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
        
        // 最新行までスクロール
        novelLines.scrollTop = novelLines.scrollHeight;
    });
}

// 投稿制限チェック（1日1回）
function canPost() {
    const lastPostTime = localStorage.getItem(LAST_POST_KEY);
    if (!lastPostTime) return true;
    
    const now = new Date();
    const lastPost = new Date(parseInt(lastPostTime));
    
    // 日付が変わっていればOK
    return now.toDateString() !== lastPost.toDateString();
}

// 残り時間を表示
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

// 投稿処理
submitBtn.addEventListener('click', () => {
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
    
    // Firebaseに保存
    linesRef.push({
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

// 初期化
loadLines();

// 投稿制限の確認
if (!canPost()) {
    const timeLeft = getTimeUntilNextPost();
    showNotice(`今日はもう投稿済みです。次は ${timeLeft} 後に投稿できます。`, 'info');
}
