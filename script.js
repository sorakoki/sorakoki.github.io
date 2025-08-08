// 時計アプリのメインスクリプト
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const scrollContainer = document.getElementById('scroll-container');
    const scrollText = document.getElementById('scroll-text');
    const alarmButton = document.getElementById('alarmButton');
    const alarmTimeDisplay = document.getElementById('alarmTimeDisplay');
    const alarmSound = document.getElementById('alarmSound');
    const numpadModal = document.getElementById('numpadModal');
    const numpadDisplay = document.getElementById('numpadDisplay');
    const numpadError = document.getElementById('numpadError');
    const numpadBtns = document.querySelectorAll('.num-btn');
    const numpadOK = document.getElementById('numpadOK');
    const numpadClear = document.getElementById('numpadClear');
    const amBtn = document.getElementById('amBtn');
    const pmBtn = document.getElementById('pmBtn');
    const clearAlarmButton = document.getElementById('clearAlarmButton');

    // アプリケーション状態
    let timeInput = "";
    let ampm = null;
    let alarmTime = null;
    let alarmTriggered = false;
    let alarmInterval = null;

    // 曜日カラー設定
    const colors = { 
        '日': 'orange', 
        '月': 'yellow', 
        '火': 'red', 
        '水': 'blue', 
        '木': 'brown', 
        '金': 'gold', 
        '土': 'green' 
    };
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

    // 元号計算関数
    function getEraYear(year) {
        if (year >= 2019) return `令和${year - 2018}`;
        if (year >= 1989) return `平成${year - 1988}`;
        if (year >= 1926) return `昭和${year - 1925}`;
        return '';
    }

    // 日時更新関数
    function updateDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const weekday = weekdays[now.getDay()];
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const eraYear = getEraYear(year);

        scrollText.innerHTML = `${year}年（${eraYear}年）${month}月${date}日（${weekday}） <span class="large-time">${hours}:${minutes}:${seconds}</span>`;
        scrollContainer.style.backgroundColor = colors[weekday];
    }

    // スクロールアニメーション
    function animateScroll() {
        const containerWidth = scrollContainer.offsetWidth;
        let position = containerWidth;

        function step() {
            position -= 1;
            if (position < -scrollText.offsetWidth) {
                position = containerWidth;
            }
            scrollText.style.transform = `translateX(${position}px)`;
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ナンバーパッド開く
    function openNumpad() {
        timeInput = "";
        ampm = null;
        updateNumpadDisplay();
        numpadModal.style.display = "flex";
        clearNumpadError();
        numpadModal.focus();
        amBtn.classList.remove('selected');
        pmBtn.classList.remove('selected');
    }

    // 午前/午後選択
    amBtn.addEventListener('click', () => {
        ampm = "AM";
        amBtn.classList.add('selected');
        pmBtn.classList.remove('selected');
        updateNumpadDisplay();
        clearNumpadError();
    });

    pmBtn.addEventListener('click', () => {
        ampm = "PM";
        pmBtn.classList.add('selected');
        amBtn.classList.remove('selected');
        updateNumpadDisplay();
        clearNumpadError();
    });

    // キーボード入力対応
    numpadModal.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            numpadModal.style.display = "none";
            e.preventDefault();
            return;
        }
        if (e.key === 'c' || e.key === 'C') {
            timeInput = "";
            updateNumpadDisplay();
            clearNumpadError();
            e.preventDefault();
            return;
        }
        if (/^[0-9]$/.test(e.key)) {
            timeInput = (timeInput + e.key).slice(-4);
            updateNumpadDisplay();
            clearNumpadError();
            e.preventDefault();
            return;
        }
        if (e.key === 'Enter') {
            numpadOK.click();
            e.preventDefault();
            return;
        }
    });

    // 数字ボタンクリック
    numpadBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (btn === numpadOK || btn === numpadClear) return;
            timeInput = (timeInput + btn.textContent).slice(-4);
            updateNumpadDisplay();
            clearNumpadError();
        });
    });

    // クリアボタン
    numpadClear.addEventListener('click', () => {
        timeInput = "";
        updateNumpadDisplay();
        clearNumpadError();
    });

    // ディスプレイ更新
    function updateNumpadDisplay() {
        let padded = timeInput.padStart(4, '0');
        let hour = String(Number(padded.slice(0, 2)));
        let min = padded.slice(2, 4);
        let ampmStr = ampm === "AM" ? "午前" : ampm === "PM" ? "午後" : "午前";
        numpadDisplay.textContent = `${ampmStr} ${hour}:${min}`;
    }

    // エラー表示
    function showNumpadError(msg) {
        numpadError.textContent = msg;
        numpadDisplay.classList.add('error');
    }

    function clearNumpadError() {
        numpadError.textContent = '';
        numpadDisplay.classList.remove('error');
    }

    // OKボタン - アラーム設定
    numpadOK.addEventListener('click', () => {
        clearNumpadError();
        
        if (!ampm) {
            showNumpadError("午前・午後を選択してください");
            return;
        }
        
        let padded = timeInput.padStart(4, '0');
        let hour = parseInt(padded.slice(0, 2), 10);
        let min = parseInt(padded.slice(2, 4), 10);

        // 入力値検証
        if (isNaN(hour) || isNaN(min) || min < 0 || min > 59) {
            showNumpadError("正しい時刻を入力してください");
            return;
        }
        if (ampm === "AM" && (hour < 0 || hour > 11)) {
            showNumpadError("午前は0～11時で入力してください");
            return;
        }
        if (ampm === "PM" && (hour < 1 || hour > 12)) {
            showNumpadError("午後は1～12時で入力してください");
            return;
        }

        // 24時間形式に変換
        let hour24;
        if (ampm === "AM") {
            hour24 = hour === 0 ? 0 : hour;
        } else {
            hour24 = hour === 12 ? 12 : hour + 12;
        }

        // アラーム時刻設定
        alarmTime = new Date();
        alarmTime.setHours(hour24);
        alarmTime.setMinutes(min);
        alarmTime.setSeconds(0);
        alarmTime.setMilliseconds(0);
        alarmTriggered = false;

        // アラーム表示更新
        alarmTimeDisplay.style.display = 'block';
        alarmTimeDisplay.innerHTML = `
            <span class="alarm-time-large">
                アラーム設定時刻：${ampm === "AM" ? "午前" : "午後"} ${hour}:${min.toString().padStart(2, '0')}
            </span>
            <div id="alarmActiveMsgContainer"></div>
        `;
        
        clearAlarmButton.style.display = 'block';
        clearAlarmButton.textContent = '解除';
        clearAlarmButton.disabled = false;
        
        // 確認メッセージ
        alert(`アラームを${ampm === "AM" ? "午前" : "午後"} ${hour}:${min.toString().padStart(2, '0')}に設定しました。`);
        numpadModal.style.display = "none";
        
        console.log(`アラーム設定: ${hour24}:${min.toString().padStart(2, '0')}`);
    });

    // アラーム解除/ストップボタン
    clearAlarmButton.addEventListener('click', () => {
        if (!alarmTriggered) {
            // 解除モード
            alarmTime = null;
            alarmTimeDisplay.style.display = 'none';
            clearAlarmButton.style.display = 'none';
            console.log('アラーム解除');
        } else {
            // ストップモード
            stopAlarm();
        }
    });

    // アラーム停止関数
    function stopAlarm() {
        if (alarmSound) {
            alarmSound.pause();
            alarmSound.currentTime = 0;
        }
        if (alarmInterval) {
            clearInterval(alarmInterval);
            alarmInterval = null;
        }
        alarmTime = null;
        alarmTriggered = false;
        alarmTimeDisplay.style.display = 'none';
        clearAlarmButton.style.display = 'none';
        console.log('アラーム停止');
    }

    // モーダル外クリックで閉じる
    numpadModal.addEventListener('click', function(e) {
        if (e.target === numpadModal) {
            numpadModal.style.display = "none";
        }
    });

    // アラーム監視関数
    function checkAlarm() {
        if (alarmTime && !alarmTriggered) {
            const now = new Date();
            const nowHours = now.getHours();
            const nowMinutes = now.getMinutes();
            const nowSeconds = now.getSeconds();
            
            if (nowHours === alarmTime.getHours() && 
                nowMinutes === alarmTime.getMinutes() && 
                nowSeconds === 0) {
                
                triggerAlarm();
            }
        }
    }

    // アラーム発動関数
    function triggerAlarm() {
        console.log('アラーム発動！');
        alarmTriggered = true;
        
        // 音声再生
        if (alarmSound) {
            alarmSound.currentTime = 0;
            alarmSound.loop = true;
            alarmSound.play().catch(error => {
                console.error('音声再生エラー:', error);
            });
        }
        
        // 表示更新
        const alarmActiveMsgContainer = document.getElementById('alarmActiveMsgContainer');
        if (alarmActiveMsgContainer) {
            alarmActiveMsgContainer.innerHTML = `
                <div id="alarmActiveMsg">
                    アラーム時刻です！
                </div>
            `;
        }
        
        clearAlarmButton.textContent = 'ストップ';
        clearAlarmButton.style.display = 'block';
        clearAlarmButton.disabled = false;
        
        // 自動停止タイマー（5分後）
        setTimeout(() => {
            if (alarmTriggered) {
                stopAlarm();
            }
        }, 300000); // 5分 = 300,000ms
    }

    // Service Worker登録
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(registrationError => {
                    console.log('Service Worker registration failed:', registrationError);
                });
        });
    }

    // イベントリスナー設定
    alarmButton.addEventListener('click', openNumpad);
    
    // 定期実行開始
    setInterval(checkAlarm, 1000);
    setInterval(updateDateTime, 1000);
    
    // 初期化
    updateDateTime();
    animateScroll();
    
    console.log('時計アプリ初期化完了');
});